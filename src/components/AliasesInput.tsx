import React, { useState } from "react";

interface AliasesInputProps {
  aliases: string[];
  onChange: (aliases: string[]) => void;
  canEdit: boolean;
}

const AliasesInput: React.FC<AliasesInputProps> = ({ aliases, onChange, canEdit }) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newAliases = [...(aliases || []), inputValue.trim()];
      onChange(newAliases);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && aliases.length > 0) {
      // Remove last alias if input is empty and user hits backspace
      const newAliases = aliases.slice(0, -1);
      onChange(newAliases);
    }
  };

  const removeAlias = (aliasToRemove: string) => {
    const newAliases = aliases.filter((alias) => alias !== aliasToRemove);
    onChange(newAliases);
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="aliases-input-container" onClick={handleContainerClick}>
      {(aliases || []).map((alias, index) => (
        <div key={index} className="alias-tag">
          {alias}
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAlias(alias);
              }}
              className="btn-icon-remove small"
              aria-label={`Remove alias ${alias}`}
              title={`Remove alias ${alias}`}
            >
              &times;
            </button>
          )}
        </div>
      ))}
      {canEdit && (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={aliases?.length === 0 ? "Add alias..." : ""}
          className="alias-input-field"
          disabled={!canEdit}
        />
      )}
    </div>
  );
};

export default AliasesInput;
