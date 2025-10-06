import React, { useState } from 'react';

const AliasesInput = ({ aliases, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newAliases = [...(aliases || []), inputValue.trim()];
      onChange(newAliases);
      setInputValue('');
    }
  };

  const removeAlias = (aliasToRemove) => {
    const newAliases = aliases.filter(alias => alias !== aliasToRemove);
    onChange(newAliases);
  };

  return (
    <div className="aliases-input-container">
      <div className="aliases-tags">
        {(aliases || []).map((alias, index) => (
          <div key={index} className="alias-tag">
            {alias}
            <button type="button" onClick={() => removeAlias(alias)} className="remove-tag-btn">
              &times;
            </button>
          </div>
        ))}
         <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Add alias and press Enter..."
            className="alias-input-field"
        />
      </div>
    </div>
  );
};

export default AliasesInput;
