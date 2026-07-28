"use client";

import React, { useState, useEffect } from "react";
import type { Person, DraftPerson, PersonEvent } from "../types/person";
import { useToast } from "./ToastSystem";
import ImageUpload from "./ImageUpload";
import AliasesInput from "./AliasesInput";
import EventsEditor from "./EventsEditor";
import CustomFieldsEditor from "./CustomFieldsEditor";

interface PersonFormProps {
  person: DraftPerson | null;
  onSave: (data: DraftPerson) => void;
  onDelete?: (id: string) => void;
  canEdit: boolean;
  isProfile?: boolean;
}

const PersonForm: React.FC<PersonFormProps> = ({
  person,
  onSave,
  onDelete,
  canEdit,
  isProfile = false,
}) => {
  const [formData, setFormData] = useState<DraftPerson | null>(person);
  const toast = useToast();

  useEffect(() => {
    setFormData(person);
  }, [person]);

  if (!formData || !person) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
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

  const handleEventsChange = (events: PersonEvent[]) => {
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

  const handleAddCustomField = () => {
    const newKey = `new_field_${Date.now()}`;
    setFormData({
      ...formData,
      custom_fields: {
        ...(formData.custom_fields || {}),
        [newKey]: "",
      },
    });
  };

  // Success/error toasts fire in the page-level handlers (which await the
  // actual save) — toasting here too would announce success before the write
  // lands, even when it then fails and rolls back.
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) onSave(formData);
  };

  const handleDelete = () => {
    if (!onDelete || !person.id) return;
    const personId = person.id;
    toast.confirm(
      "Are you sure you want to delete this person? This action cannot be undone.",
      () => onDelete(personId)
    );
  };

  return (
    <div
      className="form-container"
      style={{ backgroundColor: "transparent", boxShadow: "none", padding: 0 }}
    >
      {/* Profile Header */}
      <div className="section-card profile-header">
        <div className="profile-image-section">
          <ImageUpload
            imageUrl={formData.image_url || ""}
            onImageChange={handleImageChange}
            onImageRemove={handleImageRemove}
            canEdit={canEdit}
            storagePath={person?.id ? `images/people/${person.id}` : undefined}
          />
        </div>
        <div className="profile-header-info">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="person-name">Official name</label>
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
              placeholder="Enter name"
            />
          </div>

          {!isProfile && (
            <div className="form-group" style={{ marginTop: "15px" }}>
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
          )}
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Identity Section */}
        <div className="section-card">
          <h3>Identity</h3>
          <div className="form-row">
            <div className="form-col">
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
            </div>
            <div className="form-col">
              <div className="form-group">
                <label>Aliases</label>
                <AliasesInput
                  aliases={formData.name?.aliases || []}
                  onChange={handleAliasesChange}
                  canEdit={canEdit}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="section-card">
          <div className="section-header-row">
            <h3>Life Events</h3>
            {canEdit && (
              <button
                type="button"
                className="btn-icon-add"
                onClick={() =>
                  setFormData({
                    ...formData,
                    events: [...(formData.events || []), { type: "", date: "", place: "" }],
                  })
                }
                aria-label="Add life event"
                title="Add event"
              >
                +
              </button>
            )}
          </div>
          <EventsEditor
            events={formData.events || []}
            onChange={handleEventsChange}
            canEdit={canEdit}
          />
        </div>

        {/* Custom Fields Section */}
        <div className="section-card">
          <div className="section-header-row">
            <h3>Additional Information</h3>
            {canEdit && (
              <button
                type="button"
                className="btn-icon-add"
                onClick={handleAddCustomField}
                aria-label="Add custom field"
                title="Add field"
              >
                +
              </button>
            )}
          </div>
          <CustomFieldsEditor
            customFields={Object.entries(formData.custom_fields || {}).map(([key, value]) => ({
              key,
              value,
            }))}
            onChange={handleCustomFieldsChange}
            canEdit={canEdit}
          />
        </div>

        {canEdit && (
          <div className="form-actions">
            {!isProfile && person.id && onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                style={{ marginRight: "auto" }}
              >
                Delete Person
              </button>
            )}
            <button type="submit" className="btn btn-primary">
              {isProfile ? "Update Profile" : "Save Changes"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default PersonForm;
