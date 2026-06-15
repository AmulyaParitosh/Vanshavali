export const APP_CONFIG = {
  NAME: "Vanshavali",
};

export const USER_ROLES = {
  ADMIN: "admin",
  PENDING: "pending",
  DENIED: "denied",
  VIEWER: "viewer",
  EDITOR: "editor",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLES_WITH_TREE_ACCESS: readonly UserRole[] = [
  USER_ROLES.VIEWER,
  USER_ROLES.EDITOR,
  USER_ROLES.ADMIN,
];

export const ROLES_WITH_EDIT_ACCESS: readonly UserRole[] = [
  USER_ROLES.EDITOR,
  USER_ROLES.ADMIN,
];

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
    }
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
    ERROR_BG_LIGHT: 'rgba(255, 0, 0, 0.1)',
  },
  STYLES: {
    TEXT: {
        FONT_SIZE: '10px'
    }
  }
};

export const LOCAL_DATA_CONFIG = {
  DB_DIR: ".local_data/db",
  STORAGE_DIR: ".local_data/storage",
  COLLECTIONS: {
    PEOPLE: "people",
    FAMILIES: "families",
    USERS: "users",
    SUGGESTIONS: "suggestions",
  },
  MOCK_USER: {
    UID: process.env.NEXT_PUBLIC_LOCAL_USER_UID || "local-admin-uid",
  },
  POLLING_INTERVAL: 5000,
};
