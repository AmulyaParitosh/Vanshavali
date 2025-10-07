'use client';
import React, { useState, useEffect } from 'react';
import { database, auth } from '../lib/firebase';
import { ref, onValue, set, get } from 'firebase/database';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import AdminDashboard from '../components/AdminDashboard';
import LoginScreen from '../components/LoginScreen';
import PendingApprovalScreen from '../components/PendingApprovalScreen';
import AccessDeniedScreen from '../components/AccessDeniedScreen';
import '../styles/globals.css';

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      if (currentUser) {
        await handleUserLogin(currentUser);
      } else {
        setUser(null);
        setUserRole(null);
        setTreeData(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const allowedRoles = ['viewer', 'editor', 'admin'];
    if (userRole) {
      if (allowedRoles.includes(userRole)) {
        const dbRef = ref(database, '/');
        const unsubscribe = onValue(
          dbRef,
          (snapshot) => {
            const data = snapshot.val();
            setTreeData(data || {});
            setIsLoading(false);
          },
          (error) => {
            console.error('Firebase read failed: ' + error.message);
            setIsLoading(false);
          }
        );
        return () => unsubscribe();
      } else {
        setIsLoading(false);
      }
    }
  }, [userRole]);

  const handleUserLogin = async (firebaseUser) => {
    const userRef = ref(database, `users/${firebaseUser.uid}`);
    const snapshot = await get(userRef);

    let userData;
    if (snapshot.exists()) {
      userData = snapshot.val();
    } else {
      userData = {
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        role: 'pending',
      };
      await set(userRef, userData);
    }

    setUser(firebaseUser);
    setUserRole(userData.role);
  };

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.error('Authentication error: ', error);
    });
  };

  const handleLogout = () => {
    signOut(auth).catch((error) => {
      console.error('Sign out error', error);
    });
  };
  
  const handleSaveData = (newData) => {
    if (userRole !== 'editor' && userRole !== 'admin') {
      console.error('Permission Denied: You do not have rights to save data.');
      return;
    }
    const dbRef = ref(database, '/');
    set(dbRef, newData).catch((error) => {
      console.error('Firebase write failed: ' + error.message);
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (!user) {
      return <LoginScreen onLoginRequest={handleLogin} />;
    }

    if (userRole === 'pending') {
      return <PendingApprovalScreen onLogout={handleLogout} />;
    }

    if (userRole === 'denied') {
      return <AccessDeniedScreen onLogout={handleLogout} />;
    }
    
    const allowedRoles = ['viewer', 'editor', 'admin'];
    if (allowedRoles.includes(userRole) && !treeData) {
      return <div>Loading family data...</div>;
    }

    return children;
  };
  
  const isAdmin = userRole === 'admin';
  const showNav = user && !['pending', 'denied'].includes(userRole);

  return (
    <html lang="en">
      <body>
        <div className={`App`}>
          <header className="App-header">
            <div className="header-left">
              {showNav && (
                <>
                  <a href="/" className={`btn`}>Tree</a>
                  <a href="/people" className={`btn`}>People</a>
                  <a href="/family" className={`btn`}>Family</a>
                  {isAdmin && (
                    <a href="/admin" className={`btn`}>Admin Dashboard</a>
                  )}
                </>
              )}
            </div>
            <h1>Vanshavali</h1>
            <div className="header-right">
              {user && (
                <div className="user-menu">
                  <button
                    className="btn user-menu-button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  >
                    {user.displayName}
                  </button>
                  {isUserMenuOpen && (
                    <div className="user-menu-dropdown">
                      <button onClick={handleLogout} className="btn btn-secondary">
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>
          <main>{renderContent()}</main>
        </div>
      </body>
    </html>
  );
}