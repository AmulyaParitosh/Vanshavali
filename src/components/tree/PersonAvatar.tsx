import React from "react";
import type { Person } from "../../types/person";
import { TREE_CONFIG } from "../../constants";

interface PersonAvatarProps {
  person: Person;
  /** Lineage members get the red (born-in) ring; spouses get the marigold (married-in) ring. */
  isLineage: boolean;
}

// The eight portrait tints (§01). Assigned per person from a stable hash of the
// id and never re-picked, so the same face keeps the same colour everywhere.
const TINTS = [
  "var(--tint-1)",
  "var(--tint-2)",
  "var(--tint-3)",
  "var(--tint-4)",
  "var(--tint-5)",
  "var(--tint-6)",
  "var(--tint-7)",
  "var(--tint-8)",
];

function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

/** First one or two graphemes of the primary name — white initials on the tint. */
function initialsOf(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return Array.from(first).slice(0, 2).join("");
}

/**
 * The portrait (§07): a 78px painted Madhubani ring (one of the four heritage
 * surfaces) around a 58px circle. The 3px inner ring carries the meaning —
 * red for born into the line, marigold for married in. A photo fills the circle
 * when present; otherwise white initials sit on the person's tint.
 */
const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, isLineage }) => {
  const { NODE_RADIUS, ART_BOX } = TREE_CONFIG;
  const ring = isLineage ? "var(--ring-born)" : "var(--ring-married)";
  const hasPhoto = !!person.image_url;

  return (
    <>
      {/* Painted ring art — extends beyond the circle. */}
      <image
        href="/node_border.png"
        x={-ART_BOX / 2}
        y={-ART_BOX / 2}
        width={ART_BOX}
        height={ART_BOX}
      />
      {hasPhoto ? (
        <image
          className="person-image"
          href={person.image_url}
          x={-NODE_RADIUS}
          y={-NODE_RADIUS}
          width={NODE_RADIUS * 2}
          height={NODE_RADIUS * 2}
          clipPath={`circle(${NODE_RADIUS}px at center)`}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          <circle r={NODE_RADIUS} style={{ fill: tintFor(person.id) }} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: "15px",
              fontWeight: 600,
              fill: "#fffdf9",
              fontFamily: "var(--font-body)",
            }}
          >
            {initialsOf(person.name.official_name)}
          </text>
        </>
      )}
      {/* Meaning ring. */}
      <circle r={NODE_RADIUS} style={{ fill: "none", stroke: ring, strokeWidth: "3px" }} />
    </>
  );
};

export default PersonAvatar;
