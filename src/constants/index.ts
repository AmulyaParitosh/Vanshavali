export const APP_CONFIG = {
  NAME: "Vanshavali",
};

export const USER_ROLES = {
  ADMIN: "admin",
  PENDING: "pending",
  DENIED: "denied",
};

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
