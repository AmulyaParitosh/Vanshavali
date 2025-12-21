'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import type { AdminUser } from "../../../services/types";
import type { Person } from "../../../types/person";
import { USER_ROLES } from "../../../constants";

import { useToast } from "../../../components/ToastSystem";

const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  viewer: { label: 'Viewer', color: '#2e8b57', bgColor: '#f0f9f4' },
  editor: { label: 'Editor', color: '#ff8c00', bgColor: '#fffaf0' },
  admin: { label: 'Admin', color: '#b22222', bgColor: '#fff5f5' },
  denied: { label: 'Denied', color: '#666', bgColor: '#f5f5f5' }
};

export default function UserManagementPage() {
  const { user, dataProvider } = useAppContext();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | 'all'>('all');
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
    
    // Subscribe to tree data to get person information for aliases
    // This enables searching by person's display name and aliases
    const unsubscribe = dataProvider.subscribeToTreeData((data) => {
      setPeople(data.people);
    });
    
    return () => unsubscribe();
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

  // Get person data for a user if linked
  const getPersonData = (userId: string): Person | undefined => {
    return people.find(p => p.userId === userId);
  };

  // Filter users by search query
  const searchUsers = (usersList: AdminUser[]) => {
    if (!searchQuery.trim()) return usersList;
    
    const query = searchQuery.toLowerCase();
    return usersList.filter((u) => {
      // Search by name, email
      if (u.name?.toLowerCase().includes(query)) return true;
      if (u.email?.toLowerCase().includes(query)) return true;
      
      // Search by person's display name and aliases if linked
      const personData = getPersonData(u.uid);
      if (personData && personData.name) {
        if (personData.name.official_name?.toLowerCase().includes(query)) return true;
        if (personData.name.aliases?.some(alias => alias.toLowerCase().includes(query))) return true;
      }
      
      return false;
    });
  };

  const managedUsers = users.filter((u) => u.role !== USER_ROLES.PENDING);
  
  // Apply search filter
  const searchedUsers = searchUsers(managedUsers);
  
  // Apply role filter
  const filteredUsers = roleFilter === 'all' 
    ? searchedUsers 
    : searchedUsers.filter(u => u.role === roleFilter);

  if (!user || user.role !== USER_ROLES.ADMIN) {
      return null; 
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h2>User Management</h2>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, email, display name, or aliases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-bar">
          <button 
            className={`filter-btn ${roleFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRoleFilter('all')}
          >
            All ({searchedUsers.length})
          </button>
          {Object.entries(ROLE_CONFIG).map(([key, config]) => (
            <button 
              key={key}
              className={`filter-btn ${roleFilter === key ? 'active' : ''}`}
              onClick={() => setRoleFilter(key)}
            >
              {config.label} ({searchedUsers.filter(u => u.role === key).length})
            </button>
          ))}
        </div>

        {filteredUsers.length === 0 ? (
          <p className="no-data">No users found for this category.</p>
        ) : (
          <div className="user-management-list">
            {filteredUsers.map((u) => {
              const personData = getPersonData(u.uid);
              return (
                <div key={u.uid} className="user-management-item">
                  <div className="user-details">
                    <span className="user-info">
                      {u.name} ({u.email})
                    </span>
                    {personData && (
                      <div className="person-link-info">
                        <span className="person-name">
                          Linked to: {personData.name.official_name}
                        </span>
                        {personData.name.aliases && personData.name.aliases.length > 0 && (
                          <span className="person-aliases">
                            Aliases: {personData.name.aliases.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                    className="role-select"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .search-bar {
          margin-bottom: 20px;
        }
        .search-input {
          width: 100%;
          padding: 12px 20px;
          font-size: 1em;
          border: 1px solid var(--color-node-border);
          border-radius: var(--border-radius-md);
          background: var(--color-surface);
          font-family: var(--font-body);
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-light);
        }
        .filter-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          flex-wrap: wrap;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .filter-btn {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid var(--color-node-border);
          background: var(--color-surface);
          cursor: pointer;
          font-family: var(--font-body);
          font-weight: 500;
          transition: all 0.2s;
          color: var(--color-text);
        }
        .filter-btn:hover {
          background: var(--color-bg);
          border-color: var(--color-primary);
        }
        .filter-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
        .user-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .person-link-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.9em;
          color: #666;
          padding-left: 10px;
          border-left: 2px solid var(--color-accent);
        }
        .person-name {
          font-weight: 500;
          color: var(--color-accent);
        }
        .person-aliases {
          font-size: 0.85em;
          color: #888;
        }
      `}</style>
    </div>
  );
}
