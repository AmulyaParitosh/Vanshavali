import React, { useState, useEffect } from "react";
import { database, auth } from "../lib/firebase";
import { ref, onValue, set, get } from "firebase/database";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import FamilyTree from "../components/FamilyTree";
import EditPeople from "../components/EditPeople";
import EditFamily from "../components/EditFamily";
import AdminDashboard from "../components/AdminDashboard";
import LoginScreen from "../components/LoginScreen";
import PendingApprovalScreen from "../components/PendingApprovalScreen";
import AccessDeniedScreen from "../components/AccessDeniedScreen";
import "../styles/globals.css";

const App = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [activeTab, setActiveTab] = useState("tree");
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
    // This effect runs ONLY when userRole changes, preventing race conditions.
    const allowedRoles = ["viewer", "editor", "admin"];
    if (userRole) {
      if (allowedRoles.includes(userRole)) {
        const dbRef = ref(database, "/");
        const unsubscribe = onValue(
          dbRef,
          (snapshot) => {
            const data = snapshot.val();
            setTreeData(data || {});
            setIsLoading(false); // Stop loading after data is fetched
          },
          (error) => {
            console.error("Firebase read failed: " + error.message);
            setIsLoading(false); // Stop loading on error
          }
        );
        return () => unsubscribe();
      } else {
        // Handle roles like 'pending' or 'denied'
        setIsLoading(false); // Stop loading, as there's no data to fetch
      }
    }
  }, [userRole]); // Depend only on userRole

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
        role: "pending",
      };
      await set(userRef, userData);
    }

    setUser(firebaseUser);
    setUserRole(userData.role); // This will trigger the userRole useEffect
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
    if (userRole !== "editor" && userRole !== "admin") {
      console.error("Permission Denied: You do not have rights to save data.");
      return;
    }
    const dbRef = ref(database, "/");
    set(dbRef, newData).catch((error) => {
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

    if (userRole === "pending") {
      return <PendingApprovalScreen onLogout={handleLogout} />;
    }

    if (userRole === "denied") {
      return <AccessDeniedScreen onLogout={handleLogout} />;
    }

    const allowedRoles = ["viewer", "editor", "admin"];
    if (allowedRoles.includes(userRole) && !treeData) {
      return <div>Loading family data...</div>;
    }
    
    const isAdmin = userRole === "admin";
    const canEdit = userRole === "editor" || isAdmin;

    switch (activeTab) {
      case "admin_dashboard":
        return isAdmin ? (
          <AdminDashboard />
        ) : (
          <FamilyTree
            people={treeData.people || []}
            families={treeData.families || []}
          />
        );
      case "people":
        return (
          <EditPeople
            treeData={treeData}
            onSave={handleSaveData}
            canEdit={canEdit}
          />
        );
      case "family":
        return (
          <EditFamily
            treeData={treeData}
            onSave={handleSaveData}
            canEdit={canEdit}
          />
        );
      case "tree":
      default:
        return (
          <FamilyTree
            people={treeData.people || []}
            families={treeData.families || []}
          />
        );
    }
  };

  const isAdmin = userRole === "admin";
  const showNav = user && !['pending', 'denied'].includes(userRole);

  return (
    <div className={`App`}>
      <header className="App-header">
        <div className="header-left">
          {showNav && (
            <>
              <button
                className={`btn ${activeTab === "tree" ? "active" : ""}`}
                onClick={() => setActiveTab("tree")}
              >
                Tree
              </button>
              <button
                className={`btn ${activeTab === "people" ? "active" : ""}`}
                onClick={() => setActiveTab("people")}
              >
                People
              </button>
              <button
                className={`btn ${activeTab === "family" ? "active" : ""}`}
                onClick={() => setActiveTab("family")}
              >
                Family
              </button>
              {isAdmin && (
                <button
                  className={`btn ${
                    activeTab === "admin_dashboard" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("admin_dashboard")}
                >
                  Admin Dashboard
                </button>
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
  );
};

export default App;