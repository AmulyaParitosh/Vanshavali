"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import Loading from "../components/Loading";

/**
 * Root route. The tree picker lives at `/trees` (Spec 03), which owns the
 * count-based routing (one tree → straight in, several → picker, none → create).
 * `/` just forwards there once the user is known; signed-out visitors get the
 * sign-in card from AppProvider's gate.
 */
export default function RootPage() {
  const { user } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/trees");
  }, [user, router]);

  return <Loading />;
}
