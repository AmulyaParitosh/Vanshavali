import React from "react";
import type { LaidOutLink } from "./useTreeLayout";

interface TreeLinkProps {
  link: LaidOutLink;
  d: string | null;
}

/**
 * One parent→child edge rendered as a vertical cubic-Bezier path. The `d`
 * attribute is computed by the layout's `linkPath()` generator at the parent
 * level so this stays a thin presentational component.
 */
const TreeLink: React.FC<TreeLinkProps> = ({ d }) => {
  if (!d) return null;
  return <path className="link" d={d} />;
};

export default TreeLink;
