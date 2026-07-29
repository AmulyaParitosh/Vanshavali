"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import Loading from "../components/Loading";
import Landing from "../components/Landing";

/**
 * Root route `/` (Spec 01). Anonymous visitors get the Landing page; a signed-in
 * visitor is redirected to their trees before any marketing paints (a1 / s2) —
 * reaching `/` with a session means the product has forgotten them.
 */
export default function RootPage() {
  const { user } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/trees");
  }, [user, router]);

  if (user) return <Loading />;
  return <Landing />;
}
