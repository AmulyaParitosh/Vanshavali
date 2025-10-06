import React, { useState, useEffect } from 'react';
import EventsEditor from './EventsEditor';
import CustomFieldsEditor from './CustomFieldsEditor';
import AliasesInput from './AliasesInput';
import ImageUpload from './ImageUpload';

const PersonForm = ({ person, onSave, onDelete }) => {
  const [formData, setFormData] = useState(person);

  useEffect(() => {
    setFormData(person);
  }, [person]);

  if (!person) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };
  
  const handleAliasesChange = (aliases) => {
    setFormData({ ...formData, name: { ...formData.name, aliases } });
  };
  
  // Updated to handle both the URL and the storage path
  const handleImageChange = (imageUrl, imagePath) => {
    setFormData({ ...formData, image_url: imageUrl, image_storage_path: imagePath });
  };

  const handleImageRemove = () => {
    // In a real app, you would also delete the image from Supabase storage here
    setFormData({ ...formData, image_url: '', image_storage_path: '' });
  };

  const handleEventsChange = (events) => {
    setFormData({ ...formData, events });
  };

  const handleCustomFieldsChange = (customFields) => {
    const newCustomFields = {};
    customFields.forEach(field => {
      if (field.key) {
        newCustomFields[field.key] = field.value;
      }
    });
    setFormData({ ...formData, custom_fields: newCustomFields });
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this person? This action cannot be undone and may affect family structures.')) {
      onDelete(person.id);
    }
  };

  return (
    <div className="form-container">
      <h2>{person.id ? 'Edit Person' : 'Add New Person'}</h2>
      <form onSubmit={handleSave}>
          <div className="person-form-main-details">
              <div className="person-form-left-column">
                  <div className="form-group">
                      <label htmlFor="person-name">Official Name</label>
                      <input type="text" id="person-name" value={formData.name?.official_name || ''} onChange={(e) => setFormData({ ...formData, name: { ...formData.name, official_name: e.target.value } })} required />
                  </div>
                  <div className="form-group">
                      <label htmlFor="person-sex">Sex</label>
                      <select id="person-sex" name="sex" value={formData.sex || 'M'} onChange={handleChange}>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                      </select>
                  </div>
                  <div className="form-group">
                      <label>Aliases</label>
                      <AliasesInput aliases={formData.name?.aliases} onChange={handleAliasesChange} />
                  </div>
                  <div className="form-group">
                      <label className="checkbox-label">
                          <input type="checkbox" name="root" checked={formData.root || false} onChange={handleChange} />
                          <span>Set as Tree Root</span>
                      </label>
                  </div>
              </div>
              <div className="person-form-right-column">
                  <ImageUpload 
                    imageUrl={formData.image_url} 
                    onImageChange={handleImageChange} 
                    onImageRemove={handleImageRemove} 
                  />
              </div>
          </div>

        <h3 className="form-section-heading">Events</h3>
        <EventsEditor events={formData.events || []} onChange={handleEventsChange} />
        
        <h3 className="form-section-heading">Custom Fields</h3>
        <CustomFieldsEditor customFields={Object.entries(formData.custom_fields || {}).map(([key, value]) => ({ key, value }))} onChange={handleCustomFieldsChange} />
        
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save Person</button>
          {person.id && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Delete Person
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PersonForm;
