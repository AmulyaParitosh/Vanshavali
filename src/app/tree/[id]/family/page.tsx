"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../../context/AppContext";
import type { TreeData } from "../../../../context/AppContext";
import Loading from "../../../../components/Loading";
import { usePersonPicker } from "../../../../providers/PersonPickerProvider";
import { useToast } from "../../../../components/ToastSystem";
import { canEdit as canEditRole } from "../../../../lib/access";
import { inferHusbandWife } from "../../../../lib/family";
import { generationMap, roman, bornInLine } from "../../../../lib/generations";
import { portraitTint, personInitials } from "../../../../utils/portrait";
import ConsequenceDialog from "../../../../components/tree/ConsequenceDialog";
import RecordsScreen from "../../../../components/records/RecordsScreen";
import RecordsTable, { type RecordsColumn } from "../../../../components/records/RecordsTable";
import type { Family, Marriage } from "../../../../types/family";
import type { Person } from "../../../../types/person";

/** Households table columns (Spec 08). Width via className; header font is uniform. */
const HOUSEHOLD_COLUMNS: RecordsColumn[] = [
  { key: "portrait", className: "couple-glyph" },
  { key: "partners", label: "Partners", className: "records-col-name" },
  { key: "married", label: "Married", className: "hh-col-married" },
  { key: "children", label: "Children", className: "hh-col-children" },
  { key: "gen", label: "Gen", className: "hh-col-gen" },
];

/**
 * The marriage facts read back as a prose sentence (Spec 08 a5 / c10): place
 * first, then date, then the child count as its own sentence — so a wrong date
 * looks wrong the way it would in speech.
 */
function marriageProse(m: Marriage | undefined, childCount = 0): string {
  const date = m?.date?.trim();
  const place = m?.place?.trim();
  let s: string;
  if (date && place) s = `Married at ${place} on ${date}.`;
  else if (date) s = `Married on ${date}.`;
  else if (place) s = `Married at ${place}.`;
  else s = "No marriage date recorded.";
  if (childCount > 0) {
    const n =
      childCount === 1 ? "One child" : childCount === 2 ? "Two children" : `${childCount} children`;
    s += ` ${n}.`;
  }
  return s;
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
  // Search-row filters (Spec 08 g2): a generation dropdown and the "No marriage
  // date" queue as a dismissible chip.
  const [genFilter, setGenFilter] = useState<number | null>(null);
  const [undatedOnly, setUndatedOnly] = useState(false);

  useEffect(() => {
    setData(treeData);
  }, [treeData]);

  const people = useMemo(() => data?.people ?? [], [data]);
  const families = useMemo(() => data?.families ?? [], [data]);
  const gens = useMemo(() => generationMap(people, families), [people, families]);
  const born = useMemo(() => bornInLine(people, families), [people, families]);
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const genOf = (f: Family): number =>
    [f.husband, f.wife].map((id) => (id ? gens.get(id) : undefined)).find(Boolean) ?? 99;

  const undatedCount = useMemo(
    () => families.filter((f) => !f.marriage?.date?.trim()).length,
    [families]
  );
  const genOptions = useMemo(
    () => [...new Set(families.map(genOf).filter((g) => g < 99))].sort((a, b) => a - b),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [families, gens]
  );

  /**
   * Everything a row displays, worked out once per household rather than once
   * per render. Filtering and sorting below hand back these same objects, so a
   * keystroke changes which rows are on screen without changing any row's
   * identity — which is what lets the memoised row skip re-rendering.
   */
  const models = useMemo<HouseholdRowModel[]>(
    () =>
      families.map((f) => {
        const { husbandId, wifeId } = inferHusbandWife(f);
        const ids = [husbandId, wifeId].filter((id): id is string => !!id);
        const partners = ids.map((id) => ({
          id,
          initials: personInitials(personById.get(id)?.name.official_name ?? "?"),
          born: born.has(id),
        }));
        const names = ids.map((id) => personById.get(id)?.name.official_name).filter(Boolean);
        const gen = ids.map((id) => gens.get(id)).find(Boolean) ?? 99;
        const year = f.marriage?.date?.match(/\d{4}/)?.[0];
        return {
          family: f,
          partners,
          title: names.join(" & ") || "Unnamed household",
          married: f.marriage?.date
            ? [f.marriage.date, f.marriage.place].filter(Boolean).join(", ")
            : "",
          children: f.children.length
            ? `${f.children.length} ${f.children.length === 1 ? "child" : "children"}`
            : "",
          gen,
          genLabel: roman(gen === 99 ? undefined : gen),
          marriedAt: year ? Number(year) : Number.POSITIVE_INFINITY,
          undated: !f.marriage?.date?.trim(),
          search: ids
            .map((id) => personById.get(id))
            .filter(Boolean)
            .flatMap((p) => [p!.name.official_name, ...(p!.name.aliases ?? [])])
            .join(" ")
            .toLowerCase(),
        };
      }),
    [families, personById, born, gens]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q ? models.filter((m) => m.search.includes(q)) : models;
    if (genFilter !== null) list = list.filter((m) => m.gen === genFilter);
    if (undatedOnly) list = list.filter((m) => m.undated);
    // Generation, then marriage date — never arbitrary insertion order.
    return [...list].sort((a, b) => a.gen - b.gen || a.marriedAt - b.marriedAt);
  }, [models, query, genFilter, undatedOnly]);

  const openHousehold = useCallback((family: Family) => setSelected(family), []);

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
    <RecordsScreen
      title="Households"
      subtitle={
        <>
          {families.length} marriage{families.length === 1 ? "" : "s"} recorded
          {undatedCount > 0 && ` · ${undatedCount} without a date`}
        </>
      }
      action={
        canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setSelected({ id: "", husband: "", wife: "", children: [] })}
          >
            + New household
          </button>
        )
      }
      search={
        <>
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

          {/* Filters (Spec 08 g2): a generation dropdown and the "No marriage date"
              queue as a dismissible chip. */}
          {(genOptions.length > 0 || undatedCount > 0) && (
            <div className="households-filters">
              {genOptions.length > 0 && (
                <select
                  className="hh-genfilter"
                  value={genFilter ?? ""}
                  onChange={(e) => setGenFilter(e.target.value ? Number(e.target.value) : null)}
                  aria-label="Filter by generation"
                >
                  <option value="">Generation</option>
                  {genOptions.map((g) => (
                    <option key={g} value={g}>
                      Generation {roman(g)}
                    </option>
                  ))}
                </select>
              )}
              {undatedCount > 0 && (
                <button
                  type="button"
                  className={`hh-filter-chip${undatedOnly ? " active" : ""}`}
                  aria-pressed={undatedOnly}
                  onClick={() => setUndatedOnly((v) => !v)}
                >
                  No marriage date · {undatedCount}
                  {undatedOnly && <span aria-hidden="true"> ✕</span>}
                </button>
              )}
            </div>
          )}
        </>
      }
      inspectorOpen={!!selected}
    >
      <RecordsTable
        columns={HOUSEHOLD_COLUMNS}
        items={rows}
        ariaLabel="Households"
        rowKey={(m) => m.family.id}
        empty={
          <div className="records-empty">
            {families.length === 0
              ? "No marriages recorded yet"
              : `No household matches “${query}”.`}
          </div>
        }
        renderRow={(m, i) => (
          <HouseholdRow
            rowIndex={i}
            model={m}
            selected={selected?.id === m.family.id}
            onOpen={openHousehold}
          />
        )}
      />

      {selected && (
        <div className="record-dock">
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
        </div>
      )}
    </RecordsScreen>
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
  const { openPicker } = usePersonPicker();
  const [form, setForm] = useState<Family>(family);
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
          <button
            type="button"
            className="hh-partner-pick"
            onClick={() =>
              openPicker({
                title: "Choose a partner",
                placeholder: person ? "Change…" : "Add a partner…",
                filterSex: which === "husband" ? "M" : "F",
                selectedPersonId: id ?? null,
                onPick: (pid) => setPartner(which, pid),
              })
            }
          >
            {person ? "Change…" : "Add a partner…"}
          </button>
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
          <p className="hh-marriage-prose">{marriageProse(form.marriage, form.children.length)}</p>
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
            {canEdit && (
              <button
                type="button"
                className="hh-add"
                onClick={() =>
                  openPicker({
                    title: "Add a child",
                    placeholder: "Search to add a child…",
                    excludeIds: [husbandId ?? "", wifeId ?? "", ...form.children],
                    onPick: addChild,
                  })
                }
              >
                + Add a child — search or create
              </button>
            )}
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

/** Everything one household row shows, derived once and kept stable (see `models`). */
interface HouseholdRowModel {
  family: Family;
  partners: { id: string; initials: string; born: boolean }[];
  title: string;
  /** "1948, Madhubani" — empty when no date is recorded. */
  married: string;
  /** "3 children" — empty when none are listed. */
  children: string;
  gen: number;
  genLabel: string;
  marriedAt: number;
  undated: boolean;
  search: string;
}

/**
 * One row of the Households list, memoised. It takes the prepared model rather
 * than the raw Family so that everything it needs is already a string: React can
 * then decide "unchanged" from three `===` checks, and selecting a household
 * re-renders two rows instead of the whole list.
 */
const HouseholdRow = React.memo(function HouseholdRow({
  rowIndex,
  model,
  selected,
  onOpen,
}: {
  /** Position in the FULL list, not the rendered window (see RecordsTable). */
  rowIndex: number;
  model: HouseholdRowModel;
  selected: boolean;
  onOpen: (family: Family) => void;
}) {
  return (
    <div
      data-row=""
      role="row"
      tabIndex={0}
      aria-rowindex={rowIndex + 1}
      aria-current={selected}
      className={`records-row${selected ? " open" : ""}`}
      onClick={() => onOpen(model.family)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(model.family);
        }
      }}
    >
      <span role="gridcell" className="couple-glyph">
        {model.partners.map((p) => (
          <span
            key={p.id}
            className="records-avatar"
            style={{
              background: portraitTint(p.id),
              border: `2.5px solid ${p.born ? "var(--ring-born)" : "var(--ring-married)"}`,
            }}
          >
            {p.initials}
          </span>
        ))}
      </span>
      <span
        role="gridcell"
        className="records-name records-col-name"
        style={{ pointerEvents: "none" }}
      >
        <span className="records-name-primary">{model.title}</span>
      </span>
      <span role="gridcell" className={`hh-col-married${model.married ? "" : " absent"}`}>
        {model.married || "no date recorded"}
      </span>
      <span role="gridcell" className={`hh-col-children${model.children ? "" : " absent"}`}>
        {model.children || "none listed"}
      </span>
      <span role="gridcell" className="hh-col-gen">
        {model.genLabel}
      </span>
    </div>
  );
});
