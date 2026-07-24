"use client";

import React from "react";
import Link from "next/link";

interface EmptyTreeBannerProps {
  treeId: string;
}

/**
 * Hint shown over the tree when only the root person exists. Floating banner
 * at the bottom — doesn't block interaction, just nudges the user toward the
 * next concrete action.
 */
const EmptyTreeBanner: React.FC<EmptyTreeBannerProps> = ({ treeId }) => {
  return (
    <div className="empty-tree-banner" role="status" aria-live="polite">
      <div className="empty-tree-banner-content">
        <strong>Your tree is just you so far.</strong>
        <span>
          Add your parents or children to start growing it. Or invite relatives so you can build it
          together.
        </span>
      </div>
      <div className="empty-tree-banner-actions">
        <Link href={`/tree/${treeId}/people`} className="btn btn-primary btn-sm">
          Add a person
        </Link>
        <Link href={`/tree/${treeId}/members`} className="btn btn-secondary btn-sm">
          Invite
        </Link>
      </div>
    </div>
  );
};

export default EmptyTreeBanner;
