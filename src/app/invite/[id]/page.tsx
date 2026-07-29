"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppContext } from "../../../context/AppContext";
import { useToast } from "../../../components/ToastSystem";
import Loading from "../../../components/Loading";
import { TREE_ROLES } from "../../../constants";
import type { InviteDetail } from "../../../types/tree";

/**
 * Invitation — step 1 (Spec 04). The whole invitation is legible from the token
 * before any sign-in (a1): who asked, the tree, the record already waiting, and
 * the role in verbs with its limits. Two ways in route through /signin with the
 * invite carried in ?next (a2). A signed-in visitor on the wrong account can't
 * accept (a7); an expired/revoked/used token shows an explained card, never a
 * 404 (a8). Accepting claims the offered record so they land on their branch.
 */
export default function InvitePage() {
  const params = useParams<{ id: string }>();
  const inviteId = params?.id ?? null;
  const { user, dataProvider, authProvider } = useAppContext();
  const router = useRouter();
  const toast = useToast();

  const [detail, setDetail] = useState<InviteDetail | null>(null);
  const [accepting, setAccepting] = useState(false);
  const next = inviteId ? `/invite/${inviteId}` : "/";

  useEffect(() => {
    if (!inviteId) return;
    let live = true;
    void dataProvider.getInviteDetail(inviteId).then((d) => {
      if (live) setDetail(d);
    });
    return () => {
      live = false;
    };
  }, [inviteId, dataProvider]);

  if (!inviteId || detail === null) return <Loading />;

  const invalid = detail.status !== "valid" && detail.status !== "accepted";
  const inviter = detail.inviterName ?? "the keeper";

  // Expired / revoked / used / gone — the explained card, never a 404 (a8).
  if (invalid || detail.status === "accepted") {
    return (
      <div className="invite-screen">
        <div className="invite-card">
          <div className="invite-banner" aria-hidden="true" />
          <div className="invite-body">
            <span className="eyebrow">An invitation</span>
            <h1>This invitation is no longer valid</h1>
            <p className="invite-lead">
              <a href={`mailto:?subject=${encodeURIComponent("A new link, please")}`}>
                Ask {inviter} for a new link
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const emailMatches =
    !!user?.email && !!detail.email && user.email.toLowerCase() === detail.email.toLowerCase();
  const wrongAccount = !!user && !emailMatches;
  const canWrite = detail.role === TREE_ROLES.EDITOR;

  const accept = async () => {
    if (!user) return;
    setAccepting(true);
    try {
      const membership = await dataProvider.acceptInvite(inviteId, user.uid);
      toast.success("You're in the family record");
      router.replace(`/tree/${membership.treeId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't accept the invitation");
      setAccepting(false);
    }
  };

  const signInAsSomeoneElse = async () => {
    await authProvider.signOut();
    router.push(`/signin?next=${encodeURIComponent(next)}`);
  };

  return (
    <div className="invite-screen">
      <div className="invite-card">
        <div className="invite-banner" aria-hidden="true" />
        <div className="invite-body">
          <span className="eyebrow">An invitation</span>
          <h1>{inviter} has asked you into the family record</h1>

          {detail.tree && (
            <div className="invite-tree">
              <span className="invite-tree-name">{detail.tree.name}</span>
              <span className="invite-tree-meta">
                {detail.tree.personCount} {detail.tree.personCount === 1 ? "relative" : "relatives"}
                {detail.tree.place ? ` · kept from ${detail.tree.place}` : ""}
              </span>
            </div>
          )}

          {detail.offered && (
            <div className="invite-record">
              <span className="invite-record-eyebrow">You are already in it</span>
              <span className="invite-record-name">{detail.offered.name}</span>
              {(detail.offered.birthYear || detail.offered.birthPlace) && (
                <span className="invite-record-sub">
                  {["b." + (detail.offered.birthYear ?? ""), detail.offered.birthPlace]
                    .filter((s) => s && s !== "b.")
                    .join(", ")}
                </span>
              )}
              <span className="invite-record-tie">
                Your account will be tied to this record, so you land on your own branch instead of
                an empty canvas.
              </span>
            </div>
          )}

          <div className="invite-perms">
            <span className="invite-record-eyebrow">What you may do</span>
            <div className="invite-perm">
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              <span>
                <strong>Read everything</strong> — every relative, date, place and photograph
              </span>
            </div>
            <div className={`invite-perm${canWrite ? "" : " muted"}`}>
              <span className={canWrite ? "tick" : "cross"} aria-hidden="true">
                {canWrite ? "✓" : "✕"}
              </span>
              <span>
                <strong>Add and correct</strong> — people, households, dates and photographs
                anywhere in the tree
              </span>
            </div>
            <div className="invite-perm muted">
              <span className="cross" aria-hidden="true">
                ✕
              </span>
              <span>
                Not invite others or change the tree&apos;s settings — that stays with {inviter}
              </span>
            </div>
          </div>

          {wrongAccount && (
            <p className="invite-wrong-note">
              This invitation was sent to {detail.email}. You are signed in as {user?.email}.
            </p>
          )}

          <div className="invite-actions">
            {wrongAccount ? (
              <button type="button" className="btn btn-block" onClick={signInAsSomeoneElse}>
                Sign in as someone else
              </button>
            ) : user && emailMatches ? (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={accept}
                disabled={accepting}
              >
                {accepting ? "Joining…" : `Join ${detail.tree?.name ?? "the record"}`}
              </button>
            ) : (
              <>
                <Link
                  href={`/signin?intent=create&next=${encodeURIComponent(next)}`}
                  className="btn btn-primary btn-block"
                >
                  Create my account and join
                </Link>
                <Link href={`/signin?next=${encodeURIComponent(next)}`} className="btn btn-block">
                  I already have an account
                </Link>
              </>
            )}
          </div>

          <p className="invite-note">
            This link works only for {detail.email ?? "the address it was sent to"} and only once.
            The tree is never public and never indexed.
          </p>
        </div>
      </div>
    </div>
  );
}
