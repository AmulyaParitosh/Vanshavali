"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../../context/AppContext";
import type { TreeData } from "../../../../context/AppContext";
import Loading from "../../../../components/Loading";
import PersonSearch from "../../../../components/PersonSearch";
import { useToast } from "../../../../components/ToastSystem";
import { canEdit as canEditRole } from "../../../../lib/access";
import { inferHusbandWife } from "../../../../lib/family";
import { generationMap, roman, bornInLine } from "../../../../lib/generations";
import { portraitTint, personInitials } from "../../../../utils/portrait";
import ConsequenceDialog from "../../../../components/tree/ConsequenceDialog";
import type { Family, Marriage } from "../../../../types/family";
import type { Person } from "../../../../types/person";

/** The marriage facts read back as a prose sentence (Spec 08 a5). */
function marriageProse(m: Marriage | undefined): string {
  const date = m?.date?.trim();
  const place = m?.place?.trim();
  if (date && place) return `Married ${date} in ${place}.`;
  if (date) return `Married ${date}.`;
  if (place) return `Married in ${place}.`;
  return "No marriage date recorded.";
}

/**
 * Households (§4) — every marriage in the record as a row (two portraits
 * overlapped as one glyph, partners, children, generation), with the editor
 * opening in the inspector on the right. A household is two people with the
 * lineage side marked, not "Husband / Wife"; children are a reorderable list.
 *
 * Marriage date/place from the mockup aren't stored on the Family model yet;
 * they land with a small additive migration in a follow-up.
 */
export default function HouseholdsPage() {
  const { treeData, membership, onSave } = useAppContext();
  const canEdit = canEditRole(membership?.role);
  const toast = useToast();

  const [data, setData] = useState<TreeData | null>(treeData);
  const [selected, setSelected] = useState<Family | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setData(treeData);
  }, [treeData]);

  const people = useMemo(() => data?.people ?? [], [data]);
  const families = useMemo(() => data?.families ?? [], [data]);
  const gens = useMemo(() => generationMap(people, families), [people, families]);
  const born = useMemo(() => bornInLine(people, families), [people, families]);
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const nameOf = (id: string | undefined) =>
    (id && personById.get(id)?.name.official_name) || undefined;

  // Marriage-year value for sorting; undated households sort last (Spec 08 g).
  const marriageValue = (f: Family): number => {
    const y = f.marriage?.date?.match(/\d{4}/)?.[0];
    return y ? Number(y) : Number.POSITIVE_INFINITY;
  };
  const genOf = (f: Family): number =>
    [f.husband, f.wife].map((id) => (id ? gens.get(id) : undefined)).find(Boolean) ?? 99;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? families.filter((f) => {
          const names = [f.husband, f.wife]
            .map((id) => (id ? personById.get(id) : undefined))
            .filter(Boolean)
            .flatMap((p) => [p!.name.official_name, ...(p!.name.aliases ?? [])]);
          return names.join(" ").toLowerCase().includes(q);
        })
      : families;
    // Generation, then marriage date — never arbitrary insertion order.
    return [...list].sort((a, b) => genOf(a) - genOf(b) || marriageValue(a) - marriageValue(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [families, query, personById, gens]);

  if (!data) return <Loading />;

  const handleSave = async (family: Family) => {
    if (!canEdit) return;
    const previous = data;
    let saved = family;
    let updated: Family[];
    if (family.id) {
      updated = data.families.map((f) => (f.id === family.id ? family : f));
    } else {
      saved = { ...family, id: `family_${Date.now()}` };
      updated = [...data.families, saved];
    }
    const next = { ...data, families: updated };
    setData(next);
    setSelected(saved);
    try {
      await onSave(next);
      toast.success("Household saved");
    } catch (error: unknown) {
      setData(previous);
      if (!family.id) setSelected(null);
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  };

  const handleDelete = async (familyId: string) => {
    if (!canEdit) return;
    const previous = data;
    const next = { ...data, families: data.families.filter((f) => f.id !== familyId) };
    setData(next);
    setSelected(null);
    try {
      await onSave(next);
      toast.success("Household deleted");
    } catch (error: unknown) {
      setData(previous);
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  };

  return (
    <div className={`households-page${selected ? " inspector-open" : ""}`}>
      <div className="households-main">
        <div className="households-head">
          <div>
            <h1>Households</h1>
            <div className="records-subtitle">
              {families.length} marriage{families.length === 1 ? "" : "s"} recorded
            </div>
          </div>
          <div className="records-header-spacer" />
          {canEdit && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSelected({ id: "", husband: "", wife: "", children: [] })}
            >
              + Record a marriage
            </button>
          )}
        </div>

        <label className="records-search">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
            style={{ color: "var(--text-meta)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Either partner's name"
            aria-label="Search households"
          />
        </label>

        <div className="records-table">
          <div className="records-thead">
            <span style={{ width: 74, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>Partners</span>
            <span className="hh-col-married">Married</span>
            <span className="hh-col-children">Children</span>
            <span className="hh-col-gen">Gen</span>
          </div>
          {rows.length === 0 ? (
            <div className="records-empty">
              {families.length === 0
                ? "No marriages recorded yet"
                : `No household matches “${query}”.`}
            </div>
          ) : (
            rows.map((f) => {
              const { husbandId, wifeId } = inferHusbandWife(f);
              const partners = [husbandId, wifeId].filter(Boolean) as string[];
              const childNames = f.children.map((id) => nameOf(id)).filter(Boolean);
              const gen = partners.map((id) => gens.get(id)).find(Boolean);
              return (
                <button
                  key={f.id}
                  type="button"
                  className="records-row"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    border: "none",
                    borderBottom: "1px solid var(--line-row)",
                    background: "transparent",
                    font: "inherit",
                  }}
                  onClick={() => setSelected(f)}
                >
                  <span className="couple-glyph">
                    {partners.map((id) => (
                      <span
                        key={id}
                        className="records-avatar"
                        style={{
                          background: portraitTint(id),
                          border: `2.5px solid ${born.has(id) ? "var(--ring-born)" : "var(--ring-married)"}`,
                        }}
                      >
                        {personInitials(personById.get(id)?.name.official_name ?? "?")}
                      </span>
                    ))}
                  </span>
                  <span className="records-name" style={{ pointerEvents: "none" }}>
                    <span className="records-name-primary">
                      {partners.map((id) => nameOf(id)).join(" & ") || "Unnamed household"}
                    </span>
                  </span>
                  <span className={`hh-col-married${f.marriage?.date ? "" : " absent"}`}>
                    {f.marriage?.date
                      ? [f.marriage.date, f.marriage.place].filter(Boolean).join(", ")
                      : "no marriage date"}
                  </span>
                  <span className={`hh-col-children${childNames.length ? "" : " absent"}`}>
                    {childNames.length
                      ? `${childNames.length} · ${childNames.slice(0, 2).join(", ")}${childNames.length > 2 ? "…" : ""}`
                      : "no children listed"}
                  </span>
                  <span className="hh-col-gen">{roman(gen)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selected && (
        <HouseholdEditor
          key={selected.id || "new"}
          family={selected}
          people={people}
          born={born}
          gens={gens}
          canEdit={canEdit}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

interface HouseholdEditorProps {
  family: Family;
  people: Person[];
  born: Set<string>;
  gens: Map<string, number>;
  canEdit: boolean;
  onSave: (f: Family) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function HouseholdEditor({
  family,
  people,
  born,
  gens,
  canEdit,
  onSave,
  onDelete,
  onClose,
}: HouseholdEditorProps) {
  const toast = useToast();
  const [form, setForm] = useState<Family>(family);
  const [addingChild, setAddingChild] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { husbandId, wifeId } = inferHusbandWife(form);
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const gen = [husbandId, wifeId].map((id) => (id ? gens.get(id) : undefined)).find(Boolean);

  // Footer appears only when something differs from what's stored (Spec 08 / 13).
  const norm = (f: Family) =>
    JSON.stringify({
      husband: f.husband || "",
      wife: f.wife || "",
      children: f.children,
      date: f.marriage?.date?.trim() || "",
      place: f.marriage?.place?.trim() || "",
    });
  const dirty = norm(form) !== norm(family);

  const setPartner = (which: "husband" | "wife", id: string) =>
    setForm((f) => ({ ...f, [which]: id }));
  const setMarriage = (patch: Partial<Marriage>) =>
    setForm((f) => ({ ...f, marriage: { ...f.marriage, ...patch } }));

  // Clean empty marriage fields before persisting (empty = absent).
  const save = () => {
    const date = form.marriage?.date?.trim();
    const place = form.marriage?.place?.trim();
    const marriage: Marriage | undefined =
      date || place ? { ...(date ? { date } : {}), ...(place ? { place } : {}) } : undefined;
    const cleaned: Family = {
      id: form.id,
      children: form.children,
      ...(form.husband ? { husband: form.husband } : {}),
      ...(form.wife ? { wife: form.wife } : {}),
      ...(marriage ? { marriage } : {}),
    };
    onSave(cleaned);
  };
  const addChild = (id: string) => {
    if (form.children.includes(id)) {
      toast.error("Already a child in this household.");
      return;
    }
    setForm((f) => ({ ...f, children: [...f.children, id] }));
    setAddingChild(false);
  };
  const removeChild = (id: string) =>
    setForm((f) => ({ ...f, children: f.children.filter((c) => c !== id) }));
  const moveChild = (index: number, dir: -1 | 1) =>
    setForm((f) => {
      const next = [...f.children];
      const j = index + dir;
      if (j < 0 || j >= next.length) return f;
      [next[index], next[j]] = [next[j]!, next[index]!];
      return { ...f, children: next };
    });

  const partnerCol = (which: "husband" | "wife", id: string | undefined) => {
    const person = id ? personById.get(id) : undefined;
    const lineage = id ? born.has(id) : which === "husband";
    return (
      <div className="hh-partner">
        <span
          className={`hh-portrait${person ? "" : " empty"}`}
          style={
            person
              ? {
                  background: portraitTint(id!),
                  border: `3px solid ${lineage ? "var(--ring-born)" : "var(--ring-married)"}`,
                }
              : undefined
          }
        >
          {person ? (
            person.image_url ? (
              <img src={person.image_url} alt={person.name.official_name} />
            ) : (
              personInitials(person.name.official_name)
            )
          ) : (
            "+"
          )}
        </span>
        {person && <span className="hh-partner-name">{person.name.official_name}</span>}
        {person && (
          <span className={`hh-tag ${lineage ? "lineage" : "married"}`}>
            {lineage ? "lineage" : "married in"}
          </span>
        )}
        {canEdit && (
          <PersonSearch
            people={people}
            selectedPersonId={id ?? ""}
            onSelect={(pid) => setPartner(which, pid)}
            placeholder={person ? "Change…" : "Add a partner…"}
            filterSex={which === "husband" ? "M" : "F"}
          />
        )}
      </div>
    );
  };

  return (
    <aside className="inspector" aria-label="Household editor">
      <div className="inspector-bar" aria-hidden="true" />
      <div className="inspector-body">
        <div className="inspector-head">
          <span className="eyebrow">Household{gen ? ` · Generation ${roman(gen)}` : ""}</span>
          <button type="button" className="inspector-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="hh-partners">
          {partnerCol("husband", husbandId)}
          <span className="hh-amp" aria-hidden="true">
            ❀
          </span>
          {partnerCol("wife", wifeId)}
        </div>

        <div className="inspector-section">
          <div className="inspector-section-head">
            <span className="eyebrow">Marriage</span>
            <span className="inspector-rule" />
          </div>
          {/* The facts read back as a prose sentence (a5). */}
          <p className="hh-marriage-prose">{marriageProse(form.marriage)}</p>
          {canEdit && (
            <div className="hh-marriage-fields">
              <input
                className="input"
                value={form.marriage?.date ?? ""}
                onChange={(e) => setMarriage({ date: e.target.value })}
                placeholder="Year — e.g. 1983"
                aria-label="Marriage date"
              />
              <input
                className="input"
                value={form.marriage?.place ?? ""}
                onChange={(e) => setMarriage({ place: e.target.value })}
                placeholder="Place"
                aria-label="Marriage place"
              />
            </div>
          )}
        </div>

        <div className="inspector-section">
          <div className="inspector-section-head">
            <span className="eyebrow">Children · eldest first</span>
            <span className="inspector-rule" />
          </div>
          <div className="hh-children">
            {form.children.map((childId, i) => {
              const child = personById.get(childId);
              return (
                <div
                  key={childId}
                  className="hh-child"
                  tabIndex={canEdit ? 0 : undefined}
                  onKeyDown={(e) => {
                    // Accessible reorder (a3): Alt+Arrow moves this child in birth order.
                    if (!canEdit || !e.altKey) return;
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      moveChild(i, -1);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      moveChild(i, 1);
                    }
                  }}
                >
                  {canEdit && (
                    <div className="hh-reorder">
                      <button
                        type="button"
                        onClick={() => moveChild(i, -1)}
                        disabled={i === 0}
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChild(i, 1)}
                        disabled={i === form.children.length - 1}
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                  <span className="hh-child-avatar" style={{ background: portraitTint(childId) }}>
                    {personInitials(child?.name.official_name ?? "?")}
                  </span>
                  <span className="hh-child-name">{child?.name.official_name ?? "Unknown"}</span>
                  {canEdit && (
                    <button
                      type="button"
                      className="hh-child-remove"
                      onClick={() => removeChild(childId)}
                      aria-label="Remove child"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            {canEdit &&
              (addingChild ? (
                <PersonSearch
                  people={people}
                  selectedPersonId=""
                  onSelect={addChild}
                  placeholder="Search to add a child…"
                  excludeIds={[husbandId ?? "", wifeId ?? "", ...form.children]}
                  autoFocus
                />
              ) : (
                <button type="button" className="hh-add" onClick={() => setAddingChild(true)}>
                  + Add a child — search or create
                </button>
              ))}
          </div>
        </div>

        {/* Delete is quiet-red text (a6), always reachable on an existing household —
            it routes through the consequence dialog, independent of the save footer. */}
        {canEdit && form.id && (
          <button type="button" className="hh-delete" onClick={() => setDeleteOpen(true)}>
            Delete household
          </button>
        )}
      </div>

      {/* The save footer appears only when dirty (Spec 08 / 13); readers never see it (a9). */}
      {canEdit && dirty && (
        <div className="inspector-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      )}

      {deleteOpen && (
        <ConsequenceDialog
          eyebrow="Household only"
          heading="Delete this household?"
          consequences={[
            "Both partners stay in the record — every name, date, event and photograph is kept.",
            form.children.length > 0
              ? `The ${form.children.length} child${form.children.length === 1 ? "" : "ren"} keep their own records; only this couple as their parents' marriage is removed.`
              : "Only their connection as a couple is removed.",
          ]}
          actionLabel="Delete household"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => {
            if (form.id) onDelete(form.id);
            setDeleteOpen(false);
          }}
        />
      )}
    </aside>
  );
}
