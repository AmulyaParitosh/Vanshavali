"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import { useToast } from "../../../components/ToastSystem";
import Loading from "../../../components/Loading";

type AcceptState = "idle" | "accepting" | "done" | "error";

/**
 * Landing for an email-invite link.
 *
 * Flow:
 *   - Not signed in: prompt to log in. After login the user lands back here
 *     (Supabase Auth redirects back to the previous URL).
 *   - Signed in: `dataProvider.acceptInvite` (which posts to the server route
 *     with the user's token — the invitee can't write tree_members under RLS).
 *     On success, navigate to /tree/{treeId}.
 */
export default function InviteAcceptPage() {
  const params = useParams<{ id: string }>();
  const inviteId = params?.id ?? null;
  const { user, dataProvider } = useAppContext();
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<AcceptState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteId || !user || state !== "idle") return;
    setState("accepting");

    (async () => {
      try {
        const membership = await dataProvider.acceptInvite(inviteId, user.uid);
        setState("done");
        toast.success("Invitation accepted");
        router.replace(`/tree/${membership.treeId}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Accept failed";
        setError(message);
        setState("error");
      }
    })();
  }, [inviteId, user, state, dataProvider, router, toast]);

  if (!inviteId) {
    return (
      <div className="welcome-message">
        <h2>Invalid invitation link</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="welcome-message">
        <h2>Sign in to accept this invitation</h2>
        <p>
          You&apos;re about to join a family tree. Sign in or create an account, then you&apos;ll be
          brought back here automatically.
        </p>
      </div>
    );
  }

  if (state === "accepting" || state === "idle") {
    return <Loading text="Accepting invitation..." />;
  }

  if (state === "error") {
    return (
      <div className="welcome-message">
        <h2>Couldn&apos;t accept this invitation</h2>
        <p>{error}</p>
      </div>
    );
  }

  return <Loading text="Redirecting..." />;
}
