"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppContext } from "../../context/AppContext";
import Loading from "../../components/Loading";
import type { Person, DraftPerson } from "../../types/person";
import type { TreeData } from "../../context/AppContext";

import PersonForm from "../../components/PersonForm";
import TextListSidebar from "../../components/TextListSidebar";
import SearchItem from "../../components/SearchItem";
import { canEdit as canEditRole } from "../../lib/access";
import { familyPartners } from "../../lib/family";

export default function PeoplePage() {
  const { treeData, user, onSave } = useAppContext();
  const canEdit = canEditRole(user?.role);

  const searchParams = useSearchParams();
  const initId = searchParams.get("id");

  const [data, setData] = useState<TreeData | null>(treeData);
  const [selectedPerson, setSelectedPerson] = useState<DraftPerson | null>(() => {
    if (initId && treeData) {
      return treeData.people.find((p) => p.id === initId) || null;
    }
    return null;
  });

  useEffect(() => {
    if (initId && treeData && !selectedPerson) {
      const person = treeData.people.find((p) => p.id === initId);
      if (person) setSelectedPerson(person);
    }
  }, [initId, treeData, selectedPerson]);

  useEffect(() => {
    setData(treeData);
  }, [treeData]);

  if (!data) {
    return <Loading />;
  }

  const generateIdFromName = (name: string) => {
    if (!name) return `p_${Date.now()}`;
    const baseId =
      "p_" +
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, "_");
    let finalId = baseId;
    let counter = 1;
    while (data.people.some((p: Person) => p.id === finalId)) {
      finalId = `${baseId}_${counter}`;
      counter++;
    }
    return finalId;
  };

  const handleSavePerson = (person: DraftPerson) => {
    if (!canEdit) return;
    let updatedPeople: Person[];
    let savedPerson: Person;
    if (person.id) {
      savedPerson = person as Person;
      updatedPeople = data.people.map((p) => (p.id === savedPerson.id ? savedPerson : p));
    } else {
      savedPerson = {
        ...person,
        id: generateIdFromName(person.name.official_name),
      };
      updatedPeople = [...data.people, savedPerson];
      setSelectedPerson(savedPerson);
    }
    const newData = { ...data, people: updatedPeople };
    setData(newData);
    onSave(newData);
  };

  const handleDeletePerson = (personId: string) => {
    if (!canEdit) return;
    const updatedPeople = data.people.filter((p) => p.id !== personId);
    const updatedFamilies = data.families
      .map((f) => ({
        ...f,
        children: (f.children || []).filter((c) => c !== personId),
      }))
      .filter((f) => !familyPartners(f).includes(personId));

    const newData = {
      ...data,
      people: updatedPeople,
      families: updatedFamilies,
    };
    setData(newData);
    onSave(newData);
    setSelectedPerson(null);
  };

  const handleAddNewPerson = () => {
    if (!canEdit) return;
    setSelectedPerson({
      name: { official_name: "" },
      sex: "M",
      events: [],
      custom_fields: {},
    });
  };

  return (
    <div className="edit-screen">
      <TextListSidebar<Person>
        items={data.people}
        renderItem={(p) => <SearchItem type="person" item={p} />}
        filterItem={(p, query) => {
          const q = query.toLowerCase();
          const nameMatch = p.name.official_name.toLowerCase().includes(q);
          const aliasMatch = p.name.aliases?.some((alias) => alias.toLowerCase().includes(q));
          return nameMatch || !!aliasMatch;
        }}
        onSelect={setSelectedPerson}
        selectedItem={selectedPerson && selectedPerson.id ? (selectedPerson as Person) : null}
        onAdd={canEdit ? handleAddNewPerson : undefined}
        addButtonLabel="Add New Person"
        canEdit={canEdit}
      />
      <main className="editor-panel">
        {!selectedPerson && (
          <div className="welcome-message">
            <h2>Select a person to view details</h2>
            {canEdit && (
              <p>You can add a new person using the button at the bottom of the sidebar.</p>
            )}
          </div>
        )}
        {selectedPerson && (
          <PersonForm
            person={selectedPerson}
            onSave={handleSavePerson}
            onDelete={handleDeletePerson}
            canEdit={canEdit}
          />
        )}
      </main>
    </div>
  );
}
