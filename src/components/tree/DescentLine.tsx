"use client";

import React from "react";
import type { Person } from "../../types/person";
import type { DescentGeneration } from "../../lib/lineage";
import { portraitTint, personInitials } from "../../utils/portrait";
import { yearSpan } from "./cardModel";

interface DescentLineProps {
  /** The line, nearest generation first — see {@link buildDescent}. */
  generations: DescentGeneration[];
  /** IDs born into this line: red ring. Everyone else married in: marigold. */
  bornInLine: ReadonlySet<string>;
  onSelect: (personId: string) => void;
}

/**
 * The line of descent at the foot of the record panel (§07): the opened record at
 * the top, then each generation going back, on one unbroken vertical line.
 *
 * One generation is one card — the same atom the canvas draws, for the same
 * reason: a household is one object, never two loose people. The father is the
 * top row and the mother the bottom, so the card says which is which by where
 * they sit and the copy never has to. Between the cards, the descent link runs
 * down the middle in the canvas's joinery colour: the same tree, stood upright.
 *
 * Colour keeps the meaning it has everywhere else — red born into this line,
 * marigold married in — on the portrait rings. Deceased ancestors are *not*
 * dimmed as they are on the canvas: up a line of descent nearly everyone is, and
 * a wholly faded list reads as disabled rather than as history. The year line
 * states it instead.
 */
const DescentLine: React.FC<DescentLineProps> = ({ generations, bornInLine, onSelect }) => (
  <ol className="descent">
    {generations.map((gen) => (
      <li key={`${gen.step}-${gen.carriesId}`} className="descent-gen">
        <div className="descent-card">
          <span className="descent-card-label">{gen.label}</span>
          {gen.people.map((person, row) => (
            <DescentPerson
              key={person.id}
              person={person}
              married={!bornInLine.has(person.id)}
              second={row > 0}
              // The record already open — a marker, not a way back to itself.
              {...(gen.step === 0 ? {} : { onSelect })}
            />
          ))}
        </div>
      </li>
    ))}
  </ol>
);

const DescentPerson: React.FC<{
  person: Person;
  married: boolean;
  /** The card's second row — the mother, under the seam. */
  second: boolean;
  onSelect?: (personId: string) => void;
}> = ({ person, married, second, onSelect }) => {
  const { years } = yearSpan(person);
  const body = (
    <>
      <span
        className={`portrait portrait--descent${married ? " portrait--married" : ""}`}
        style={{ background: portraitTint(person.id) }}
        aria-hidden="true"
      >
        {person.image_url ? (
          <img src={person.image_url} alt="" className="portrait-img" />
        ) : (
          personInitials(person.name.official_name)
        )}
      </span>
      <span className="descent-who">
        <span className="descent-name">{person.name.official_name}</span>
        {years && <span className="descent-years">{years}</span>}
      </span>
    </>
  );
  const className = `descent-person${second ? " descent-person--second" : ""}`;
  return onSelect ? (
    <button type="button" className={className} onClick={() => onSelect(person.id)}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
};

export default DescentLine;
