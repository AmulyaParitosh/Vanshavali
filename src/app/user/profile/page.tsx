"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAppContext } from "../../../context/AppContext";
import { usePersonPicker } from "../../../providers/PersonPickerProvider";
import { useToast } from "../../../components/ToastSystem";
import ConsequenceDialog from "../../../components/tree/ConsequenceDialog";
import { portraitTint, personInitials } from "../../../utils/portrait";
import type { Person } from "../../../types/person";

/**
 * Your account (§8) — sign-in details, the person you're linked to in the
 * active tree, and the trees your record appears in.
 *
 * The mockup's model is one global person record across every tree; the app's
 * model links a *per-tree* Person to the auth user (the global profile is just
 * name/email/photo). So "Your record" here is the active tree's linked person,
 * edited via the tree inspector. A single global record + its own full-page
 * editor is a data-model change, deferred.
 */
export default function AccountPage() {
  const {
    user,
    profile,
    myTrees,
    currentTreeId,
    treeData,
    authProvider,
    dataProvider,
    onSave,
    refreshProfile,
  } = useAppContext();
  const toast = useToast();
  const { openPicker } = usePersonPicker();
  const [leavingTree, setLeavingTree] = useState<{ id: string; name: string } | null>(null);
  const [leaving, setLeaving] = useState(false);

  if (!user) {
    return (
      <div className="welcome-message">
        <h2>Please sign in to view your account</h2>
      </div>
    );
  }

  const name = profile?.name || user.displayName || "You";
  const email = profile?.email || user.email || "";
  const linkedPerson = treeData?.people.find((p) => p.userId === user.uid) ?? null;
  const allTrees = myTrees
    ? [
        ...myTrees.owned.map((t) => ({ tree: t, role: "owner" as const })),
        ...myTrees.member.map((t) => ({ tree: t, role: "member" as const })),
      ]
    : [];
  const currentTree = allTrees.find((t) => t.tree.id === currentTreeId)?.tree;

  const handleChangePassword = async () => {
    if (!email) return;
    try {
      await authProvider.sendPasswordReset(email);
      toast.success(`Password reset link sent to ${email}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Couldn't send reset link");
    }
  };

  const handleLinkPerson = (personId: string) => {
    if (!currentTreeId) {
      toast.error("No active tree.");
      return;
    }
    const person = treeData?.people.find((p) => p.id === personId);
    toast.confirm(
      `Link your account to ${person?.name.official_name ?? "this person"}? This is permanent.`,
      async () => {
        try {
          await dataProvider.linkUserToPerson(currentTreeId, personId, user.uid);
          toast.success("Linked");
          await refreshProfile();
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : "Link failed");
        }
      }
    );
  };

  const handleCreatePerson = async () => {
    if (!treeData) {
      toast.error("Tree data unavailable. Try again in a moment.");
      return;
    }
    let id = `p_${user.uid}`;
    let n = 1;
    while (treeData.people.some((p) => p.id === id)) id = `p_${user.uid}_${n++}`;
    const person: Person = {
      id,
      name: { official_name: name },
      sex: "M",
      events: [],
      custom_fields: {},
      userId: user.uid,
    };
    try {
      await onSave({ ...treeData, people: [...treeData.people, person] });
      toast.success("Created and linked your record");
      await refreshProfile();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Couldn't create your record");
    }
  };

  return (
    <div className="account-page">
      <header>
        <h1>Your account</h1>
        <p className="settings-sub">
          Who you are to Vanshavali, and who you are inside each family record.
        </p>
      </header>

      <section className="settings-card">
        <h2>Sign-in details</h2>
        <div className="account-signin">
          <span className="account-avatar-lg">
            {user.photoURL ? <img src={user.photoURL} alt={name} /> : name.charAt(0).toUpperCase()}
          </span>
          <div className="account-fields">
            <div className="account-field">
              <span className="label">
                Display name — how relatives see you in activity and invitations
              </span>
              <div className="value readonly">{name}</div>
            </div>
            <div className="account-field-row">
              <div className="account-field">
                <span className="label">Email</span>
                <div className="value readonly">{email}</div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleChangePassword}>
                Change password
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <h2>Your record{currentTree ? ` in ${currentTree.name}` : ""}</h2>
          <p>You link to one person in each tree. The record itself is edited in the tree.</p>
        </div>
        {linkedPerson ? (
          <div className="account-record-row">
            <span
              className="account-record-avatar"
              style={{ background: portraitTint(linkedPerson.id) }}
            >
              {linkedPerson.image_url ? (
                <img src={linkedPerson.image_url} alt={linkedPerson.name.official_name} />
              ) : (
                personInitials(linkedPerson.name.official_name)
              )}
            </span>
            <div className="account-record-body">
              <span className="account-record-name">{linkedPerson.name.official_name}</span>
              <span className="account-record-meta">
                {[
                  linkedPerson.name.aliases?.filter((a) => a.trim()).join(", "),
                  `${linkedPerson.events?.length ?? 0} life event${(linkedPerson.events?.length ?? 0) === 1 ? "" : "s"}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <Link href="/user/record" className="btn">
              Edit my record
            </Link>
          </div>
        ) : (
          <>
            <p className="settings-note">
              You&apos;re not yet linked to a person in {currentTree?.name ?? "this tree"}.
            </p>
            <div className="account-link-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  openPicker({
                    title: "Find yourself in the tree",
                    placeholder: "Find yourself in the tree…",
                    hideLinked: true,
                    onPick: handleLinkPerson,
                  })
                }
              >
                I&apos;m already in the tree — link me
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCreatePerson}>
                Create my record
              </button>
            </div>
          </>
        )}
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <h2>Trees you&apos;re in</h2>
          <p>Where your record appears.</p>
        </div>
        {allTrees.length === 0 ? (
          <p className="settings-note">You&apos;re not in any tree yet.</p>
        ) : (
          <div className="account-trees">
            {allTrees.map(({ tree, role }) => (
              <div key={tree.id} className="account-tree-row">
                <Link href={`/tree/${tree.id}`} className="account-tree-link">
                  <span className="account-tree-dot" style={{ background: portraitTint(tree.id) }}>
                    {tree.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="account-tree-body">
                    <span className="account-tree-name">{tree.name}</span>
                  </div>
                </Link>
                <span className={`chip ${role === "owner" ? "chip--keeper" : "chip--read"}`}>
                  {role === "owner" ? "Keeper" : "Member"}
                </span>
                {/* You can leave a tree you're a member of, but not one you keep (a6). */}
                {role === "member" && (
                  <button
                    type="button"
                    className="account-tree-leave"
                    onClick={() => setLeavingTree({ id: tree.id, name: tree.name })}
                  >
                    Leave
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {leavingTree && (
        <ConsequenceDialog
          eyebrow="Access only"
          heading={`Leave ${leavingTree.name}?`}
          consequences={[
            "Your record stays with you — every name, date and photograph you own comes along.",
            "You'll lose access to this tree until a keeper invites you again.",
          ]}
          actionLabel="Leave the tree"
          busy={leaving}
          onCancel={() => setLeavingTree(null)}
          onConfirm={async () => {
            setLeaving(true);
            try {
              await dataProvider.leaveTree(leavingTree.id);
              toast.success(`You've left ${leavingTree.name}`);
              setLeavingTree(null);
            } catch (error: unknown) {
              toast.error(error instanceof Error ? error.message : "Couldn't leave the tree");
            } finally {
              setLeaving(false);
            }
          }}
        />
      )}
    </div>
  );
}
