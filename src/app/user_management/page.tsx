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

export default function UserManagementPage() {
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
        .then(() => toast.success(`User role updated to ${newRole}`))
        .catch((err) => {
            toast.error("Failed to update role");
            console.error(err);
        });
  };

  const managedUsers = users.filter((u) => u.role !== "pending");

  if (!user || user.role !== 'admin') {
      return null; 
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h2>User Management</h2>
        </div>

        <div className="user-management-list">
          {managedUsers.map((user) => (
            <div key={user.uid} className="user-management-item">
              <span className="user-info">
                {user.name} ({user.email})
              </span>
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                className="role-select"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
                <option value="denied">Denied</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
