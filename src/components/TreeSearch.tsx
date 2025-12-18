import React, { useState, useMemo } from 'react';
import type { Person } from '../types/person';

interface TreeSearchProps {
  people: Person[];
  onSelectPerson: (person: Person) => void;
}

const TreeSearch: React.FC<TreeSearchProps> = ({ people, onSelectPerson }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredPeople = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return people.filter(person => {
      const nameMatch = person.name.official_name.toLowerCase().includes(term);
      const aliasMatch = person.name.aliases?.some(alias => 
        alias.toLowerCase().includes(term)
      );
      return nameMatch || aliasMatch;
    }).slice(0, 5);
  }, [people, searchTerm]);

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 1001,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      width: '300px'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(4px)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ color: '#666' }}
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          placeholder="Search person or alias..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            width: '100%',
            fontSize: '14px',
            color: '#333'
          }}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              fontSize: '18px',
              padding: '0 4px'
            }}
          >
            ×
          </button>
        )}
      </div>

      {isOpen && filteredPeople.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          border: '1px solid #e0e0e0',
          overflow: 'hidden',
          maxHeight: '240px',
          overflowY: 'auto'
        }}>
          {filteredPeople.map(person => (
            <div
              key={person.id}
              onClick={() => {
                onSelectPerson(person);
                setIsOpen(false);
                setSearchTerm('');
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                transition: 'background 0.2s',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f7fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <span style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a' }}>
                {person.name.official_name}
              </span>
              {person.name.aliases && person.name.aliases.length > 0 && (
                <span style={{ fontSize: '12px', color: '#666' }}>
                  AKA: {person.name.aliases.join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && searchTerm.trim() && filteredPeople.length === 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          border: '1px solid #e0e0e0',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center'
        }}>
          No results found
        </div>
      )}
    </div>
  );
};

export default TreeSearch;
