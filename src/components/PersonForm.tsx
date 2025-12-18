import React, { useState, useEffect } from "react";
// @ts-ignore
import EventsEditor from "./EventsEditor";
// @ts-ignore
import CustomFieldsEditor from "./CustomFieldsEditor";
// @ts-ignore
import AliasesInput from "./AliasesInput";
// @ts-ignore
import ImageUpload from "./ImageUpload";
import type { Person } from "../types/person";

interface PersonFormProps {
  person: Person | null;
  onSave: (data: Person) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}

const PersonForm: React.FC<PersonFormProps> = ({ person, onSave, onDelete, canEdit }) => {
  const [formData, setFormData] = useState<Person | null>(person);

  useEffect(() => {
    setFormData(person);
  }, [person]);

  if (!formData || !person) return null;

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
    if (formData) onSave(formData);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this person? This action cannot be undone and may affect family structures."
      )
    ) {
      if (person?.id) onDelete(person.id);
    }
  };

  return (
    <div className="form-container">
      <h2>Person Details</h2>
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

export default PersonForm;
