'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { database } from "../../lib/firebase";
import { ref, onValue, update } from "firebase/database";
import { useAppContext } from '../../context/AppContext';

interface AdminUser {
  uid: string;
  role: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

import { useToast } from "../../components/ToastSystem";

export default function AccessRequestsPage() {
  const { user } = useAppContext();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    const usersRef = ref(database, "users/");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val() || {};
      const usersList = Object.keys(usersData).map((uid) => ({
        uid,
        ...usersData[uid],
      })) as AdminUser[];
      setUsers(usersList);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = (uid: string, newRole: string) => {
    const userRef = ref(database, `users/${uid}`);
    update(userRef, { role: newRole })
        .then(() => {
            if (newRole === "denied") {
                toast.success("Request denied");
            } else {
                toast.success(`Request approved as ${newRole}`);
            }
        })
        .catch((error) => {
            toast.error("Failed to update role");
            console.error(error);
        });
  };

  const pendingUsers = users.filter((u) => u.role === "pending");

  if (!user || user.role !== 'admin') {
      // Return null or loading spinner instead of unstyled div
      return null; 
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
            <h2>Access Requests</h2>
        </div>
        
        {pendingUsers.length === 0 ? (
          <p>No pending access requests.</p>
        ) : (
          <div className="access-requests-list">
            {pendingUsers.map((user) => (
              <div key={user.uid} className="access-request-item">
                <span className="user-info">
                  {user.name} ({user.email})
                </span>
                <div className="request-actions">
                  <button
                    onClick={() => handleRoleChange(user.uid, "viewer")}
                    className="btn-approve"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRoleChange(user.uid, "denied")}
                    className="btn-deny"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
