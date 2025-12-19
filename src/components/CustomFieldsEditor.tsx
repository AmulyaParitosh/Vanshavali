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

const CustomFieldsEditor: React.FC<CustomFieldsEditorProps> = ({ customFields, onChange, canEdit }) => {
  const handleFieldChange = (index: number, key: string, value: string) => {
    const newFields = [...customFields];
    newFields[index] = { key, value };
    onChange(newFields);
  };

  const addField = () => {
    onChange([...customFields, { key: "", value: "" }]);
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
            <label>Field Name</label>
            <input
              type="text"
              value={field.key}
              onChange={(e) =>
                handleFieldChange(index, e.target.value, field.value)
              }
              placeholder="e.g., occupation"
              disabled={!canEdit}
            />
          </div>
          <div className="form-group">
            <label>Field Value</label>
            <input
              type="text"
              value={field.value}
              onChange={(e) =>
                handleFieldChange(index, field.key, e.target.value)
              }
              disabled={!canEdit}
            />
          </div>
          {canEdit && (
            <button
              type="button"
              className="btn-icon-remove small"
              onClick={() => removeField(index)}
              title="Remove Field"
            >
              &times;
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default CustomFieldsEditor;
