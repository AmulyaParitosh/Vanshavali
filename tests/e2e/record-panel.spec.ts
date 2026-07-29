import { test, expect } from "@playwright/test";
import { SEED, treeRoute } from "./fixtures";

/**
 * Spec 07 — record panel. Read mode (sub-unit A); the access block, edit-in-place
 * and write footer follow. Acceptance covered here: a2 (opening never changes the
 * route), a7 (prose names are working links that swap the panel in place), plus
 * the relation-to-viewer reading from the record's sex (a10).
 */

const you = SEED.people.you.id;
const son = SEED.people.son.id;

test.describe("Record panel — read mode (Spec 07)", () => {
  test("opening a record never changes the route (a2)", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".inspector")).toBeVisible();
    // The path is the tree canvas — no /person/ route of its own.
    expect(new URL(page.url()).pathname).toBe(treeRoute());
  });

  test("every name in the prose lineage is a link that swaps the panel in place (a7)", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".inspector-name")).toHaveText("Ishaan Verma");
    await page.locator(".prose-link", { hasText: "Arjun Verma" }).click();
    await expect(page.locator(".inspector-name")).toHaveText("Arjun Verma");
    // Swapped in place: still the tree route, no navigation.
    expect(new URL(page.url()).pathname).toBe(treeRoute());
  });

  test("the relation to the viewer reads from the record's sex, never hard-coded (a10)", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".inspector-relation-line")).toHaveText("this is you");
    await page.goto(`${treeRoute()}?person=${son}`);
    await expect(page.locator(".inspector-relation-line")).toHaveText("your son");
  });

  test("the header carries the generation·line eyebrow and the record name", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".inspector .eyebrow").first()).toHaveText(
      "Generation I · Verma line"
    );
    await expect(page.locator(".inspector-name")).toHaveText("Ishaan Verma");
    await expect(page.locator(".inspector-prose")).toContainText("Married Meera Verma");
  });
});
