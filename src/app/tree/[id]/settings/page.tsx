"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "../../../../context/AppContext";
import { useToast } from "../../../../components/ToastSystem";
import Loading from "../../../../components/Loading";
import ConsequenceDialog from "../../../../components/tree/ConsequenceDialog";
import SegmentedControl from "../../../../components/SegmentedControl";
import { isOwner, canEdit } from "../../../../lib/access";
import type {
  TreeMeta,
  TreeSettingsPatch,
  NameOrder,
  TreeMembership,
} from "../../../../types/tree";
import type { Person } from "../../../../types/person";

/**
 * Tree settings (Spec 11) — one 720px left-aligned column of cards: what the
 * tree is called, how names are shown, what sharing grants, an About panel, and
 * the danger zone. Keeper writes, everyone reads: non-keepers see the *same*
 * cards with the same values as plain text and no controls (a1). Every write is
 * one patch per card, keeper-only, server-enforced (a2).
 */
export default function TreeSettingsPage() {
  const params = useParams<{ id: string }>();
  const treeId = params?.id ?? null;
  const { dataProvider, membership, myTrees, treeData, setCurrentTreeId, user } = useAppContext();
  const toast = useToast();
  const router = useRouter();

  const keeper = isOwner(membership?.role);
  const writer = canEdit(membership?.role); // Export/print is a writer + keeper right.
  const tree = [...(myTrees?.owned ?? []), ...(myTrees?.member ?? [])].find((t) => t.id === treeId);

  // Export everything (Spec 11 c16/c17): the whole record as JSON, client-side —
  // "as it stands today. Nothing is held back."
  const exportRecord = () => {
    if (!tree || !treeData) return;
    const payload = JSON.stringify(
      {
        tree: { id: tree.id, name: tree.name, place: tree.place ?? null },
        people: treeData.people,
        families: treeData.families,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tree.name.replace(/[^\w]+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handingOver, setHandingOver] = useState(false);
  const [members, setMembers] = useState<TreeMembership[]>([]);

  // The keeper's hand-over picker needs the member list (Spec 11 a9).
  useEffect(() => {
    if (!treeId || !keeper) return;
    return dataProvider.subscribeToMembers(treeId, setMembers);
  }, [treeId, keeper, dataProvider]);

  // Real counts for the About panel + delete warning (a7): people, households, photographs.
  const people = treeData?.people ?? [];
  const counts = {
    people: people.length,
    households: (treeData?.families ?? []).length,
    photos: people.filter((p) => !!p.image_url).length,
  };

  if (!treeId) return <Loading />;
  if (!tree) {
    return (
      <div className="welcome-message">
        <h2>Tree not found</h2>
      </div>
    );
  }

  // One write, one toast (Spec 11 f2). A failed save surfaces the reason and
  // leaves the card's draft in place so the keeper can retry.
  const save = async (patch: TreeSettingsPatch, saved: string) => {
    try {
      await dataProvider.updateTree(treeId, patch);
      toast.success(saved);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await dataProvider.deleteTree(treeId);
      toast.success("Tree deleted");
      setCurrentTreeId(null);
      router.push("/");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  // Hand-over candidates (a9 / edge e4): every member but the keeper themselves.
  const candidates = members.filter((m) => m.uid !== user?.uid);
  const memberName = (m: TreeMembership): string => {
    const p = m.personId ? people.find((pp: Person) => pp.id === m.personId) : undefined;
    return p?.name.official_name ?? "A member";
  };

  const handleHandOver = async (targetUid: string) => {
    setHandingOver(true);
    try {
      await dataProvider.handOverKeeper(treeId, targetUid);
      toast.success("You've handed over the tree. You're now a writer.");
      setHandoverOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Hand-over failed");
    } finally {
      setHandingOver(false);
    }
  };

  return (
    <div className="settings-page">
      <header>
        <h1>Tree settings</h1>
        {/* One sub-line, shown to every role (Spec 11 copy deck). */}
        <p className="settings-sub">
          Only the keeper can change these. Everyone else sees them read-only.
        </p>
      </header>

      <NameCard tree={tree} editable={keeper} onSave={save} />
      <NamesShownCard tree={tree} editable={keeper} onSave={save} />
      <SharingCard tree={tree} editable={keeper} onSave={save} />

      {/* Export and print (Spec 11 c15-c19). Export is a writer/keeper right; a
          reader is told to ask a keeper. Print is the browser print target —
          the Madhubani-framed folio is a later refinement. */}
      <section className="settings-card">
        <div className="settings-card-head">
          <h2>Export and print</h2>
          <p>Everything in this record, as it stands today. Nothing is held back.</p>
        </div>
        {writer ? (
          <div className="settings-export-actions">
            <button type="button" className="btn" onClick={exportRecord}>
              Export everything
            </button>
            <button type="button" className="btn" onClick={() => window.print()}>
              Print the tree
            </button>
          </div>
        ) : (
          <p className="settings-reader-note">Ask a keeper to export this record</p>
        )}
      </section>

      {keeper && (
        <section className="settings-card settings-danger">
          <div className="settings-card-head">
            <h2>Danger zone</h2>
            <p>Deleting a tree cannot be undone from inside Vanshavali.</p>
          </div>
          {/* Hand-over is emphasised above Delete (a9): a keeper steps down by
              handing the tree on, never by leaving it keeper-less. */}
          <div className="settings-danger-row">
            <div className="settings-danger-copy">
              <span className="title">Hand over the tree</span>
              <span className="sub">They become keeper; you keep writing access.</span>
            </div>
            <button
              type="button"
              className="settings-danger-action"
              onClick={() => setHandoverOpen(true)}
            >
              Make someone else the keeper
            </button>
          </div>
          <div className="settings-danger-row">
            <div className="settings-danger-copy">
              <span className="title">Delete this record</span>
              <span className="sub">
                {counts.people} {counts.people === 1 ? "person" : "people"}, {counts.households}{" "}
                {counts.households === 1 ? "household" : "households"} and {counts.photos}{" "}
                {counts.photos === 1 ? "photograph" : "photographs"} leave with it.
              </span>
            </div>
            {/* Quiet-red text, never a filled red button (a8). */}
            <button
              type="button"
              className="settings-danger-action"
              onClick={() => setDeleteOpen(true)}
            >
              Delete this record
            </button>
          </div>
        </section>
      )}

      {deleteOpen && (
        <ConsequenceDialog
          eyebrow="Cannot be undone"
          danger
          heading={`Delete ${tree.name}?`}
          consequences={[
            `${counts.people} ${counts.people === 1 ? "person" : "people"}, ${counts.households} ${counts.households === 1 ? "household" : "households"} and ${counts.photos} ${counts.photos === 1 ? "photograph" : "photographs"} leave with it.`,
            "Members are notified. Records people own on their own account stay with them.",
          ]}
          confirmName={tree.name}
          confirmPrompt={`Type ${tree.name} to confirm`}
          actionLabel={isDeleting ? "Deleting…" : "Delete this record"}
          busy={isDeleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}

      {handoverOpen && (
        <HandOverDialog
          candidates={candidates}
          nameOf={memberName}
          busy={handingOver}
          onConfirm={handleHandOver}
          onCancel={() => setHandoverOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hand-over picker (a9): choose a member to become keeper. The confirm is the
// dialog's quiet-red action (never a filled red button); only members with
// accounts are listed (edge e4 — every tree_member has one).
// ---------------------------------------------------------------------------

function HandOverDialog({
  candidates,
  nameOf,
  busy,
  onConfirm,
  onCancel,
}: {
  candidates: TreeMembership[];
  nameOf: (m: TreeMembership) => string;
  busy: boolean;
  onConfirm: (targetUid: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(candidates[0]?.uid ?? null);
  // The member list can arrive after the dialog opens (its own subscription);
  // preselect the first candidate once it does so the action is reachable.
  useEffect(() => {
    if (selected === null && candidates[0]) setSelected(candidates[0].uid);
  }, [candidates, selected]);
  return (
    <div className="dialog-scrim" onClick={busy ? undefined : onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Make someone else the keeper"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="dialog-eyebrow">Hand over</span>
        <h2 className="dialog-heading">Make someone else the keeper</h2>
        <p className="consequence-line">
          They become keeper; you keep writing access. Only they can hand it back.
        </p>
        {candidates.length === 0 ? (
          <p className="consequence-line">No one to hand it to yet — invite a relative first.</p>
        ) : (
          <div className="settings-radiogroup" role="radiogroup" aria-label="Choose a new keeper">
            {candidates.map((m) => (
              <button
                key={m.uid}
                type="button"
                role="radio"
                aria-checked={selected === m.uid}
                className={selected === m.uid ? "radio-row selected" : "radio-row"}
                onClick={() => setSelected(m.uid)}
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="settings-order-sample">
                  <span className="settings-order-line1">{nameOf(m)}</span>
                  <span className="settings-order-line2">
                    {m.role === "editor" ? "Currently a writer" : "Currently a reader"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={busy || !selected}
            onClick={() => selected && onConfirm(selected)}
          >
            {busy ? "Working…" : "Make them the keeper"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-card Save (a2): outlined until dirty, then filled; disabled when nothing
// in this card changed. One patch per card.
// ---------------------------------------------------------------------------

function CardSave({
  dirty,
  busy,
  onClick,
}: {
  dirty: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div className="settings-card-foot">
      <button
        type="button"
        className={dirty ? "btn btn-primary btn-sm settings-save" : "btn btn-sm settings-save"}
        disabled={!dirty || busy}
        onClick={onClick}
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

type SaveFn = (patch: TreeSettingsPatch, saved: string) => Promise<void>;

// ---- Card 1: What this tree is called (name + ancestral place) -------------

function NameCard({
  tree,
  editable,
  onSave,
}: {
  tree: TreeMeta;
  editable: boolean;
  onSave: SaveFn;
}) {
  const [name, setName] = useState(tree.name);
  const [place, setPlace] = useState(tree.place ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(tree.name);
    setPlace(tree.place ?? "");
  }, [tree.name, tree.place]);

  const dirty = name.trim() !== tree.name || place.trim() !== (tree.place ?? "");
  const canSave = dirty && !!name.trim();

  const submit = async () => {
    setBusy(true);
    try {
      await onSave({ name: name.trim(), place: place.trim() }, "Name saved");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <h2>What this tree is called</h2>
        <p>Relatives see this name in their tree list and in every invitation.</p>
      </div>
      {editable ? (
        <>
          <input
            className="input"
            aria-label="Tree name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            aria-label="Ancestral place"
            placeholder="Ancestral place — Rajnagar, Madhubani, Bihar"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
          <CardSave dirty={canSave} busy={busy} onClick={submit} />
        </>
      ) : (
        <>
          <div className="settings-readonly-value">{tree.name}</div>
          <div className="settings-readonly-sub">
            {tree.place ? tree.place : "No ancestral place recorded."}
          </div>
        </>
      )}
    </section>
  );
}

// ---- Card 2: How names are shown (name-display order) ----------------------

const NAME_ORDER_OPTIONS: { id: NameOrder; title: string; s1: string; s2: string }[] = [
  { id: "devanagari", title: "Devanagari first", s1: "देवेन्द्र मिश्र", s2: "Devendra Mishra" },
  { id: "latin", title: "Latin first", s1: "Devendra Mishra", s2: "देवेन्द्र मिश्र" },
  {
    id: "latin-only",
    title: "Latin only",
    s1: "Devendra Mishra",
    s2: "Devanagari stored, not shown",
  },
];

function NamesShownCard({
  tree,
  editable,
  onSave,
}: {
  tree: TreeMeta;
  editable: boolean;
  onSave: SaveFn;
}) {
  const [order, setOrder] = useState<NameOrder>(tree.nameOrder);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOrder(tree.nameOrder), [tree.nameOrder]);

  const dirty = order !== tree.nameOrder;
  const submit = async () => {
    setBusy(true);
    try {
      await onSave({ nameOrder: order }, "Name order saved");
    } finally {
      setBusy(false);
    }
  };
  const current = NAME_ORDER_OPTIONS.find((o) => o.id === tree.nameOrder) ?? NAME_ORDER_OPTIONS[0]!;

  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <h2>How names are shown</h2>
        <p>Applies to everyone reading this tree. Both spellings are always stored.</p>
      </div>
      {editable ? (
        <>
          <div className="settings-radiogroup" role="radiogroup" aria-label="How names are shown">
            {NAME_ORDER_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={order === o.id}
                className={order === o.id ? "radio-row selected" : "radio-row"}
                onClick={() => setOrder(o.id)}
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="settings-order-sample">
                  <span className="settings-order-title">{o.title}</span>
                  <span className="settings-order-line1">{o.s1}</span>
                  <span className="settings-order-line2">{o.s2}</span>
                </span>
              </button>
            ))}
          </div>
          <CardSave dirty={dirty} busy={busy} onClick={submit} />
        </>
      ) : (
        <div className="settings-readonly-value">{current.title}</div>
      )}
    </section>
  );
}

// ---- Card 3: Sharing (default role + own-children + reader dates) ----------

function ToggleRow({
  label,
  why,
  checked,
  onChange,
  editable,
}: {
  label: string;
  why: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  editable: boolean;
}) {
  return (
    <div className="settings-share-row">
      <div className="settings-share-copy">
        <span className="settings-share-label">{label}</span>
        <span className="settings-share-why">{why}</span>
      </div>
      {editable ? (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          className={checked ? "toggle on" : "toggle"}
          onClick={() => onChange(!checked)}
        />
      ) : (
        <span className="settings-readonly-flag">{checked ? "Yes" : "No"}</span>
      )}
    </div>
  );
}

function SharingCard({
  tree,
  editable,
  onSave,
}: {
  tree: TreeMeta;
  editable: boolean;
  onSave: SaveFn;
}) {
  const [role, setRole] = useState(tree.defaultInviteRole);
  const [ownChildren, setOwnChildren] = useState(tree.allowOwnChildren);
  const [readerDates, setReaderDates] = useState(tree.readersSeeDates);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setRole(tree.defaultInviteRole);
    setOwnChildren(tree.allowOwnChildren);
    setReaderDates(tree.readersSeeDates);
  }, [tree.defaultInviteRole, tree.allowOwnChildren, tree.readersSeeDates]);

  const dirty =
    role !== tree.defaultInviteRole ||
    ownChildren !== tree.allowOwnChildren ||
    readerDates !== tree.readersSeeDates;

  const submit = async () => {
    setBusy(true);
    try {
      await onSave(
        { defaultInviteRole: role, allowOwnChildren: ownChildren, readersSeeDates: readerDates },
        "Sharing saved"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <h2>Sharing</h2>
        <p>This tree is never public and never indexed. These control what an invitation grants.</p>
      </div>

      <div className="settings-share-row">
        <div className="settings-share-copy">
          <span className="settings-share-label">Default role for new invitations</span>
          <span className="settings-share-why">
            You can change it per person when you invite them.
          </span>
        </div>
        {editable ? (
          <SegmentedControl
            ariaLabel="Default role for new invitations"
            options={[
              { value: "viewer", label: "May read" },
              { value: "editor", label: "May write" },
            ]}
            value={role}
            onChange={setRole}
          />
        ) : (
          <span className="settings-readonly-flag">
            {role === "editor" ? "May write" : "May read"}
          </span>
        )}
      </div>

      <ToggleRow
        label="Let relatives add their own children"
        why="Readers may add descendants of their own household, and nothing else."
        checked={ownChildren}
        onChange={setOwnChildren}
        editable={editable}
      />
      <ToggleRow
        label="Show living relatives' exact dates to readers"
        why="Off = year only."
        checked={readerDates}
        onChange={setReaderDates}
        editable={editable}
      />

      {editable && <CardSave dirty={dirty} busy={busy} onClick={submit} />}
    </section>
  );
}
