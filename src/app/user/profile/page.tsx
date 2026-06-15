"use client";

import React, { useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import PersonForm from "../../../components/PersonForm";
import PersonSearch from "../../../components/PersonSearch";
import { useToast } from "../../../components/ToastSystem";
import type { Person, DraftPerson } from "../../../types/person";

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
    const person = treeData?.people.find((p) => p.id === personId);
    const personName = person?.name.official_name || "selected person";

    toast.confirm(
      `Are you sure you want to link your account to ${personName}? This action is PERMANENT and cannot be changed once set.`,
      async () => {
        try {
          await dataProvider.linkUserToPerson(personId, user.uid);
          toast.success(`Successfully linked to ${personName}`);
          setIsLinking(false);
          await refreshUser();
        } catch (error: unknown) {
          console.error("Error linking person:", error);
          const message = error instanceof Error ? error.message : "Failed to link person";
          toast.error(message);
        }
      }
    );
  };

  const generateProfilePersonId = (): string => {
    const baseId = `p_${user.uid}`;
    if (!treeData) return baseId;
    let candidate = baseId;
    let counter = 1;
    while (treeData.people.some((p) => p.id === candidate)) {
      candidate = `${baseId}_${counter++}`;
    }
    return candidate;
  };

  const handleCreateNewPerson = async () => {
    if (!treeData) {
      toast.error("Tree data unavailable. Try again in a moment.");
      return;
    }

    const newPerson: Person = {
      id: generateProfilePersonId(),
      name: { official_name: user.displayName || "New Person" },
      sex: "M",
      events: [],
      custom_fields: {},
      userId: user.uid,
    };

    try {
      const newData = { ...treeData, people: [...treeData.people, newPerson] };
      await onSave(newData);
      // Toast only after save succeeded — audit fix #2: prior code toasted
      // success even when onSave rejected, misleading the user.
      toast.success("Created and linked to a new profile");
      await refreshUser();
    } catch (error: unknown) {
      console.error("Error creating profile:", error);
      const message = error instanceof Error ? error.message : "Failed to create profile";
      toast.error(message);
    }
  };

  const handleSaveProfile = async (updated: DraftPerson) => {
    if (!treeData || !updated.id) return;
    const personId = updated.id;
    const updatedPeople = treeData.people.map((p) =>
      p.id === personId ? ({ ...updated, id: personId } as Person) : p
    );
    try {
      await onSave({ ...treeData, people: updatedPeople });
      toast.success("Profile saved");
    } catch (error: unknown) {
      console.error("Error saving profile:", error);
      const message = error instanceof Error ? error.message : "Failed to save profile";
      toast.error(message);
    }
  };

  return (
    <div className="profile-page-container">
      <div className="section-card">
        <h2>My Account</h2>
        <div className="account-info">
          <p>
            <strong>Name:</strong> {user.displayName}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Role:</strong>{" "}
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
          </p>
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
              <button className="btn btn-secondary" onClick={() => setIsLinking(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="link-actions">
              <button className="btn btn-primary" onClick={() => setIsLinking(true)}>
                I already exist in the tree (Link)
              </button>
              <button className="btn btn-secondary" onClick={handleCreateNewPerson}>
                I&apos;m not in the tree (Create New)
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
        .role-admin {
          background: #fee2e2;
          color: #991b1b;
        }
        .role-editor {
          background: #fef3c7;
          color: #92400e;
        }
        .role-viewer {
          background: #dcfce7;
          color: #166534;
        }
        .role-pending {
          background: #f3f4f6;
          color: #374151;
        }

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
