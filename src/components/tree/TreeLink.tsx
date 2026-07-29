import React from "react";

interface TreeLinkProps {
  d: string | null;
}

/**
 * One parent→child edge — an orthogonal lineage thread (Spec 05 g7), never a
 * bezier. The `d` attribute is computed by the layout's `linkPath()` generator so
 * this stays a thin presentational component.
 */
const TreeLink: React.FC<TreeLinkProps> = ({ d }) => {
  if (!d) return null;
  return <path className="link" d={d} />;
};

export default TreeLink;
