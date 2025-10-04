import React, { useState, useEffect } from 'react';
import EventsEditor from './EventsEditor';
import CustomFieldsEditor from './CustomFieldsEditor';

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

  return (
    <div className="form-container active">
      <h2>{person.id ? 'Edit Person' : 'Add New Person'}</h2>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="person-name">Official Name</label>
          <input type="text" id="person-name" name="name" value={formData.name?.official_name || ''} onChange={(e) => setFormData({ ...formData, name: { ...formData.name, official_name: e.target.value } })} required />
        </div>
        <div className="form-group">
          <label htmlFor="person-sex">Sex</label>
          <select id="person-sex" name="sex" value={formData.sex || 'M'} onChange={handleChange}>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="person-image">Image URL</label>
          <input type="text" id="person-image" name="image_url" value={formData.image_url || ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>
            <input type="checkbox" name="root" checked={formData.root || false} onChange={handleChange} /> Set as Tree Root
          </label>
        </div>
        <hr />
        <EventsEditor events={formData.events || []} onChange={handleEventsChange} />
        <hr />
        <CustomFieldsEditor customFields={Object.entries(formData.custom_fields || {}).map(([key, value]) => ({ key, value }))} onChange={handleCustomFieldsChange} />
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
          <button type="submit" className="btn-primary">Save Person</button>
          {person.id && (
            <button type="button" className="btn-danger" onClick={() => onDelete(person.id)}>
              Delete Person
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PersonForm;
