"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppContext } from "../../context/AppContext";
import LoginScreen from "../../components/LoginScreen";
import Loading from "../../components/Loading";

/**
 * Public sign-in route (Spec 02) — the canonical entry. Renders the sign-in card
 * with no shell (AppProvider treats /signin as tree-optional). `?intent=create`
 * preselects the Create tab; `?next` (a validated INTERNAL path only, e3) is where
 * a successful auth lands — so an invitation survives account creation (a8).
 * A visitor who already has a session is redirected straight out (perm p2 / s5).
 */

/** Accept only root-relative paths — never an absolute or protocol-relative URL (e3). */
function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, authProvider } = useAppContext();

  const next = safeInternalPath(params.get("next"));
  const intent = params.get("intent") === "create" ? "create" : "signin";

  // Reaching /signin with a session is always a mistake — send them where they
  // were going (?next), else to the picker, which lands on the single/last tree.
  useEffect(() => {
    if (user) router.replace(next ?? "/");
  }, [user, next, router]);

  if (user) return <Loading />;
  return <LoginScreen authProvider={authProvider} initialTab={intent} />;
}
