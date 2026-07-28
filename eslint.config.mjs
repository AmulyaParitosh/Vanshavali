import next from "eslint-config-next";
import nextWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 * Vanshavali ESLint configuration (flat config, ESLint 9).
 *
 * Extends Next.js's bundled configs (React, hooks, jsx-a11y, Next.js rules,
 * TypeScript-ESLint, import) and Prettier's compatibility layer. Overrides
 * target the actual pain points in this codebase rather than chasing every
 * default.
 */
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".local_data/**",
      ".husky/**",
      "build/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
      "db/migrations/**",
      // Supabase CLI artifacts (.temp edge-runtime bundles etc.) — generated,
      // gitignored, but ESLint traverses dot-dirs unless excluded here.
      "supabase/**",
      "**/coverage/**",
    ],
  },

  ...next,
  ...nextWebVitals,
  ...nextTypescript,
  prettier,

  {
    rules: {
      // Existing code has `_` -prefixed unused params (stub providers, callback
      // signatures). Standard ignore convention.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // We've removed all explicit `any` from new code — flag any reintroduction.
      "@typescript-eslint/no-explicit-any": "error",

      // No silent failure suppression. Stays a warning so legitimate logging
      // in catch blocks (while also surfacing to UI) is fine.
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],

      // Raw <img> is needed inside SVG <foreignObject> — Next.js's <Image>
      // doesn't work there. Off for this codebase.
      "@next/next/no-img-element": "off",

      // A11y backlog (audit §10) — warn so they're visible but don't gate
      // commits while we work through Phase 11 design pass.
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",

      // React hooks: rule-of-hooks is non-negotiable; exhaustive-deps stays
      // a warning until every legacy effect is audited.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // react-hooks v7 added `set-state-in-effect` as an error. It catches
      // genuine bugs but also many legitimate patterns (clearing state on
      // user logout, sync state on dep change). Downgraded to warn so it
      // surfaces issues without blocking commits; tighten case-by-case.
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  // The DB tooling scripts run in Node, not the browser — console output is
  // their UI.
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;
