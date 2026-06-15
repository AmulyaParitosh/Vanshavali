import React from "react";
import type { Person } from "../../types/person";
import { TREE_CONFIG } from "../../constants";
import { getPersonPlaceholderUrl } from "../../utils/imageUtils";

interface PersonAvatarProps {
  person: Person;
  /** Lineage members get the primary border; non-lineage spouses get the secondary border. */
  isLineage: boolean;
}

/**
 * The circular avatar — Madhubani-bordered photograph with a colored ring.
 * Decomposed out of PersonNode so PartnerNode can reuse it twice.
 */
const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, isLineage }) => {
  const { NODE_RADIUS, STYLES } = TREE_CONFIG;
  const imageHref = person.image_url || getPersonPlaceholderUrl(person);
  const ringColor = isLineage ? "var(--color-primary)" : "var(--color-secondary)";

  return (
    <>
      {/* Decorative Madhubani border (extends 30% beyond the avatar circle) */}
      <image
        href="/node_border.png"
        x={-NODE_RADIUS * 1.3}
        y={-NODE_RADIUS * 1.3}
        width={NODE_RADIUS * 2.6}
        height={NODE_RADIUS * 2.6}
      />
      <circle r={NODE_RADIUS} style={{ stroke: "none", fill: STYLES.COLORS.FILL }} />
      <image
        className="person-image"
        href={imageHref}
        x={-NODE_RADIUS}
        y={-NODE_RADIUS}
        width={NODE_RADIUS * 2}
        height={NODE_RADIUS * 2}
        clipPath={`circle(${NODE_RADIUS}px at center)`}
      />
      <circle r={NODE_RADIUS} style={{ fill: "none", stroke: ringColor, strokeWidth: "4px" }} />
    </>
  );
};

export default PersonAvatar;
