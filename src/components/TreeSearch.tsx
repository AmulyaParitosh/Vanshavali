"use client";

import React, { useState, useMemo } from "react";
import type { Person } from "../types/person";
import UnifiedSearch from "./UnifiedSearch";
import SearchItem from "./SearchItem";

interface TreeSearchProps {
  people: Person[];
  onSelectPerson: (person: Person) => void;
}

/**
 * Floating search over the tree visualization. Uses the shared `.search-dropdown`
 * styling so the dropdown matches the one in PersonSearch instead of carrying
 * its own glassmorphic variant.
 */
const TreeSearch: React.FC<TreeSearchProps> = ({ people, onSelectPerson }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredPeople = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return people
      .filter((person) => {
        const nameMatch = person.name.official_name.toLowerCase().includes(term);
        const aliasMatch = person.name.aliases?.some((alias) => alias.toLowerCase().includes(term));
        return nameMatch || aliasMatch;
      })
      .slice(0, 8);
  }, [people, searchTerm]);

  const handleSelect = (person: Person) => {
    onSelectPerson(person);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="tree-search">
      <UnifiedSearch
        onSearch={(q) => {
          setSearchTerm(q);
          setIsOpen(true);
        }}
        placeholder="Search person or alias..."
        initialValue={searchTerm}
      />

      {isOpen && filteredPeople.length > 0 && (
        <ul className="search-dropdown" role="listbox">
          {filteredPeople.map((person) => (
            <li
              key={person.id}
              className="search-dropdown-item"
              role="option"
              aria-selected="false"
              onClick={() => handleSelect(person)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(person);
                }
              }}
              tabIndex={0}
            >
              <SearchItem type="person" item={person} />
            </li>
          ))}
        </ul>
      )}

      {isOpen && searchTerm.trim() && filteredPeople.length === 0 && (
        <div className="search-dropdown search-dropdown-empty">No results found</div>
      )}
    </div>
  );
};

export default TreeSearch;
