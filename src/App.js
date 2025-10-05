import React, { useState, useEffect } from 'react';
import { database, auth } from './firebase';
import { ref, onValue, set, get } from 'firebase/database';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import FamilyTree from './components/FamilyTree';
import EditScreen from './components/EditScreen';
import AdminDashboard from './components/AdminDashboard';
import LoginScreen from './components/LoginScreen';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDashboardMode, setIsDashboardMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await handleUserLogin(currentUser);
      } else {
        setUser(null);
        setUserRole(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && userRole) {
      const dbRef = ref(database, '/');
      const unsubscribe = onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        setTreeData(data || {});
        setIsLoading(false);
      }, (error) => {
        console.error("Firebase read failed: " + error.message);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, userRole]);

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
        role: 'pending'
      };
      await set(userRef, userData);
    }
    
    setUser(firebaseUser);
    setUserRole(userData.role);
  };

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.error("Authentication error: ", error);
    });
  };
  
  const handleLogout = () => {
    signOut(auth).catch((error) => {
        console.error("Sign out error", error);
    });
  };

  const handleSaveData = (newData) => {
    if (userRole !== 'editor' && userRole !== 'admin') {
        console.error("Permission Denied: You do not have rights to save data.");
        return;
    }
    const dbRef = ref(database, '/');
    set(dbRef, newData)
      .catch((error) => {
        console.error("Firebase write failed: " + error.message);
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
        return <div className="pending-approval-screen"><h2>Your request is pending approval.</h2><p>An administrator will review your request soon. Thank you for your patience.</p><button onClick={handleLogout} className="btn btn-secondary">Logout</button></div>;
    }

    if (userRole === 'denied') {
        return <div className="access-denied-screen"><h2>Access Denied</h2><p>Your access request has been denied. Please contact an administrator if you believe this is a mistake.</p><button onClick={handleLogout} className="btn btn-secondary">Logout</button></div>;
    }

    if (!treeData) {
      return <div>Loading family data...</div>;
    }
    
    const isAdmin = userRole === 'admin';
    const canEdit = userRole === 'editor' || isAdmin;

    if (isDashboardMode && isAdmin) {
      return <AdminDashboard onExit={() => setIsDashboardMode(false)} />;
    }

    if (isEditMode && canEdit) {
      return (
        <EditScreen 
          treeData={treeData} 
          onSave={handleSaveData} 
          onExit={() => setIsEditMode(false)} 
        />
      );
    }

    return <FamilyTree people={treeData.people || []} families={treeData.families || []} />;
  };

  const isAdmin = userRole === 'admin';
  const canEdit = userRole === 'editor' || isAdmin;

  return (
    <div className={`App ${isEditMode && canEdit ? 'edit-mode' : ''}`}>
        <header className="App-header">
            <div className="header-left">
              {user && (isEditMode || isDashboardMode) ? (
                <button className="btn back-button" onClick={() => {
                  setIsEditMode(false);
                  setIsDashboardMode(false);
                }}>
                  Back to Tree
                </button>
              ) : (
                <>
                  {user && canEdit && (
                    <button className="btn" onClick={() => setIsEditMode(true)}>
                      Edit
                    </button>
                  )}
                  {user && isAdmin && (
                    <button className="btn btn-secondary" onClick={() => setIsDashboardMode(true)}>
                      Admin Dashboard
                    </button>
                  )}
                </>
              )}
            </div>
            <h1>Vanshavali</h1>
            <div className="header-right">
                {user && (
                <>
                    <span className="user-name">{user.displayName}</span>
                    <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
                </>
                )}
            </div>
        </header>
        <main>
            {renderContent()}
        </main>
    </div>
  );
};

export default App;
