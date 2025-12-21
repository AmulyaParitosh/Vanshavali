import React from 'react';
import type { Person } from '../types/person';
import type { Family } from '../types/family';
import { stringToColor, getNameInitials } from '../utils/colorUtils';
import { TREE_CONFIG } from '../constants';

interface SearchItemProps {
  type: 'person' | 'family';
  item: any; // Can be Person or Family
  people?: Person[]; // Needed for family to find names/images
  onClick?: () => void;
}

const SearchItem: React.FC<SearchItemProps> = ({ type, item, people = [], onClick }) => {
  const getPlaceholderUrl = (person: Person) => {
    return TREE_CONFIG.PLACEHOLDER_IMAGE_URL(
      stringToColor(person.id || person.name.official_name).substring(1),
      getNameInitials(person.name.official_name)
    );
  };

  if (type === 'person') {
    const person = item as Person;
    return (
      <div className="search-item" onClick={onClick}>
        <div className="search-item-image-container">
          <img 
            src={person.image_url || getPlaceholderUrl(person)} 
            alt={person.name.official_name} 
            className="search-item-image"
          />
        </div>
        <div className="search-item-content">
          <span className="search-item-name">{person.name.official_name}</span>
          {person.name.aliases && person.name.aliases.length > 0 && (
            <span className="search-item-subtext">
              AKA: {person.name.aliases.join(', ')}
            </span>
          )}
          {person.userId && (
            <span className="linked-badge">Linked</span>
          )}
        </div>
        <style jsx>{`
          .linked-badge {
            display: inline-block;
            margin-top: 4px;
            padding: 1px 6px;
            background: #f3f4f6;
            color: #6b7280;
            border-radius: 4px;
            font-size: 0.7em;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
        `}</style>
      </div>
    );
  }

  if (type === 'family') {
    const family = item as Family;
    const husbandId = family.husband || family.partners?.[0];
    const wifeId = family.wife || family.partners?.[1];

    const husband = people.find(p => p.id === husbandId);
    const wife = people.find(p => p.id === wifeId);

    return (
      <div className="search-item" onClick={onClick}>
        <div className="search-item-family-images">
          <img 
            src={husband?.image_url || (husband ? getPlaceholderUrl(husband) : 'https://via.placeholder.com/40?text=H')} 
            alt={husband?.name.official_name || 'Husband'} 
            className="search-item-image husband"
          />
          <img 
            src={wife?.image_url || (wife ? getPlaceholderUrl(wife) : 'https://via.placeholder.com/40?text=W')} 
            alt={wife?.name.official_name || 'Wife'} 
            className="search-item-image wife"
          />
        </div>
        <div className="search-item-content">
          <span className="search-item-name">
            {husband?.name.official_name || '?'} & {wife?.name.official_name || '?'}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default SearchItem;
