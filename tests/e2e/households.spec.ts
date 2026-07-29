import { test, expect } from "@playwright/test";
import { treeRoute } from "./fixtures";

/**
 * Spec 08 — Households. H-B covers the list: the column set (Partners · Married ·
 * Children · Gen), generation ordering, the "no marriage date" absence, and a row
 * opening the editor. The editor internals (marriage prose, reorder, delete) are H-C+.
 */

const route = treeRoute("families");

test.describe("Households — the list (Spec 08)", () => {
  test("the table carries the Spec 08 columns", async ({ page }) => {
    await page.goto(route);
    const head = page.locator(".records-thead");
    await expect(head).toContainText("Partners");
    await expect(head).toContainText("Married");
    await expect(head).toContainText("Children");
    await expect(head).toContainText("Gen");
  });

  test("a household reads partners, marriage, children and generation", async ({ page }) => {
    await page.goto(route);
    const row = page.locator(".records-row", { hasText: "Ishaan Verma" });
    await expect(row.locator(".records-name-primary")).toHaveText("Ishaan Verma & Meera Verma");
    // No marriage date recorded in the seed → stated as an absence, not blank.
    await expect(row.locator(".hh-col-married")).toHaveText("no marriage date");
    await expect(row.locator(".hh-col-children")).toContainText("2");
    await expect(row.locator(".hh-col-gen")).toHaveText("I");
  });

  test("clicking a household opens the editor in place", async ({ page }) => {
    await page.goto(route);
    await page.locator(".records-row", { hasText: "Ishaan Verma" }).click();
    await expect(page.locator(".inspector")).toBeVisible();
    await expect(page.locator(".inspector")).toContainText("Children · eldest first");
    expect(new URL(page.url()).pathname).toBe(route);
  });
});
