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
  // d3.tree nodeSize — the grid each household card is allotted. Generation rows
  // sit at y = GEN_TOP + n × NODE_HEIGHT; NODE_HEIGHT is the full-detail
  // generation pitch (172) and NODE_WIDTH the card width (208) + sibling gap (20).
  NODE_WIDTH: 228,
  NODE_HEIGHT: 172,
  GEN_TOP: 24,
  // The household card (Tree Canvas spec, full detail): 208px wide, 44px per row
  // (a couple is two rows = 88). Cards are top-aligned in the band, so a single
  // card and a couple share the same top line.
  CARD_WIDTH: 208,
  CARD_ROW_H: 44,
  // The left→right view: generations run across the canvas and siblings stack
  // down, so the pitches swap roles — ROW_PITCH separates siblings vertically
  // (a couple's card is 88 tall) and COL_PITCH is the generation step across.
  ROW_PITCH: 112,
  COL_PITCH: 352,
  GEN_LEFT: 24,
  // Zoom (Tree Canvas spec): continuous 0.18–1.4×, step 1.25×, Fit pads 40px. The
  // level of detail swaps at 0.72 (full → compact) and 0.42 (compact → glyph).
  ZOOM: {
    MIN: 0.18,
    MAX: 1.4,
    STEP: 1.25,
    FIT_PAD: 40,
    LOD_COMPACT: 0.72,
    LOD_GLYPH: 0.42,
  },
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
