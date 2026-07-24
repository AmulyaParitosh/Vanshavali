"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "../../../../context/AppContext";
import { useToast } from "../../../../components/ToastSystem";
import Loading from "../../../../components/Loading";
import { isOwner } from "../../../../lib/access";

/**
 * Per-tree settings — rename, delete. Owner-only; other roles get a read-only
 * view with the current tree name.
 *
 * Transfer-ownership is a Phase 10+ concern (need a confirmation flow that
 * involves the receiving member).
 */
export default function TreeSettingsPage() {
  const params = useParams<{ id: string }>();
  const treeId = params?.id ?? null;
  const { dataProvider, membership, myTrees, setCurrentTreeId } = useAppContext();
  const toast = useToast();
  const router = useRouter();

  const ownerCanManage = isOwner(membership?.role);
  const tree = [...(myTrees?.owned ?? []), ...(myTrees?.member ?? [])].find((t) => t.id === treeId);

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (tree) setName(tree.name);
  }, [tree]);

  if (!treeId) return <Loading />;
  if (!tree) {
    return (
      <div className="welcome-message">
        <h2>Tree not found</h2>
      </div>
    );
  }

  // Rename uses `updateTreeMeta` — not on the interface yet. For Phase 9 the
  // rename surface is read-only-ish: tracked in BACKLOG. Show the form but
  // disable the save until the provider gains the method.
  const renameSupported = false;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameSupported) {
      toast.error("Rename is not implemented yet — backlog.");
      return;
    }
    setIsSaving(true);
    try {
      // Placeholder for future updateTreeMeta call.
      toast.success("Saved");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    toast.confirm(
      `Delete "${tree.name}"? This permanently removes the tree, all people, families, and members. This cannot be undone.`,
      async () => {
        setIsDeleting(true);
        try {
          await dataProvider.deleteTree(treeId);
          toast.success("Tree deleted");
          setCurrentTreeId(null);
          router.push("/");
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Delete failed";
          toast.error(message);
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>Tree settings</h1>
      </header>

      <section className="section-card">
        <h2>Name</h2>
        <form onSubmit={handleSaveName} className="rename-form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!ownerCanManage || !renameSupported}
            aria-label="Tree name"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!ownerCanManage || !renameSupported || isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </form>
        {!renameSupported && (
          <p className="settings-note">
            Rename will land alongside the per-tree settings backend work.
          </p>
        )}
      </section>

      <section className="section-card">
        <h2>Tree info</h2>
        <dl className="info-list">
          <dt>Tree ID</dt>
          <dd>
            <code>{tree.id}</code>
          </dd>
          <dt>Owner</dt>
          <dd>
            <code>{tree.ownerUid}</code>
          </dd>
          <dt>Visibility</dt>
          <dd>{tree.visibility}</dd>
          <dt>Created</dt>
          <dd>{new Date(tree.createdAt).toLocaleString()}</dd>
        </dl>
      </section>

      {ownerCanManage && (
        <section className="section-card danger-zone">
          <h2>Danger zone</h2>
          <p>
            Deleting the tree removes all of its people, families, members, and invitations. Cannot
            be undone.
          </p>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete this tree"}
          </button>
        </section>
      )}

      <style jsx>{`
        .settings-page {
          padding: var(--space-10);
          max-width: 900px;
          margin: 0 auto;
          height: 100%;
          overflow-y: auto;
          box-sizing: border-box;
        }
        .settings-header h1 {
          font-family: var(--font-heading);
          font-size: var(--font-size-2xl);
          margin: 0 0 var(--space-6);
          color: var(--color-text);
        }
        .rename-form {
          display: flex;
          gap: var(--space-3);
          align-items: center;
        }
        .rename-form input {
          flex: 1;
        }
        .settings-note {
          color: var(--color-neutral-600);
          font-size: var(--font-size-sm);
          margin: var(--space-3) 0 0;
        }
        .info-list {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: var(--space-2) var(--space-4);
          margin: 0;
        }
        .info-list dt {
          font-weight: 600;
          color: var(--color-neutral-600);
        }
        .info-list dd {
          margin: 0;
          color: var(--color-text);
          word-break: break-all;
        }
        .info-list code {
          font-family: monospace;
          background: var(--color-neutral-50);
          padding: 2px var(--space-2);
          border-radius: var(--radius-xs);
          font-size: var(--font-size-sm);
        }
        .danger-zone {
          border-color: var(--color-danger);
        }
        .danger-zone h2 {
          color: var(--color-danger);
        }
      `}</style>
    </div>
  );
}
