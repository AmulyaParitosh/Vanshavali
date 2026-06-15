import React, { useState, useMemo } from "react";
import type { Person } from "../types/person";
import UnifiedSearch from "./UnifiedSearch";
import SearchItem from "./SearchItem";

interface TreeSearchProps {
  people: Person[];
  onSelectPerson: (person: Person) => void;
}

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
      .slice(0, 5);
  }, [people, searchTerm]);

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        width: "300px",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(4px)",
          borderRadius: "var(--border-radius-lg)",
          padding: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          border: "1px solid #e0e0e0",
        }}
      >
        <UnifiedSearch
          onSearch={(q) => {
            setSearchTerm(q);
            setIsOpen(true);
          }}
          placeholder="Search person or alias..."
          initialValue={searchTerm}
        />
      </div>

      {isOpen && filteredPeople.length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "var(--border-radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            border: "1px solid #e0e0e0",
            overflow: "hidden",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {filteredPeople.map((person) => (
            <div
              key={person.id}
              onClick={() => {
                onSelectPerson(person);
                setIsOpen(false);
                setSearchTerm("");
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderBottom: "1px solid #f0f0f0",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f7fa")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              <SearchItem type="person" item={person} />
            </div>
          ))}
        </div>
      )}

      {isOpen && searchTerm.trim() && filteredPeople.length === 0 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "var(--border-radius-md)",
            padding: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            border: "1px solid #e0e0e0",
            fontSize: "14px",
            color: "#666",
            textAlign: "center",
          }}
        >
          No results found
        </div>
      )}
    </div>
  );
};

export default TreeSearch;
