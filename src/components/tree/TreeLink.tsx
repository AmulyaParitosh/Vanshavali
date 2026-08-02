import React from "react";

interface TreeLinkProps {
  d: string | null;
  /** The eldest son's line — inked heavier and darker, the way a panjikar draws the trunk. */
  trunk?: boolean;
}

/**
 * One parent→child edge — an orthogonal lineage thread, never a bezier. The `d`
 * attribute is computed by the layout so this stays a thin presentational
 * component; `trunk` swaps in the heavier main-line stroke.
 */
const TreeLink: React.FC<TreeLinkProps> = ({ d, trunk = false }) => {
  if (!d) return null;
  return <path className={trunk ? "link link--trunk" : "link"} d={d} />;
};

export default TreeLink;
