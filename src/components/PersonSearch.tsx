import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Person } from '../types/person';
import UnifiedSearch from './UnifiedSearch';
import SearchItem from './SearchItem';

interface PersonSearchProps {
  people: Person[];
  selectedPersonId?: string;
  onSelect: (personId: string) => void;
  placeholder?: string;
  filterSex?: 'M' | 'F';
  disabled?: boolean;
  excludeIds?: string[];
}

const PersonSearch: React.FC<PersonSearchProps> = ({ 
  people, 
  selectedPersonId, 
  onSelect, 
  placeholder = "Search for a person...",
  filterSex,
  disabled = false,
  excludeIds = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPerson = useMemo(() => 
    people.find(p => p.id === selectedPersonId), 
    [people, selectedPersonId]
  );

  useEffect(() => {
      if (!isOpen) {
          setSearchTerm(selectedPerson?.name.official_name || '');
      }
  }, [selectedPerson, isOpen]);

  const filteredPeople = useMemo(() => {
    if (!isOpen) return [];
    
    // If search term is empty, we could show recently selected or nothing. 
    // The user said "starts typing", so let's only show if there is a term or if we want to show all filtered by sex when empty.
    // Let's show all available if term is empty but dropdown is open.
    const term = searchTerm.toLowerCase();
    
    return people.filter(person => {
      if (filterSex && person.sex !== filterSex) return false;
      if (excludeIds.includes(person.id)) return false;
      
      if (!term) return true; // Show all if no term but open

      const nameMatch = person.name.official_name.toLowerCase().includes(term);
      const aliasMatch = person.name.aliases?.some(alias => 
        alias.toLowerCase().includes(term)
      );
      return nameMatch || aliasMatch;
    }).slice(0, 50); // Show more results in the dropdown
  }, [people, searchTerm, filterSex, isOpen, excludeIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="person-search-container" style={{ position: 'relative', width: '100%' }}>
      <UnifiedSearch
        onSearch={(q) => {
          setSearchTerm(q);
          setIsOpen(true);
        }}
        placeholder={placeholder}
        initialValue={searchTerm}
        className={disabled ? 'disabled' : ''}
      />
      
      {isOpen && (
        <div className="search-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-sm)',
          boxShadow: 'var(--shadow-strong)',
          border: '1px solid var(--color-node-border)',
          zIndex: 100,
          marginTop: '4px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {filteredPeople.length > 0 ? (
            filteredPeople.map(person => (
              <div
                key={person.id}
                onClick={() => {
                  onSelect(person.id);
                  setIsOpen(false);
                  setSearchTerm(person.name.official_name);
                }}
                className="search-dropdown-item"
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  transition: 'background 0.2s',
                  backgroundColor: person.id === selectedPersonId ? 'var(--color-primary-light)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                    if (person.id !== selectedPersonId) {
                        e.currentTarget.style.backgroundColor = '#f5f7fa';
                    }
                }}
                onMouseLeave={(e) => {
                    if (person.id !== selectedPersonId) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                }}
              >
                <SearchItem type="person" item={person} />
              </div>
            ))
          ) : (
            <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PersonSearch;
