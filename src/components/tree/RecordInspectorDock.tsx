"use client";

import React, { useMemo, useState } from "react";
import type { Person } from "../../types/person";
import type { Family } from "../../types/family";
import type { TreeMembership, TreeRole } from "../../types/tree";
import type { AuthUser } from "../../services/types";
import { useAppContext } from "../../context/AppContext";
import { showSaveToast } from "../ToastSystem";
import { personChanges } from "../../lib/personChanges";
import { isOwner, canEdit as canEditRole } from "../../lib/access";
import TreeInspector from "./TreeInspector";

/**
 * The one wiring for the shared record inspector (Spec 07 a1): the write path
 * (per-record patch + save toast/undo), the keeper role change (undoable), and
 * remove-access — used identically wherever the panel opens (the tree canvas and
 * the Members list). Only the placement differs: `inline` sits in the canvas
 * flex row; `drawer` is a fixed right dock so the panel opens in place on a page
 * that has no inspector column of its own, without changing the route (a2).
 */

interface RecordInspectorDockProps {
  selectedPerson: Person;
  people: Person[];
  families: Family[];
  /** Every membership in the tree, for the access block's role chip. */
  members: TreeMembership[];
  /** The viewer's own membership, for keeper/edit gating. */
  membership: TreeMembership | null;
  user: AuthUser | null;
  treeId: string | null;
  /** Tree name for the save toast. */
  treeName: string;
  onClose: () => void;
  /** Open another person in the same panel (prose-link clicks). */
  onSelect: (personId: string) => void;
  variant?: "inline" | "drawer";
}

const RecordInspectorDock: React.FC<RecordInspectorDockProps> = ({
  selectedPerson,
  people,
  families,
  members,
  membership,
  user,
  treeId,
  treeName,
  onClose,
  onSelect,
  variant = "inline",
}) => {
  const { dataProvider } = useAppContext();
  const [savingRecord, setSavingRecord] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  const membershipByPerson = useMemo(() => {
    const map = new Map<string, TreeMembership>();
    for (const m of members) if (m.personId) map.set(m.personId, m);
    return map;
  }, [members]);

  const inspector = (
    <TreeInspector
      person={selectedPerson}
      people={people}
      families={families}
      isSelf={!!user && selectedPerson.userId === user.uid}
      viewerPersonId={people.find((p) => !!user && p.userId === user.uid)?.id ?? null}
      personMembership={membershipByPerson.get(selectedPerson.id) ?? null}
      viewerIsKeeper={isOwner(membership?.role)}
      canEdit={canEditRole(membership?.role)}
      treeId={treeId}
      onClose={onClose}
      onSelect={onSelect}
      saving={savingRecord}
      savingRole={savingRole}
      onChangeRole={async (uid, role: TreeRole) => {
        if (!treeId) return;
        const name = selectedPerson.name.official_name;
        const prev = members.find((m) => m.uid === uid)?.role;
        const verb =
          role === "owner"
            ? "now keeps this tree"
            : role === "editor"
              ? "may now add and correct anyone"
              : "may now read the tree";
        setSavingRole(true);
        try {
          await dataProvider.updateMemberRole(treeId, uid, role);
          showSaveToast({
            primary: `${name} ${verb}`,
            ...(prev
              ? { onUndo: async () => dataProvider.updateMemberRole(treeId, uid, prev) }
              : {}),
          });
        } finally {
          setSavingRole(false);
        }
      }}
      onRemoveAccess={async (uid, name) => {
        if (!treeId) return;
        await dataProvider.removeMember(treeId, uid);
        showSaveToast({ primary: `${name} no longer has access`, warn: true });
      }}
      savePerson={async (personToSave, baseVersion) => {
        if (!treeId) throw new Error("No tree selected.");
        // The record as loaded now, for the change summary + the 12s Undo.
        const prev = people.find((p) => p.id === personToSave.id) ?? null;
        setSavingRecord(true);
        try {
          const result = await dataProvider.patchPerson(
            treeId,
            personToSave.id,
            personToSave,
            baseVersion
          );
          if (result.ok) {
            const labels = prev ? personChanges(prev, result.person).map((c) => c.label) : [];
            const summary =
              labels.length === 0
                ? "your changes"
                : labels.length === 1
                  ? labels[0]!
                  : `${labels[0]} and ${labels.length - 1} more`;
            showSaveToast({
              primary: `Saved to ${treeName}`,
              consequence: `${summary} · everyone sees it now`,
              ...(prev
                ? {
                    onUndo: async () => {
                      // Best-effort restore at the version we just wrote; if the
                      // record moved on again, the undo simply no-ops.
                      await dataProvider.patchPerson(
                        treeId,
                        prev.id,
                        prev,
                        result.person.version ?? 0
                      );
                    },
                  }
                : {}),
            });
          }
          return result;
        } finally {
          setSavingRecord(false);
        }
      }}
    />
  );

  return variant === "drawer" ? <div className="record-dock">{inspector}</div> : inspector;
};

export default RecordInspectorDock;
