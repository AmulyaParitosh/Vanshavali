"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import { useToast } from "../../../components/ToastSystem";
import Loading from "../../../components/Loading";
import { getSupabaseClient, isSupabaseConfigured } from "../../../lib/supabase";

type AcceptState = "idle" | "accepting" | "done" | "error";

/**
 * Landing for an email-invite link.
 *
 * Flow:
 *   - Not signed in: prompt to log in. After login the user lands back here
 *     (Supabase Auth redirects back to the previous URL).
 *   - Signed in: POST /api/invite/accept with the user's access token. On
 *     success, navigate to /tree/{treeId} so the user lands inside the tree
 *     they were invited to.
 *
 * Only the Supabase backend is wired here — local mode users can still call
 * `dataProvider.acceptInvite` directly (it works in-process).
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
        let treeId: string | null = null;

        if (isSupabaseConfigured()) {
          // Get the access token to authenticate the server route.
          const client = getSupabaseClient();
          const { data: sessionData } = await client.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) {
            throw new Error("Sign in to accept this invite.");
          }
          const res = await fetch("/api/invite/accept", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ inviteId }),
          });
          const json = (await res.json()) as { treeId?: string; role?: string; error?: string };
          if (!res.ok) {
            throw new Error(json.error || `Server returned ${res.status}`);
          }
          treeId = json.treeId ?? null;
        } else {
          // Local mode — invoke the provider in-process.
          const membership = await dataProvider.acceptInvite(inviteId, user.uid);
          treeId = membership.treeId;
        }

        setState("done");
        if (treeId) {
          toast.success("Invitation accepted");
          router.replace(`/tree/${treeId}`);
        }
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
