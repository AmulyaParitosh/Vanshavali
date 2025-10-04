import React from 'react';

const CustomFieldsEditor = ({ customFields, onChange }) => {
  const handleFieldChange = (index, key, value) => {
    const newFields = [...customFields];
    newFields[index] = { key, value };
    onChange(newFields);
  };

  const addField = () => {
    onChange([...customFields, { key: '', value: '' }]);
  };

  const removeField = (index) => {
    const newFields = customFields.filter((_, i) => i !== index);
    onChange(newFields);
  };

  return (
    <div className="dynamic-list">
      <h3>Custom Fields</h3>
      {customFields.map((field, index) => (
        <div key={index} className="item">
          <button type="button" className="remove-item-btn btn-danger" onClick={() => removeField(index)}>X</button>
          <div className="form-group">
            <label>Field Name</label>
            <input type="text" value={field.key} onChange={(e) => handleFieldChange(index, e.target.value, field.value)} placeholder="e.g., occupation" />
          </div>
          <div className="form-group">
            <label>Field Value</label>
            <input type="text" value={field.value} onChange={(e) => handleFieldChange(index, field.key, e.target.value)} />
          </div>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={addField}>Add Custom Field</button>
    </div>
  );
};

export default CustomFieldsEditor;
