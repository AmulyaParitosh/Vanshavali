import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest configuration.
 *
 * Tests live under `tests/`, mirroring the `src/` layout, and import the code
 * under test via the `@/*` → `src/*` alias (also declared in tsconfig.json), so
 * an import doesn't depend on how deeply a test is nested. Node environment —
 * the current test scope (graph logic, provider implementations, helpers) has
 * no browser dependency.
 *
 * When component tests land (deferred — see DESIGN-LANGUAGE.md), they'll go
 * under a separate `environment: 'jsdom'` entry rather than paying the jsdom
 * cost on every unit-test run.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/utils/**/*.ts", "src/services/**/*.ts"],
      exclude: ["tests/**", "src/**/types.ts"],
    },
  },
});
