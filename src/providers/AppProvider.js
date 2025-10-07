"use client";

import React from "react";
import { AppContext } from "../context/AppContext";
import { useAuthAndData } from "../hooks/useAuthAndData";

import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import PendingApprovalScreen from "../components/PendingApprovalScreen";
import AccessDeniedScreen from "../components/AccessDeniedScreen";

export default function AppProvider({ children }) {
  const {
    user,
    userRole,
    treeData,
    isLoading,
    handleLogin,
    handleLogout,
    onSave,
  } = useAuthAndData();

  const renderContent = () => {
    if (isLoading) return <div>Loading...</div>;
    if (!user) return <LoginScreen onLoginRequest={handleLogin} />;
    if (userRole === "pending")
      return <PendingApprovalScreen onLogout={handleLogout} />;
    if (userRole === "denied")
      return <AccessDeniedScreen onLogout={handleLogout} />;

    const allowedRoles = ["viewer", "editor", "admin"];
    if (allowedRoles.includes(userRole) && !treeData) {
      return <div>Loading family data...</div>;
    }

    return children;
  };

  const contextValue = {
    treeData,
    user: user ? { ...user, role: userRole } : null,
    onSave,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="App">
        <Header user={user} userRole={userRole} onLogout={handleLogout} />
        <main>{renderContent()}</main>
      </div>
    </AppContext.Provider>
  );
}
