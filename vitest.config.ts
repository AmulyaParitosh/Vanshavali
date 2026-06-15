import { defineConfig } from "vitest/config";

/**
 * Vitest configuration.
 *
 * Tests live next to their source as `*.test.ts` (pure logic, no DOM). Node
 * environment is the default since the audited test scope — graph logic,
 * provider implementations, helpers — has no browser dependency.
 *
 * When component tests land (deferred — see DESIGN-LANGUAGE.md), they'll go
 * under a separate `environment: 'jsdom'` entry; we'll add that then rather
 * than paying the jsdom cost on every unit-test run.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "db/**/*.test.ts"],
    exclude: ["node_modules", ".next", "src/**/*.test.tsx"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/utils/**/*.ts", "src/services/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/types.ts"],
    },
  },
});
