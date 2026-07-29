"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import Loading from "../../../components/Loading";
import RecordEditor from "../../../components/tree/RecordEditor";
import { showSaveToast } from "../../../components/ToastSystem";

/**
 * Account · Your record (Spec 12, `/user/record`) — the ONE place a user edits the
 * person record that follows them into every tree. It reuses the same RecordEditor
 * as the inspector (a2); saving propagates the own facts to every linked tree at
 * once (a5) via updateOwnRecord — no per-tree editing. The sidebar names where the
 * record appears and reminds the reader that only they can change it (a4).
 */
export default function UserRecordPage() {
  const { user, treeData, dataProvider, myTrees } = useAppContext();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const record = useMemo(
    () => treeData?.people.find((p) => !!user && p.userId === user.uid) ?? null,
    [treeData, user]
  );
  const trees = useMemo(() => [...(myTrees?.owned ?? []), ...(myTrees?.member ?? [])], [myTrees]);

  if (!user) return <Loading />;

  if (!record) {
    return (
      <div className="urec-page">
        <header className="urec-head">
          <span className="eyebrow">Your record</span>
          <h1>Your record</h1>
        </header>
        <p className="urec-empty">
          You aren&apos;t linked to a person in any tree yet. Open a tree and link yourself to your
          own record there first.
        </p>
      </div>
    );
  }

  return (
    <div className="urec-page">
      <header className="urec-head">
        <span className="eyebrow">Your record</span>
        <h1>Your record</h1>
        <p className="urec-lead">
          One record, shared by every tree you&apos;re in. Edited here, it changes everywhere at
          once.
        </p>
      </header>

      <div className="urec-layout">
        <div className="urec-main">
          <RecordEditor
            person={record}
            saving={saving}
            onCancel={() => router.push("/user")}
            onSave={async (draft) => {
              setSaving(true);
              try {
                const { trees: n } = await dataProvider.updateOwnRecord({
                  ...draft,
                  id: record.id,
                });
                showSaveToast({
                  primary: "Saved to your record",
                  consequence: `Updated in ${n} tree${n === 1 ? "" : "s"} · everyone sees it now`,
                });
                router.push("/user");
              } finally {
                setSaving(false);
              }
            }}
          />
        </div>

        <aside className="urec-side">
          <div className="urec-side-block">
            <span className="eyebrow">Where this appears</span>
            <ul className="urec-side-trees">
              {trees.map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
            </ul>
          </div>
          <p className="urec-side-note">
            Only you can change this. Keepers can read every field but cannot rewrite your name or
            dates.
          </p>
        </aside>
      </div>
    </div>
  );
}
