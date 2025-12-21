'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import type { AdminUser } from "../../../services/types";
import { USER_ROLES } from "../../../constants";

import { useToast } from "../../../components/ToastSystem";

export default function AccessRequestsPage() {
  const { user, dataProvider } = useAppContext();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (user && user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.EDITOR) {
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
  }, [dataProvider]);

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
        await dataProvider.updateUserRole(uid, newRole);
        if (newRole === "denied") {
            toast.success("Request denied");
        } else {
            toast.success(`Request approved as ${newRole}`);
        }
        // Locally update the state
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error) {
        toast.error("Failed to update role");
        console.error(error);
    }
  };

  const pendingUsers = users.filter((u) => u.role === USER_ROLES.PENDING);

  if (!user || (user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.EDITOR)) {
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
