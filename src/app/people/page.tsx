'use client';
import React, { useState, useEffect } from "react";
import { useAppContext } from '../../context/AppContext';
import Loading from '../../components/Loading';
import type { Person } from "../../types/person";
// @ts-ignore
import type { TreeData } from "../../context/AppContext";

// Sub-components
import EventsEditor from "../../components/EventsEditor";
import CustomFieldsEditor from "../../components/CustomFieldsEditor";
import AliasesInput from "../../components/AliasesInput";
import ImageUpload from "../../components/ImageUpload";
import TextListSidebar from "../../components/TextListSidebar";

export default function PeoplePage() {
  const { treeData, user, onSave } = useAppContext();
  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const [data, setData] = useState<TreeData | null>(treeData);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

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

  const handleSavePerson = (person: Person) => {
    if (!canEdit) return;
    let updatedPeople;
    if (person.id) {
      updatedPeople = data.people.map((p) => (p.id === person.id ? person : p));
    } else {
      const newPerson = {
        ...person,
        id: generateIdFromName(person.name.official_name),
      };
      updatedPeople = [...data.people, newPerson];
      setSelectedPerson(newPerson);
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
      .filter((f) => f.partners[0] !== personId && f.partners[1] !== personId);

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
    // @ts-ignore
    setSelectedPerson({
      name: { official_name: "" },
      sex: "M",
      events: [],
      custom_fields: {},
    });
  };



  return (
    <div className="edit-screen">

      <TextListSidebar
        items={data.people}
        renderItem={(p: Person) => p.name.official_name}
        filterItem={(p: Person, query: string) => {
          const q = query.toLowerCase();
          const nameMatch = p.name.official_name.toLowerCase().includes(q);
          const aliasMatch = p.name.aliases?.some(alias => alias.toLowerCase().includes(q));
          return nameMatch || !!aliasMatch;
        }}
        onSelect={setSelectedPerson}
        selectedItem={selectedPerson}
        onAdd={canEdit ? handleAddNewPerson : undefined}
        addButtonLabel="Add New Person"
        canEdit={canEdit}
      />
      <main className="editor-panel">
        {!selectedPerson && (
          <div className="welcome-message">
            <h2>Select a person to view details</h2>
            {canEdit && (
              <p>
                You can add a new person using the button at the bottom of the
                sidebar.
              </p>
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

// ----------------------------------------------------------------------
// Local Component: PersonForm
// ----------------------------------------------------------------------

import { useToast } from "../../components/ToastSystem";

// ... existing imports ...

interface PersonFormProps {
  person: Person | null;
  onSave: (data: Person) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}

const PersonForm: React.FC<PersonFormProps> = ({ person, onSave, onDelete, canEdit }) => {
  const [formData, setFormData] = useState<Person | null>(person);
  const toast = useToast();

  useEffect(() => {
    setFormData(person);
  }, [person]);

  if (!formData || !person) return null;
  
  // ... existing handlers ...

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Type assertion for checkbox handling since 'checked' doesn't exist on all input types in the union
    const checked = (e.target as HTMLInputElement).checked; 
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleAliasesChange = (aliases: string[]) => {
    setFormData({ ...formData, name: { ...formData.name, aliases } });
  };

  const handleImageChange = (imageUrl: string, imagePath: string) => {
    setFormData({
      ...formData,
      image_url: imageUrl,
      image_storage_path: imagePath,
    });
  };

  const handleImageRemove = () => {
    setFormData({ ...formData, image_url: "", image_storage_path: "" });
  };

  const handleEventsChange = (events: any[]) => {
    setFormData({ ...formData, events });
  };

  const handleCustomFieldsChange = (customFields: { key: string; value: string }[]) => {
    const newCustomFields: Record<string, string> = {};
    customFields.forEach((field) => {
      if (field.key) {
        newCustomFields[field.key] = field.value;
      }
    });
    setFormData({ ...formData, custom_fields: newCustomFields });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
        onSave(formData);
        toast.success("Person saved successfully!");
    }
  };

  const handleDelete = () => {
    toast.confirm(
        "Are you sure you want to delete this person? This action cannot be undone.",
        () => {
            if (person?.id) {
                onDelete(person.id);
                toast.success("Person deleted.");
            }
        }
    );
  };

  return (
    <div className="form-container">
      <h2>Person Details</h2>
      
      {/* Demo Section for Verification */}


      <form onSubmit={handleSave}>
        <div className="person-form-main-details">
          <div className="person-form-left-column">
            <div className="form-group">
              <label htmlFor="person-name">Official Name</label>
              <input
                type="text"
                id="person-name"
                value={formData?.name?.official_name || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: { ...formData.name, official_name: e.target.value },
                  })
                }
                required
                disabled={!canEdit}
              />
            </div>
            <div className="form-group">
              <label htmlFor="person-sex">Sex</label>
              <select
                id="person-sex"
                name="sex"
                value={formData.sex || "M"}
                onChange={handleChange}
                disabled={!canEdit}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label>Aliases</label>
              <AliasesInput
                aliases={formData.name?.aliases || []}
                onChange={handleAliasesChange}
                canEdit={canEdit}
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="root"
                  checked={formData.root || false}
                  onChange={handleChange}
                  disabled={!canEdit}
                />
                <span>Set as Tree Root</span>
              </label>
            </div>
          </div>
          <div className="person-form-right-column">
            <ImageUpload
              imageUrl={formData.image_url || ""}
              onImageChange={handleImageChange}
              onImageRemove={handleImageRemove}
              canEdit={canEdit}
              storagePath={person?.id ? `images/people/${person.id}` : undefined}
            />
          </div>
        </div>

        <h3 className="form-section-heading">Events</h3>
        <EventsEditor
          events={formData.events || []}
          onChange={handleEventsChange}
          canEdit={canEdit}
        />

        <h3 className="form-section-heading">Custom Fields</h3>
        <CustomFieldsEditor
          customFields={Object.entries(formData.custom_fields || {}).map(
            ([key, value]) => ({ key, value })
          )}
          onChange={handleCustomFieldsChange}
          canEdit={canEdit}
        />

        {canEdit && (
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save Person
            </button>
            {person.id && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete Person
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
