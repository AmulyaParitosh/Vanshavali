"use client";

import React, { useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useAuthAndData } from "../hooks/useAuthAndData";

import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import PendingApprovalScreen from "../components/PendingApprovalScreen";
import AccessDeniedScreen from "../components/AccessDeniedScreen";
import Loading from "../components/Loading";
import { USER_ROLES } from "../constants";
import { canViewTree } from "../lib/access";

interface AppProviderProps {
  children: React.ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
  const {
    user,
    userRole,
    personId,
    treeData,
    isLoading,
    handleLogin,
    handleLogout,
    onSave,
    refreshUser,
    data: dataProvider,
    auth: authProvider,
    storage: storageProvider,
  } = useAuthAndData();

  const renderContent = () => {
    if (isLoading) return <Loading />;
    if (!user) return <LoginScreen onLoginRequest={handleLogin} />;
    if (userRole === USER_ROLES.PENDING) return <PendingApprovalScreen onLogout={handleLogout} />;
    if (userRole === USER_ROLES.DENIED) return <AccessDeniedScreen onLogout={handleLogout} />;

    if (canViewTree(userRole) && !treeData) {
      return <Loading text="Loading family data..." />;
    }

    return children;
  };

  // Memoize context value so consumers don't cascade-rerender on every
  // AppProvider render. Audit perf finding: prior version rebuilt this object
  // every render, invalidating every memoized consumer.
  const contextValue = useMemo(
    () => ({
      treeData,
      user: user ? { ...user, role: userRole } : null,
      personId,
      onSave,
      refreshUser,
      handleLogout,
      dataProvider,
      authProvider,
      storageProvider,
    }),
    [
      treeData,
      user,
      userRole,
      personId,
      onSave,
      refreshUser,
      handleLogout,
      dataProvider,
      authProvider,
      storageProvider,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <div className="App">
        <Header user={user} userRole={userRole} onLogout={handleLogout} />
        <main>{renderContent()}</main>
      </div>
    </AppContext.Provider>
  );
}
