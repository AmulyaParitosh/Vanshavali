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

export type SuggestionStatusValue = (typeof SUGGESTION_STATUS)[keyof typeof SUGGESTION_STATUS];

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
    STROKE_WIDTH: {
      LINEAGE: "6px",
      DEFAULT: "4px",
    },
    COLORS: {
      PRIMARY: "var(--color-primary)",
      NODE_BORDER: "var(--color-primary-dark)",
      SPOUSE_BORDER: "var(--color-accent)",
      FILL: "var(--color-bg)",
    },
    TEXT: {
      FONT_SIZE: "12px",
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
 * Local-mode storage layout under `.local_data/db/`:
 *
 *   global collections (no tree scope):
 *     users.json, suggestions.json, trees.json, my_trees_index.json
 *
 *   per-tree collections (under `trees/{treeId}/`):
 *     people.json, families.json, members.json, invites.json
 *
 * The "global" set is keyed at the root; tree-scoped data lives under the
 * `trees/{treeId}/` prefix and is requested with `?tree=<id>&collection=<name>`.
 */
export const LOCAL_DATA_CONFIG = {
  DB_DIR: ".local_data/db",
  STORAGE_DIR: ".local_data/storage",
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
  MOCK_USER: {
    UID: process.env.NEXT_PUBLIC_LOCAL_USER_UID || "local-admin-uid",
  },
  POLLING_INTERVAL: 5000,
};

/** All collection names — used for endpoint allowlisting. */
export const ALL_LOCAL_COLLECTIONS = [
  ...Object.values(LOCAL_DATA_CONFIG.GLOBAL_COLLECTIONS),
  ...Object.values(LOCAL_DATA_CONFIG.TREE_COLLECTIONS),
];
