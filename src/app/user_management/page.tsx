'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import type { AdminUser } from "../../services/types";
import { USER_ROLES } from "../../constants";

import { useToast } from "../../components/ToastSystem";

export default function UserManagementPage() {
  const { user, dataProvider } = useAppContext();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (user && user.role !== USER_ROLES.ADMIN) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const usersList = await dataProvider.getAllUsers();
            setUsers(usersList);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        }
    };
    fetchUsers();
    
    // Note: In a real app we might want to subscribe to updates, 
    // but for now let's just fetch once or implement a specific subscription.
  }, [dataProvider]);

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
        await dataProvider.updateUserRole(uid, newRole);
        toast.success(`User role updated to ${newRole}`);
        // Locally update the state for immediate feedback
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (err) {
        toast.error("Failed to update role");
        console.error(err);
    }
  };

  const managedUsers = users.filter((u) => u.role !== USER_ROLES.PENDING);

  if (!user || user.role !== USER_ROLES.ADMIN) {
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
