import React from "react";

interface CustomField {
  key: string;
  value: string;
}

interface CustomFieldsEditorProps {
  customFields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  canEdit: boolean;
}

const CustomFieldsEditor: React.FC<CustomFieldsEditorProps> = ({
  customFields,
  onChange,
  canEdit,
}) => {
  const handleFieldChange = (index: number, key: string, value: string) => {
    const newFields = [...customFields];
    newFields[index] = { key, value };
    onChange(newFields);
  };

  const removeField = (index: number) => {
    const newFields = customFields.filter((_, i) => i !== index);
    onChange(newFields);
  };

  return (
    <div className="dynamic-list">
      {customFields.map((field, index) => (
        <div key={index} className="item">
          <div className="form-group">
            <label className="field-label" htmlFor={`field-key-${index}`}>
              Detail
            </label>
            <input
              id={`field-key-${index}`}
              className="input"
              type="text"
              value={field.key}
              onChange={(e) => handleFieldChange(index, e.target.value, field.value)}
              placeholder="e.g., occupation"
              disabled={!canEdit}
            />
          </div>
          <div className="form-group">
            <label className="field-label" htmlFor={`field-value-${index}`}>
              What it says
            </label>
            <input
              id={`field-value-${index}`}
              className="input"
              type="text"
              value={field.value}
              onChange={(e) => handleFieldChange(index, field.key, e.target.value)}
              disabled={!canEdit}
            />
          </div>
          {canEdit && (
            <button
              type="button"
              className="btn-icon-remove small"
              onClick={() => removeField(index)}
              aria-label="Remove field"
              title="Remove field"
            >
              &times;
            </button>
          )}
        </div>
      ))}
      {canEdit && (
        <button
          type="button"
          className="dynamic-list-add"
          onClick={() => onChange([...customFields, { key: "", value: "" }])}
        >
          + Add detail
        </button>
      )}
    </div>
  );
};

export default CustomFieldsEditor;
