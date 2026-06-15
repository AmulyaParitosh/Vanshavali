"use client";

import React, { useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useAuthAndData } from "../hooks/useAuthAndData";

import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import Loading from "../components/Loading";
import { canViewTree } from "../lib/access";

interface AppProviderProps {
  children: React.ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
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
    if (!user) return <LoginScreen onLoginRequest={handleLogin} />;
    // User exists, profile + my-trees loaded; auto-provision effect should have
    // selected a tree by now. If we still don't have one, fall back to spinner —
    // the tree picker (Phase 9) will render here when there are multiple trees.
    if (!currentTreeId || !membership) return <Loading text="Setting up your tree..." />;
    if (canViewTree(membership.role) && !treeData) {
      return <Loading text="Loading family data..." />;
    }
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
