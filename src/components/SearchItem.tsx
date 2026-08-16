import React from "react";
import type { Person } from "../types/person";
import type { Family } from "../types/family";
import { inferHusbandWife } from "../lib/family";
import Portrait from "./Portrait";

type SearchItemProps =
  | { type: "person"; item: Person }
  | { type: "family"; item: Family; people: Person[] };

/**
 * One row in the People list. Faces come from the shared Portrait (§01): the
 * tint-and-initials tile when there is no photograph — never a request to a
 * third party, never a gendered letter — and the small stored copy when there is.
 */
const SearchItem: React.FC<SearchItemProps> = (props) => {
  if (props.type === "person") {
    const person = props.item;
    return (
      <div className="search-item">
        <div className="search-item-image-container">
          <Portrait person={person} size="table" className="search-item-image" />
        </div>
        <div className="search-item-content">
          <span className="search-item-name">{person.name.official_name}</span>
          {person.name.aliases && person.name.aliases.length > 0 && (
            <span className="search-item-subtext">AKA: {person.name.aliases.join(", ")}</span>
          )}
          {person.userId && <span className="chip chip--read linked-badge">Linked</span>}
        </div>
      </div>
    );
  }

  const { item: family, people } = props;
  const { husbandId, wifeId } = inferHusbandWife(family);
  const husband = husbandId ? people.find((p) => p.id === husbandId) : undefined;
  const wife = wifeId ? people.find((p) => p.id === wifeId) : undefined;

  return (
    <div className="search-item">
      <div className="search-item-family-images">
        <Portrait person={husband} size="table" className="search-item-image husband" />
        <Portrait person={wife} size="table" className="search-item-image wife" />
      </div>
      <div className="search-item-content">
        <span className="search-item-name">
          {husband?.name.official_name || "?"} &amp; {wife?.name.official_name || "?"}
        </span>
        <span className="search-item-subtext">
          {family.children.length} {family.children.length === 1 ? "child" : "children"}
        </span>
      </div>
    </div>
  );
};

export default SearchItem;
