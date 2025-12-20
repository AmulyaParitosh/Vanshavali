"use client";

import React, { useState, useEffect } from "react";
import { useAppContext } from "../../../context/AppContext";
import PersonForm from "../../../components/PersonForm";
import PersonSearch from "../../../components/PersonSearch";
import Loading from "../../../components/Loading";
import { useToast } from "../../../components/ToastSystem";
import type { Person } from "../../../types/person";

export default function ProfilePage() {
  const { user, treeData, dataProvider, onSave, refreshUser } = useAppContext();
  const [isLinking, setIsLinking] = useState(false);
  const toast = useToast();

  if (!user) {
    return (
      <div className="welcome-message">
        <h2>Please log in to view your profile</h2>
      </div>
    );
  }

  const linkedPerson = treeData?.people.find((p) => p.userId === user.uid) || null;
  const isUserLinked = !!linkedPerson;

  const handleLinkPerson = async (personId: string) => {
    const person = treeData?.people.find(p => p.id === personId);
    const personName = person?.name.official_name || 'selected person';

    toast.confirm(
      `Are you sure you want to link your account to ${personName}? This action is PERMANENT and cannot be changed once set.`,
      async () => {
        try {
          await dataProvider.linkUserToPerson(personId, user.uid);
          toast.success(`Successfully linked to ${personName}`);
          setIsLinking(false);
          // Force refresh of user data to show linked identity
          await refreshUser();
        } catch (error: any) {
          console.error("Error linking person:", error);
          toast.error(error.message || "Failed to link person");
        }
      }
    );
  };

  const handleCreateNewPerson = async () => {
    const newPerson: Person = {
      id: `p_${user.uid}`, // Use UID as ID or generate one
      name: { official_name: user.displayName || "New Person" },
      sex: "M",
      events: [],
      custom_fields: {},
      userId: user.uid, // Set the userId for the new person
    };

    try {
      // First save the person to tree data
      if (treeData) {
        const newData = { ...treeData, people: [...treeData.people, newPerson] };
        await onSave(newData);
        
        toast.success("Created and linked to a new profile");
        // Force refresh of user data to show linked identity
        await refreshUser();
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Failed to create profile");
    }
  };

  const handleSaveProfile = (updatedPerson: Person) => {
    if (treeData) {
      const updatedPeople = treeData.people.map(p => p.id === updatedPerson.id ? updatedPerson : p);
      onSave({ ...treeData, people: updatedPeople });
    }
  };

  return (
    <div className="profile-page-container">
      <div className="section-card">
        <h2>My Account</h2>
        <div className="account-info">
          <p><strong>Name:</strong> {user.displayName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> <span className={`role-badge role-${user.role}`}>{user.role}</span></p>
        </div>
      </div>

      {linkedPerson ? (
        <div className="profile-person-section">
          <h2>Linked Identity in Tree</h2>
          <PersonForm 
            person={linkedPerson} 
            onSave={handleSaveProfile} 
            canEdit={true} 
            isProfile={true}
          />
        </div>
      ) : (
        <div className="section-card linking-section">
          <h2>Link to Tree</h2>
          <p>You are not currently linked to a person in the family tree.</p>
          
          {isLinking ? (
            <div className="link-choice">
              <div className="search-box-container">
                <h3>Search for yourself in the tree:</h3>
                <PersonSearch 
                  people={treeData?.people || []} 
                  onSelect={handleLinkPerson} 
                  hideLinked={true}
                />
              </div>
              <button className="btn btn-secondary" onClick={() => setIsLinking(false)}>Cancel</button>
            </div>
          ) : (
            <div className="link-actions">
              <button className="btn btn-primary" onClick={() => setIsLinking(true)}>
                I already exist in the tree (Link)
              </button>
              <button className="btn btn-secondary" onClick={handleCreateNewPerson}>
                I'm not in the tree (Create New)
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .profile-page-container {
          /* max-width: 800px; REMOVED */
          /* margin: 0 auto; REMOVED */
          padding: 40px;
          height: 100%;
          overflow-y: auto;
          box-sizing: border-box;
          flex: 1;
        }
        .account-info p {
          margin: 10px 0;
        }
        .role-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.85em;
          text-transform: capitalize;
        }
        .role-admin { background: #fee2e2; color: #991b1b; }
        .role-editor { background: #fef3c7; color: #92400e; }
        .role-viewer { background: #dcfce7; color: #166534; }
        .role-pending { background: #f3f4f6; color: #374151; }
        
        .linking-section {
          text-align: center;
          padding: 40px;
        }
        .link-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 25px;
        }
        .search-box-container {
          margin: 20px 0;
          text-align: left;
        }
      `}</style>
    </div>
  );
}
