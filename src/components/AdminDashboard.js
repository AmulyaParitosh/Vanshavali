import React, { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, update } from 'firebase/database';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const usersRef = ref(database, 'users/');
    const unsubscribe = onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val() || {};
        const usersList = Object.keys(usersData).map(uid => ({
            uid,
            ...usersData[uid]
        }));
        setUsers(usersList);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = (uid, newRole) => {
    const userRef = ref(database, `users/${uid}`);
    update(userRef, { role: newRole });
  };

  const renderAccessRequests = () => {
    const pendingUsers = users.filter(u => u.role === 'pending');
    if (pendingUsers.length === 0) {
        return <p>No pending access requests.</p>;
    }

    return (
        <div className="access-requests-list">
            {pendingUsers.map(user => (
                <div key={user.uid} className="access-request-item">
                    <span className="user-info">{user.name} ({user.email})</span>
                    <div className="request-actions">
                        <button onClick={() => handleRoleChange(user.uid, 'viewer')} className="btn-approve">Approve</button>
                        <button onClick={() => handleRoleChange(user.uid, 'denied')} className="btn-deny">Deny</button>
                    </div>
                </div>
            ))}
        </div>
    );
  };

  const renderUserManagement = () => {
    const managedUsers = users.filter(u => u.role !== 'pending');
    return (
        <div className="user-management-list">
            {managedUsers.map(user => (
                <div key={user.uid} className="user-management-item">
                    <span className="user-info">{user.name} ({user.email})</span>
                    <select value={user.role} onChange={(e) => handleRoleChange(user.uid, e.target.value)} className="role-select">
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                        <option value="denied">Denied</option>
                    </select>
                </div>
            ))}
        </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
            <h2>Admin Dashboard</h2>
        </div>

        <div className="admin-section">
          <h3>Access Requests</h3>
          {renderAccessRequests()}
        </div>
        
        <div className="admin-section">
          <h3>User Management</h3>
          {renderUserManagement()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
