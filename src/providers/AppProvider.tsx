"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AppContext } from "../context/AppContext";
import { useAuthAndData } from "../hooks/useAuthAndData";

import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import Loading from "../components/Loading";
import CommandSearch from "../components/CommandSearch";
import PersonPickerProvider from "./PersonPickerProvider";

interface AppProviderProps {
  children: React.ReactNode;
}

/**
 * Routes that don't require an active tree to be selected. `/invite/[id]` is
 * the canonical example — an invited user lands on it before they're a member
 * of any tree, so we must let it render past the auth gate. `/auth/*` covers
 * the password-recovery landing (the reset link signs the user in, but they
 * may own no tree yet).
 */
const TREE_OPTIONAL_PREFIXES = ["/invite/", "/about", "/user/", "/auth/", "/trees"];

function isTreeOptional(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return TREE_OPTIONAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Fully public routes (Spec 02) — they render for anyone, signed in or out, and
 * must NOT fall through to the inline sign-in gate. `/signin` and `/reset` own
 * their own card + redirect-if-authenticated; `/privacy` is static.
 */
const PUBLIC_PREFIXES = ["/signin", "/reset", "/privacy", "/invite/"];

function isPublic(pathname: string | null): boolean {
  if (!pathname) return false;
  // The landing (Spec 01) is public at `/` — it renders for anyone; RootPage
  // redirects a signed-in visitor to their tree before painting marketing.
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export default function AppProvider({ children }: AppProviderProps) {
  const pathname = usePathname();
  const {
    user,
    profile,
    myTrees,
    currentTreeId,
    setCurrentTreeId,
    membership,
    treeData,
    isLoading,
    handleLogout,
    onSave,
    refreshProfile,
    refreshNonce,
    data: dataProvider,
    auth: authProvider,
    storage: storageProvider,
  } = useAuthAndData();

  const renderContent = () => {
    if (isLoading) return <Loading />;
    // Public pages render for anyone (they own their auth handling), before the gate.
    if (isPublic(pathname)) return children;
    if (!user) return <LoginScreen authProvider={authProvider} />;
    // Tree-optional routes (landing, invite accept, profile, etc.) render
    // without requiring a current tree or membership. Tree-scoped routes have
    // their own gating in `src/app/tree/[id]/layout.tsx`.
    if (isTreeOptional(pathname)) return children;
    if (!currentTreeId || !membership) return <Loading text="Setting up your tree..." />;
    return children;
  };

  // Memoize so consumers don't cascade-rerender every render.
  const contextValue = useMemo(
    () => ({
      user,
      profile,
      myTrees,
      currentTreeId,
      setCurrentTreeId,
      membership,
      treeData,
      onSave,
      refreshProfile,
      refreshNonce,
      handleLogout,
      dataProvider,
      authProvider,
      storageProvider,
    }),
    [
      user,
      profile,
      myTrees,
      currentTreeId,
      setCurrentTreeId,
      membership,
      treeData,
      onSave,
      refreshProfile,
      refreshNonce,
      handleLogout,
      dataProvider,
      authProvider,
      storageProvider,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <div className="App">
        {/* Chrome bar is present on every authenticated route, absent on Landing
         * and Sign in (Spec 00 §02). */}
        {user && <Header user={user} membership={membership} />}
        {/* The picker provider wraps the pages so any of them can open the shared
         * person picker; the ⌘K navigate singleton sits alongside it. */}
        <PersonPickerProvider>
          <main>{renderContent()}</main>
        </PersonPickerProvider>
        {user && <CommandSearch />}
      </div>
    </AppContext.Provider>
  );
}
