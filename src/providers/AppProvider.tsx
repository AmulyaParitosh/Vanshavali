'use client';

import React from 'react';
import { AppContext } from '../context/AppContext';
import { useAuthAndData } from '../hooks/useAuthAndData';

import Header from '../components/Header';
import LoginScreen from '../components/LoginScreen';
import PendingApprovalScreen from '../components/PendingApprovalScreen';
import AccessDeniedScreen from '../components/AccessDeniedScreen';
import Loading from '../components/Loading';

interface AppProviderProps {
  children: React.ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
  const {
    user,
    userRole,
    treeData,
    isLoading,
    handleLogin,
    handleLogout,
    onSave,
    data: dataProvider,
    auth: authProvider,
    storage: storageProvider,
  } = useAuthAndData();

  const renderContent = () => {
    if (isLoading) return <Loading />;
    if (!user) return <LoginScreen onLoginRequest={handleLogin} />;
    if (userRole === 'pending')
      return <PendingApprovalScreen onLogout={handleLogout} />;
    if (userRole === 'denied')
      return <AccessDeniedScreen onLogout={handleLogout} />;

    const allowedRoles = ['viewer', 'editor', 'admin'];
    if (allowedRoles && userRole && allowedRoles.includes(userRole) && !treeData) {
      return <Loading text="Loading family data..." />;
    }

    return children;
  };

  const contextValue = {
    treeData,
    user: user ? { ...user, role: userRole } : null,
    onSave,
    dataProvider,
    authProvider,
    storageProvider,
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
