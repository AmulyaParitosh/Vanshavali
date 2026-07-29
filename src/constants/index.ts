export const APP_CONFIG = {
  NAME: "Vanshavali",
};

/**
 * Tree roles — scoped to a single tree (live on TreeMembership). The legacy
 * global pending/denied/admin roles are gone; first-sign-in users auto-get
 * their own tree as owner, no approval gate.
 */
export const TREE_ROLES = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type TreeRoleValue = (typeof TREE_ROLES)[keyof typeof TREE_ROLES];

/** Roles assignable via invitation — owner is created, not invited. */
export const INVITABLE_ROLES: readonly TreeRoleValue[] = [TREE_ROLES.EDITOR, TREE_ROLES.VIEWER];

/** Any role that can read tree data. */
export const ROLES_WITH_TREE_ACCESS: readonly TreeRoleValue[] = [
  TREE_ROLES.VIEWER,
  TREE_ROLES.EDITOR,
  TREE_ROLES.OWNER,
];

/** Roles that can mutate tree data. */
export const ROLES_WITH_EDIT_ACCESS: readonly TreeRoleValue[] = [
  TREE_ROLES.EDITOR,
  TREE_ROLES.OWNER,
];

/** Roles with member-management + delete-tree powers (owner only for v1). */
export const ROLES_WITH_OWNER_PRIVILEGES: readonly TreeRoleValue[] = [TREE_ROLES.OWNER];

export const SUGGESTION_STATUS = {
  UNREAD: "unread",
  READ: "read",
  ARCHIVED: "archived",
  PRIORITIZED: "prioritized",
} as const;

export const TREE_CONFIG = {
  // d3.tree nodeSize — the layout grid each node/couple is allotted. Spec 05 g6:
  // generation rows sit at y = GEN_TOP + n × NODE_HEIGHT (24, 246, 468, 690…).
  NODE_WIDTH: 230,
  NODE_HEIGHT: 222,
  GEN_TOP: 24,
  // §07: portrait = 78px painted-ring art box → 58px circle (radius 29), 3px ring.
  NODE_RADIUS: 29,
  ART_BOX: 78,
  // Half-distance between the two portraits of a couple, so their art boxes sit
  // side by side (nearly touching) inside one pill.
  PARTNER_OFFSET: 40,
  // The household pill behind the portrait(s).
  PILL: {
    // Couple: one rounded pill wrapping both portraits (radius 26).
    COUPLE_WIDTH: 170,
    COUPLE_HEIGHT: 90,
    COUPLE_RADIUS: 26,
    // Single: a 90px circle (radius 45).
    SINGLE_RADIUS: 45,
  },
  // Still used by the not-yet-redesigned family editor + search rows. The tree
  // node itself now renders tint + initials (PersonAvatar), not this.
  PLACEHOLDER_IMAGE_URL: (color: string, text: string) =>
    `https://placehold.co/100x100/${color}/FFFFFF?text=${text}`,
};

export const UI_CONFIG = {
  MESSAGES: {
    BUILDING_HIERARCHY: "Building hierarchy...",
    DATA_ISSUES_DETECTED: "Data Issues Detect (Check Console)",
  },
  Z_INDEX: {
    OVERLAY: 1000,
  },
  COLORS: {
    ERROR_BG_LIGHT: "rgba(255, 0, 0, 0.1)",
  },
  STYLES: {
    TEXT: {
      FONT_SIZE: "10px",
    },
  },
};
