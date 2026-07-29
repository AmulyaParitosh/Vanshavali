"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "../../../../context/AppContext";
import { useToast } from "../../../../components/ToastSystem";
import Loading from "../../../../components/Loading";
import ConsequenceDialog from "../../../../components/tree/ConsequenceDialog";
import { isOwner } from "../../../../lib/access";
import type { TreeMeta, TreeSettingsPatch, NameOrder } from "../../../../types/tree";

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
  const { dataProvider, membership, myTrees, treeData, setCurrentTreeId } = useAppContext();
  const toast = useToast();
  const router = useRouter();

  const keeper = isOwner(membership?.role);
  const tree = [...(myTrees?.owned ?? []), ...(myTrees?.member ?? [])].find((t) => t.id === treeId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

      <section className="settings-card">
        <h2>About this tree</h2>
        <dl className="settings-info">
          <dt>Started</dt>
          <dd>{new Date(tree.createdAt).toLocaleDateString()}</dd>
          <dt>Keeper</dt>
          <dd>
            <code>{tree.ownerUid}</code>
          </dd>
          <dt>Contains</dt>
          <dd>
            {counts.people} {counts.people === 1 ? "person" : "people"} · {counts.households}{" "}
            {counts.households === 1 ? "household" : "households"}
          </dd>
          <dt>Visibility</dt>
          <dd>
            {tree.visibility === "private"
              ? "Private — invitation only, never indexed"
              : tree.visibility}
          </dd>
          <dt>Tree id</dt>
          <dd>
            <code>{tree.id}</code>
          </dd>
        </dl>
      </section>

      {keeper && (
        <section className="settings-card settings-danger">
          <div className="settings-card-head">
            <h2>Danger zone</h2>
            <p>Deleting a tree cannot be undone from inside Vanshavali.</p>
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
          <div
            className="segmented"
            role="radiogroup"
            aria-label="Default role for new invitations"
          >
            <button
              type="button"
              role="radio"
              aria-checked={role === "viewer"}
              className={role === "viewer" ? "segmented-option selected" : "segmented-option"}
              onClick={() => setRole("viewer")}
            >
              May read
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === "editor"}
              className={role === "editor" ? "segmented-option selected" : "segmented-option"}
              onClick={() => setRole("editor")}
            >
              May write
            </button>
          </div>
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
