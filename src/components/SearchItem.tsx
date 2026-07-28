import React from "react";
import type { Person } from "../types/person";
import type { Family } from "../types/family";
import { getPersonPlaceholderUrl } from "../utils/imageUtils";
import { inferHusbandWife } from "../lib/family";

type SearchItemProps =
  | { type: "person"; item: Person }
  | { type: "family"; item: Family; people: Person[] };

const SearchItem: React.FC<SearchItemProps> = (props) => {
  if (props.type === "person") {
    const person = props.item;
    return (
      <div className="search-item">
        <div className="search-item-image-container">
          <img
            src={person.image_url || getPersonPlaceholderUrl(person)}
            alt={person.name.official_name}
            className="search-item-image"
          />
        </div>
        <div className="search-item-content">
          <span className="search-item-name">{person.name.official_name}</span>
          {person.name.aliases && person.name.aliases.length > 0 && (
            <span className="search-item-subtext">AKA: {person.name.aliases.join(", ")}</span>
          )}
          {person.userId && <span className="linked-badge">Linked</span>}
        </div>
        <style jsx>{`
          .linked-badge {
            display: inline-block;
            margin-top: var(--space-1);
            padding: 1px var(--space-2);
            background: var(--color-neutral-100);
            color: var(--color-neutral-600);
            border-radius: var(--radius-xs);
            font-size: var(--font-size-xs);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
        `}</style>
      </div>
    );
  }

  if (props.type === "family") {
    const { item: family, people } = props;
    const { husbandId, wifeId } = inferHusbandWife(family);
    const husband = husbandId ? people.find((p) => p.id === husbandId) : undefined;
    const wife = wifeId ? people.find((p) => p.id === wifeId) : undefined;

    return (
      <div className="search-item">
        <div className="search-item-family-images">
          <img
            src={
              husband?.image_url ||
              (husband
                ? getPersonPlaceholderUrl(husband)
                : "https://placehold.co/40/cccccc/FFFFFF?text=H")
            }
            alt={husband?.name.official_name || "Husband"}
            className="search-item-image husband"
          />
          <img
            src={
              wife?.image_url ||
              (wife
                ? getPersonPlaceholderUrl(wife)
                : "https://placehold.co/40/cccccc/FFFFFF?text=W")
            }
            alt={wife?.name.official_name || "Wife"}
            className="search-item-image wife"
          />
        </div>
        <div className="search-item-content">
          <span className="search-item-name">
            {husband?.name.official_name || "?"} & {wife?.name.official_name || "?"}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default SearchItem;
