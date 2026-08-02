import React from "react";

interface TreeLinkProps {
  d: string | null;
  /** The eldest son's line — inked heavier and darker, the way a panjikar draws the trunk. */
  trunk?: boolean;
  /** Off the lit focus path — dropped back so the path reads through. */
  dim?: boolean;
}

/**
 * One parent→child edge — an orthogonal lineage thread, never a bezier. The `d`
 * attribute is computed by the layout so this stays a thin presentational
 * component; `trunk` swaps in the heavier main-line stroke.
 */
const TreeLink: React.FC<TreeLinkProps> = ({ d, trunk = false, dim = false }) => {
  if (!d) return null;
  const cls = ["link", trunk && "link--trunk", dim && "off-path"].filter(Boolean).join(" ");
  return <path className={cls} d={d} />;
};

export default TreeLink;
