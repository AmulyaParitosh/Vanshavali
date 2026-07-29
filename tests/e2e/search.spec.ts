import { test, expect } from "@playwright/test";
import { treeRoute } from "./fixtures";

/**
 * Spec 09 — the ⌘K search palette. Every person result carries their relation to
 * the viewer (a3, the headline), and an empty query suggests nothing (a9).
 */

async function openSearch(page: import("@playwright/test").Page) {
  await page.goto(treeRoute());
  await page.locator(".chrome-search").click();
  await expect(page.locator(".cmdk-panel")).toBeVisible();
}

test.describe("Search palette (Spec 09)", () => {
  test("an empty query suggests nothing (a9)", async ({ page }) => {
    await openSearch(page);
    // Input + footer only — no result rows on an empty query.
    await expect(page.locator(".cmdk-row")).toHaveCount(0);
  });

  test("every person result shows their relation to the viewer (a3)", async ({ page }) => {
    await openSearch(page);
    await page.locator(".cmdk-panel input").fill("Verma"); // matches the whole family
    const rel = (name: string) =>
      page.locator(".cmdk-row", { hasText: name }).locator(".cmdk-row-relation");
    // Viewer is Ishaan (the seed keeper).
    await expect(rel("Ishaan Verma")).toHaveText("you");
    await expect(rel("Arjun Verma")).toHaveText("son");
    await expect(rel("Sara Verma")).toHaveText("daughter");
  });
});
