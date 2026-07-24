"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AppContext } from "../context/AppContext";
import { useAuthAndData } from "../hooks/useAuthAndData";

import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import Loading from "../components/Loading";

interface AppProviderProps {
  children: React.ReactNode;
}

/**
 * Routes that don't require an active tree to be selected. `/invite/[id]` is
 * the canonical example — an invited user lands on it before they're a member
 * of any tree, so we must let it render past the auth gate.
 */
const TREE_OPTIONAL_PREFIXES = ["/invite/", "/about", "/user/profile", "/user/suggestions"];

function isTreeOptional(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return TREE_OPTIONAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
    handleLogin,
    handleLogout,
    onSave,
    refreshProfile,
    data: dataProvider,
    auth: authProvider,
    storage: storageProvider,
  } = useAuthAndData();

  const renderContent = () => {
    if (isLoading) return <Loading />;
    if (!user) return <LoginScreen authProvider={authProvider} onLoginRequest={handleLogin} />;
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
      handleLogout,
      dataProvider,
      authProvider,
      storageProvider,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <div className="App">
        <Header user={user} membership={membership} onLogout={handleLogout} />
        <main>{renderContent()}</main>
      </div>
    </AppContext.Provider>
  );
}
