import React from "react";
import Link from "next/link";
import type { Person } from "../../types/person";

interface DetailsCardProps {
  person: Person;
  canEdit: boolean;
  /** Active treeId — used to build the EDIT INFO link to the scoped people page. */
  treeId: string | null;
}

/**
 * The popup rendered next to each node showing rich detail. React-rendered
 * inside a <foreignObject> — every interpolation auto-escapes, closing the
 * stored-XSS root cause that the imperative `.html(string)` rendering had.
 */
const DetailsCard: React.FC<DetailsCardProps> = ({ person, canEdit, treeId }) => {
  const aliases = person.name.aliases?.filter((a) => a.trim().length > 0) ?? [];
  const events = person.events ?? [];
  const customFields = person.custom_fields
    ? Object.entries(person.custom_fields).filter(([, value]) => value)
    : [];

  return (
    <div className="details-card">
      <h3>{person.name.official_name}</h3>
      {aliases.length > 0 && <div className="aliases">{aliases.join(", ")}</div>}
      {events.map((event, i) => (
        <div key={`${event.type}-${i}`} className="event">
          <strong>{event.type}:</strong> {event.date}
          {event.place && (
            <>
              <br />
              <em>{event.place}</em>
            </>
          )}
        </div>
      ))}
      {customFields.map(([key, value]) => (
        <div key={key} className="custom-field">
          <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}
        </div>
      ))}
      {canEdit && treeId && (
        <div className="card-actions">
          <Link
            href={`/tree/${treeId}/people?id=${encodeURIComponent(person.id)}`}
            className="btn-edit-card"
          >
            EDIT INFO
          </Link>
        </div>
      )}
    </div>
  );
};

export default DetailsCard;
