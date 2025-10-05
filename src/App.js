import React, { useState, useEffect } from 'react';
import { database, auth } from './firebase';
import { ref, onValue, set, get } from 'firebase/database';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import FamilyTree from './components/FamilyTree';
import EditScreen from './components/EditScreen';
import LoginScreen from './components/LoginScreen';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
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
    if (user && userRole) { // Only fetch data if user is logged in and role is determined
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
      // User is logging in for the first time
      userData = {
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        role: 'viewer', // Default role
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

    if (!treeData) {
      return <div>Loading family data...</div>;
    }
    
    const canEdit = userRole === 'editor' || userRole === 'admin';

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

  const canEdit = userRole === 'editor' || userRole === 'admin';

  return (
    <div className={`App ${isEditMode && canEdit ? 'edit-mode' : ''}`}>
      <header className="App-header">
        <h1>Family Lineage</h1>
        {user && canEdit && (
          <button className="edit-button" onClick={() => setIsEditMode(!isEditMode)}>
            {isEditMode ? 'Back to Tree' : 'Edit'}
          </button>
        )}
      </header>
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
