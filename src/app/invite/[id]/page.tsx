"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import { useToast } from "../../../components/ToastSystem";

type AcceptState = "idle" | "accepting" | "error";

/**
 * Invitation landing (§8) — a heritage-bordered card that says what accepting
 * does before it happens, then joins on an explicit action (the old page
 * accepted silently on mount). When signed out, AppProvider shows the sign-in
 * screen first and returns here after auth.
 *
 * The mockup's richer invitation (who invited you, which tree, which record,
 * the role's exact permissions) and the "Is this you" record-merge step need
 * invite-detail fetching and the one-global-record model; deferred.
 */
export default function InviteAcceptPage() {
  const params = useParams<{ id: string }>();
  const inviteId = params?.id ?? null;
  const { user, dataProvider } = useAppContext();
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<AcceptState>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!inviteId) {
    return (
      <div className="invite-screen">
        <div className="invite-card">
          <div className="invite-banner" aria-hidden="true" />
          <div className="invite-body">
            <span className="eyebrow">Invitation</span>
            <h1>This invitation link is invalid</h1>
            <p className="invite-lead">Ask the person who invited you to send a fresh link.</p>
          </div>
        </div>
      </div>
    );
  }

  const accept = async () => {
    if (!user) return;
    setState("accepting");
    setError(null);
    try {
      const membership = await dataProvider.acceptInvite(inviteId, user.uid);
      toast.success("You're in the family record");
      router.replace(`/tree/${membership.treeId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't accept the invitation");
      setState("error");
    }
  };

  return (
    <div className="invite-screen">
      <div className="invite-card">
        <div className="invite-banner" aria-hidden="true" />
        <div className="invite-body">
          <span className="eyebrow">An invitation</span>
          <h1>You&apos;ve been asked into a family record</h1>
          <p className="invite-lead">
            Accept to join the tree with your own account, so you land on the record rather than an
            empty canvas.
          </p>

          <div className="invite-perms">
            <div className="invite-perm">
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              <span>
                <strong>Read everything</strong> — every relative, date, place and photograph
              </span>
            </div>
            <div className="invite-perm">
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              <span>
                <strong>Add and correct</strong> people, households and dates, to the extent your
                role allows
              </span>
            </div>
            <div className="invite-perm muted">
              <span className="cross" aria-hidden="true">
                ✕
              </span>
              <span>Inviting others and tree settings stay with the keeper</span>
            </div>
          </div>

          {error && <p className="invite-error">{error}</p>}

          <div className="invite-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={accept}
              disabled={state === "accepting"}
            >
              {state === "accepting" ? "Joining…" : "Accept & join the tree"}
            </button>
          </div>

          <p className="invite-note">
            This link works only for the address it was sent to, and only once. The tree is never
            public and never indexed.
          </p>
        </div>
      </div>
    </div>
  );
}
