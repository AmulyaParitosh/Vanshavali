import React, { useState, useEffect } from 'react';

interface UnifiedSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  initialValue?: string;
  className?: string;
}

const UnifiedSearch: React.FC<UnifiedSearchProps> = ({ 
  placeholder = "Search...", 
  onSearch, 
  initialValue = "",
  className = ""
}) => {
  const [query, setQuery] = useState(initialValue);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onSearch(val);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <div className={`search-input-container ${className}`}>
      <input
        type="text"
        className="unified-search-input"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
      />
      {query ? (
        <button className="clear-search-btn" onClick={handleClear} type="button">
          ×
        </button>
      ) : (
        <span className="search-icon-right">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
      )}
    </div>
  );
};

export default UnifiedSearch;
