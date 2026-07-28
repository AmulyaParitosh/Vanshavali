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
  NODE_WIDTH: 500,
  NODE_HEIGHT: 300,
  NODE_RADIUS: 50,
  PARTNER_OFFSET: 45,
  DETAILS_CARD: {
    WIDTH: 280,
    HEIGHT: 300,
  },
  STYLES: {
    // Node visuals otherwise live in globals.css; this is the one value the
    // SVG needs programmatically (PersonAvatar's circle fill).
    COLORS: {
      FILL: "var(--color-bg)",
    },
  },
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

/**
 * Collection layout used by the LocalDataProvider unit-test double (the JSON
 * runtime mode was retired; these names shape the in-memory store the tests
 * stub):
 *
 *   global collections (no tree scope):  users, trees, suggestions
 *   per-tree collections:                people, families, members, invites
 */
export const LOCAL_DATA_CONFIG = {
  GLOBAL_COLLECTIONS: {
    USERS: "users",
    TREES: "trees",
    SUGGESTIONS: "suggestions",
  },
  TREE_COLLECTIONS: {
    PEOPLE: "people",
    FAMILIES: "families",
    MEMBERS: "members",
    INVITES: "invites",
  },
  POLLING_INTERVAL: 5000,
};
