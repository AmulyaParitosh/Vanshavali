import React from "react";
import type { Person } from "../types/person";
import type { Family } from "../types/family";
import { portraitTint, personInitials } from "../utils/portrait";
import { inferHusbandWife } from "../lib/family";

type SearchItemProps =
  | { type: "person"; item: Person }
  | { type: "family"; item: Family; people: Person[] };

/**
 * One row in the People list. Portraits use the same local tint + initials tile
 * as the rest of the product (§01): a person without a photograph is never a
 * network request to a third party, and never a gendered letter.
 */
function Portrait({ person, className }: { person: Person | undefined; className: string }) {
  if (person?.image_url) {
    return <img src={person.image_url} alt="" className={className} />;
  }
  return (
    <span
      className={className}
      style={person ? { background: portraitTint(person.id) } : undefined}
      aria-hidden="true"
    >
      {person ? personInitials(person.name.official_name) : ""}
    </span>
  );
}

const SearchItem: React.FC<SearchItemProps> = (props) => {
  if (props.type === "person") {
    const person = props.item;
    return (
      <div className="search-item">
        <div className="search-item-image-container">
          <Portrait person={person} className="search-item-image" />
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
        <Portrait person={husband} className="search-item-image husband" />
        <Portrait person={wife} className="search-item-image wife" />
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
