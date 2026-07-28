"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "../../../../context/AppContext";
import { useToast } from "../../../../components/ToastSystem";
import Loading from "../../../../components/Loading";
import { isOwner } from "../../../../lib/access";

/**
 * Tree settings (§7) — name, tree info, and the danger zone, as cards on the
 * content canvas. Keeper-only actions are gated here and in the service layer.
 *
 * The mockup also sketches settings without a backend yet (rename, name-order,
 * per-invitation defaults, export/print, transfer). Those are omitted rather
 * than shipped as controls that don't persist; they land as the backend grows.
 */
export default function TreeSettingsPage() {
  const params = useParams<{ id: string }>();
  const treeId = params?.id ?? null;
  const { dataProvider, membership, myTrees, setCurrentTreeId } = useAppContext();
  const toast = useToast();
  const router = useRouter();

  const ownerCanManage = isOwner(membership?.role);
  const tree = [...(myTrees?.owned ?? []), ...(myTrees?.member ?? [])].find((t) => t.id === treeId);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!treeId) return <Loading />;
  if (!tree) {
    return (
      <div className="welcome-message">
        <h2>Tree not found</h2>
      </div>
    );
  }

  const handleDelete = () => {
    toast.confirm(
      `Delete "${tree.name}"? This permanently removes the tree, all people, households, and members. This cannot be undone.`,
      async () => {
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
        }
      }
    );
  };

  return (
    <div className="settings-page">
      <header>
        <h1>Tree settings</h1>
        <p className="settings-sub">
          {ownerCanManage
            ? "Only you, as keeper, can change these."
            : "Only the keeper can change these — you're seeing them read-only."}
        </p>
      </header>

      <section className="settings-card">
        <div className="settings-card-head">
          <h2>What this tree is called</h2>
          <p>Relatives see this name in their tree list and in every invitation.</p>
        </div>
        <div className="settings-name-value">{tree.name}</div>
        <p className="settings-note">
          Renaming lands with the per-tree settings backend; the name is read-only for now.
        </p>
      </section>

      <section className="settings-card">
        <h2>About this tree</h2>
        <dl className="settings-info">
          <dt>Tree ID</dt>
          <dd>
            <code>{tree.id}</code>
          </dd>
          <dt>Keeper</dt>
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
        <section className="settings-card settings-danger">
          <div className="settings-card-head">
            <h2>Careful with this</h2>
            <p>Deleting a tree cannot be undone from inside Vanshavali.</p>
          </div>
          <div className="settings-danger-row">
            <div className="settings-danger-copy">
              <span className="title">Delete {tree.name}</span>
              <span className="sub">
                Removes every person, household, member and invitation in this tree.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete tree"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
