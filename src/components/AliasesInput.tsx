import React, { useState } from "react";

interface AliasesInputProps {
  aliases: string[];
  onChange: (aliases: string[]) => void;
  canEdit: boolean;
}

const AliasesInput: React.FC<AliasesInputProps> = ({ aliases, onChange, canEdit }) => {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newAliases = [...(aliases || []), inputValue.trim()];
      onChange(newAliases);
      setInputValue("");
    }
  };

  const removeAlias = (aliasToRemove: string) => {
    const newAliases = aliases.filter((alias) => alias !== aliasToRemove);
    onChange(newAliases);
  };

  return (
    <div className="aliases-input-container">
      <div className="aliases-tags">
        {(aliases || []).map((alias, index) => (
          <div key={index} className="alias-tag">
            {alias}
            {canEdit && (
              <button
                type="button"
                onClick={() => removeAlias(alias)}
                className="remove-tag-btn"
              >
                &times;
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Add alias and press Enter..."
            className="alias-input-field"
            disabled={!canEdit}
          />
        )}
      </div>
    </div>
  );
};

export default AliasesInput;
