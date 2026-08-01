import { test, expect } from "@playwright/test";
import { treeRoute } from "./fixtures";

/**
 * Spec 09 — the ⌘K search palette. Every person result carries their relation to
 * the viewer (a3, the headline), and an empty query suggests nothing (a9).
 */

async function openSearch(page: import("@playwright/test").Page) {
  await page.goto(treeRoute());
  // The top-nav search trigger was removed; open the palette the way the canvas
  // field and ⌘K do — the CommandSearch listens for this event once mounted.
  await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("vanshavali:open-search")));
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

test.describe("Search palette — contract (Spec 09 S-B)", () => {
  test("/ opens search when no field is focused (a1/e5)", async ({ page }) => {
    await page.goto(treeRoute());
    await expect(page.locator(".cmdk-panel")).toHaveCount(0);
    await page.keyboard.press("/");
    await expect(page.locator(".cmdk-panel")).toBeVisible();
  });

  test("the overlay carries the verbatim placeholder + hint copy", async ({ page }) => {
    await openSearch(page);
    await expect(page.locator(".cmdk-panel input")).toHaveAttribute(
      "placeholder",
      "People, places, events"
    );
    const foot = page.locator(".cmdk-foot");
    await expect(foot).toContainText("↑↓ move · ↵ open record · ⌘↵ focus in tree");
    await expect(foot).toContainText("4 people indexed");
  });

  test("the overlay is 640px wide (contract geometry, not the 760 mockup)", async ({ page }) => {
    await openSearch(page);
    const box = await page.locator(".cmdk-panel").boundingBox();
    expect(box && Math.round(box.width)).toBe(640);
  });

  test("no match shows the verbatim empty line, echoing the query in curly quotes", async ({
    page,
  }) => {
    await openSearch(page);
    await page.locator(".cmdk-panel input").fill("zzznobody");
    await expect(page.locator(".cmdk-empty")).toHaveText(
      "Nothing in this record matches “zzznobody”"
    );
  });

  test("a place result counts events by kind (Spec 09 §03)", async ({ page }) => {
    await openSearch(page);
    // Seed: Ishaan's Birth is at Patna, his Marriage at Ranchi.
    await page.locator(".cmdk-panel input").fill("Patna");
    const patna = page.locator(".cmdk-row--place", { hasText: "Patna" });
    await expect(patna.locator(".cmdk-row-sub")).toHaveText("1 birth recorded here");
    await page.locator(".cmdk-panel input").fill("Ranchi");
    const ranchi = page.locator(".cmdk-row--place", { hasText: "Ranchi" });
    await expect(ranchi.locator(".cmdk-row-sub")).toHaveText("1 marriage recorded here");
  });

  test("a place result filters the canvas, never opens a page (a6)", async ({ page }) => {
    await openSearch(page);
    await page.locator(".cmdk-panel input").fill("Patna");
    await page.locator(".cmdk-row--place", { hasText: "Patna" }).click();
    // Still on the canvas route (no page opened), now with the place filter active.
    await expect(page).toHaveURL(/\/tree\/[^/]+\?place=Patna/);
    const chip = page.locator(".tree-place-filter");
    await expect(chip).toContainText("Patna");
    // Ishaan's household (born Patna) is undimmed; someone with no Patna event dims.
    await expect(page.locator(".node-wrap.dimmed").first()).toBeVisible();
    // The chip dismisses, restoring every household.
    await chip.locator(".tree-place-filter-clear").click();
    await expect(page.locator(".tree-place-filter")).toHaveCount(0);
    await expect(page.locator(".node-wrap.dimmed")).toHaveCount(0);
  });

  test("arrow-up from the first result wraps to the last (a5 keyboard)", async ({ page }) => {
    await openSearch(page);
    const input = page.locator(".cmdk-panel input");
    await input.fill("Verma"); // 4 people, first auto-active
    const rows = page.locator(".cmdk-row:not(.cmdk-row--place)");
    await expect(rows).toHaveCount(4);
    await expect(rows.first()).toHaveClass(/active/);
    await input.press("ArrowUp"); // wraps to the last
    await expect(rows.last()).toHaveClass(/active/);
    await input.press("ArrowDown"); // wraps back to the first
    await expect(rows.first()).toHaveClass(/active/);
  });

  test("matching is diacritic-insensitive (a4)", async ({ page }) => {
    await openSearch(page);
    // "Méera" (accented) still finds plain "Meera".
    await page.locator(".cmdk-panel input").fill("Méera");
    await expect(page.locator(".cmdk-row", { hasText: "Meera Verma" })).toBeVisible();
  });

  test("the matched substring is highlighted (§07)", async ({ page }) => {
    await openSearch(page);
    await page.locator(".cmdk-panel input").fill("eer"); // only Meera contains it
    const row = page.locator(".cmdk-row", { hasText: "Meera Verma" });
    await expect(row.locator(".cmdk-highlight")).toHaveText("eer");
  });
});
