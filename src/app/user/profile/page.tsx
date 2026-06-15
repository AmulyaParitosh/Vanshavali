"use client";

import React, { useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import PersonForm from "../../../components/PersonForm";
import PersonSearch from "../../../components/PersonSearch";
import { useToast } from "../../../components/ToastSystem";
import type { Person, DraftPerson } from "../../../types/person";

export default function ProfilePage() {
  const {
    user,
    profile,
    membership,
    currentTreeId,
    treeData,
    dataProvider,
    onSave,
    refreshProfile,
  } = useAppContext();
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

  const handleLinkPerson = async (personId: string) => {
    if (!currentTreeId) {
      toast.error("No active tree.");
      return;
    }
    const person = treeData?.people.find((p) => p.id === personId);
    const personName = person?.name.official_name || "selected person";

    toast.confirm(
      `Link your account to ${personName}? This is permanent and cannot be changed.`,
      async () => {
        try {
          await dataProvider.linkUserToPerson(currentTreeId, personId, user.uid);
          toast.success(`Linked to ${personName}`);
          setIsLinking(false);
          await refreshProfile();
        } catch (error: unknown) {
          console.error("Error linking person:", error);
          const message = error instanceof Error ? error.message : "Link failed";
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
      toast.success("Created and linked to a new profile");
      await refreshProfile();
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

  const roleLabel = membership?.role ?? "no role";

  return (
    <div className="profile-page-container">
      <div className="section-card">
        <h2>My Account</h2>
        <div className="account-info">
          <p>
            <strong>Name:</strong> {profile?.name ?? user.displayName}
          </p>
          <p>
            <strong>Email:</strong> {profile?.email ?? user.email}
          </p>
          <p>
            <strong>Role in this tree:</strong>{" "}
            <span className={`role-badge role-${roleLabel}`}>{roleLabel}</span>
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
          padding: var(--space-10);
          height: 100%;
          overflow-y: auto;
          box-sizing: border-box;
          flex: 1;
        }
        .account-info p {
          margin: var(--space-2) 0;
        }
        .role-badge {
          display: inline-block;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-xs);
          font-size: var(--font-size-sm);
          text-transform: capitalize;
          font-weight: 600;
        }
        .role-owner {
          background: var(--color-primary-50);
          color: var(--color-primary-700);
        }
        .role-editor {
          background: #fff5e0;
          color: #7a4400;
        }
        .role-viewer {
          background: #e8f5ec;
          color: #1f6a3e;
        }
        .role-no.role {
          background: var(--color-neutral-100);
          color: var(--color-neutral-700);
        }

        .linking-section {
          text-align: center;
          padding: var(--space-10);
        }
        .link-actions {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          margin-top: var(--space-6);
        }
        .search-box-container {
          margin: var(--space-5) 0;
          text-align: left;
        }
      `}</style>
    </div>
  );
}
