import React from "react";
import type { CardModel, CardRow } from "./cardModel";
import { portraitTint, personInitials } from "../../utils/portrait";

interface HouseholdCardProps {
  model: CardModel;
  /** The id of the person whose record is open, if it is one of this card's rows. */
  selectedId: string | null;
  onSelect: (personId: string) => void;
}

/**
 * One household on the canvas (Tree Canvas spec — the card is the only atom). A
 * left descent spine, then one row per person: a ringed portrait, the name, and
 * the year line. A couple is two rows sharing one card with a dashed seam and a
 * half-step-warmer spouse row — one object with a seam, never two cards.
 *
 * Rendered as HTML inside a <foreignObject> (the codebase's canvas convention),
 * so names are auto-escaped. Each row is its own hit target: clicking a row opens
 * that person's record; the card takes the selected treatment when either row is.
 */
const HouseholdCard: React.FC<HouseholdCardProps> = ({ model, selectedId, onSelect }) => {
  const selected = model.rows.some((r) => r.person.id === selectedId);
  return (
    <div className={`hcard hcard--${model.spine}${selected ? " is-selected" : ""}`}>
      <span className="hcard-spine" aria-hidden="true" />
      {model.rows.map((row, i) => (
        <CardRowView
          key={row.person.id}
          row={row}
          spouse={i > 0}
          selected={row.person.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

const CardRowView: React.FC<{
  row: CardRow;
  spouse: boolean;
  selected: boolean;
  onSelect: (personId: string) => void;
}> = ({ row, spouse, selected, onSelect }) => {
  const { person } = row;
  const open = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    onSelect(person.id);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(e);
    }
  };

  const cls = [
    "hcard-row",
    spouse ? "hcard-row--spouse" : "",
    row.deceased ? "is-deceased" : "",
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      data-id={person.id}
      role="button"
      tabIndex={0}
      aria-label={`${person.name.official_name} — open record`}
      aria-pressed={selected}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      <span className={`hcard-portrait hcard-portrait--${row.ring}`}>
        {person.image_url ? (
          <img src={person.image_url} alt="" />
        ) : (
          <span className="hcard-portrait-tint" style={{ background: portraitTint(person.id) }}>
            {personInitials(person.name.official_name)}
          </span>
        )}
      </span>
      <span className="hcard-id">
        <span className="hcard-name">{person.name.official_name}</span>
        {(row.years || row.isSelf) && (
          <span className={`hcard-years${row.isSelf ? " hcard-years--you" : ""}`}>
            {[row.years || null, row.isSelf ? "you" : null].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
    </div>
  );
};

export default HouseholdCard;
