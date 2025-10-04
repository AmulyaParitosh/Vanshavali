import React, { useState, useEffect } from 'react';

const FamilyForm = ({ family, people, onSave, onDelete }) => {
  const [formData, setFormData] = useState(family);

  useEffect(() => {
    setFormData(family);
  }, [family]);

  if (!family) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    const currentPartners = formData.partners || ['', ''];
    let newPartners;
    if (name === 'partner1') {
      newPartners = [value, currentPartners[1]];
    } else {
      newPartners = [currentPartners[0], value];
    }
    setFormData({ ...formData, partners: newPartners });
  };

  const handleChildrenChange = (e) => {
    const selectedChildren = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData({ ...formData, children: selectedChildren });
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const partner1Id = formData.partners ? formData.partners[0] : '';
  const partner2Id = formData.partners ? formData.partners[1] : '';

  return (
    <div className="form-container active">
      <h2>{family.id ? 'Edit Family' : 'Add New Family'}</h2>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="family-partner1">Partner 1 (Male)</label>
          <select id="family-partner1" name="partner1" value={partner1Id} onChange={handleChange} required>
            <option value="">Select a person</option>
            {people.filter(p => p.sex === 'M').map(p => (
              <option key={p.id} value={p.id}>{p.name.official_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="family-partner2">Partner 2 (Female)</label>
          <select id="family-partner2" name="partner2" value={partner2Id} onChange={handleChange} required>
            <option value="">Select a person</option>
            {people.filter(p => p.sex === 'F').map(p => (
              <option key={p.id} value={p.id}>{p.name.official_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="family-children">Children</label>
          <select id="family-children" multiple value={formData.children || []} onChange={handleChildrenChange}>
            {people
              .filter(p => p.id !== partner1Id && p.id !== partner2Id)
              .map(p => (
              <option key={p.id} value={p.id}>{p.name.official_name}</option>
            ))}
          </select>
          <small><b>Hold Ctrl/Cmd to select multiple children.</b></small>
        </div>
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
          <button type="submit" className="btn-primary">Save Family</button>
          {family.id && (
            <button type="button" className="btn-danger" onClick={() => onDelete(family.id)}>
              Delete Family
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FamilyForm;
