import { test, expect } from "@playwright/test";
import { SEED, treeRoute } from "./fixtures";

/**
 * Tree Canvas — the household card. A couple is one card with two rows and a
 * seam (never two loose people); the portrait ring carries born-in (red) vs
 * married-in (marigold); the spine turns marigold where the family name changes
 * (a daughter's house); the viewer's own row reads "· you".
 */

const row = (page: import("@playwright/test").Page, id: string) =>
  page.locator(`.hcard-row[data-id="${id}"]`);
const card = (page: import("@playwright/test").Page, id: string) =>
  page.locator(`.hcard:has([data-id="${id}"])`);

test.describe("Tree canvas — the household card", () => {
  test("a couple is one card with two rows, not two loose people (a5)", async ({ page }) => {
    await page.goto(treeRoute());
    const couple = card(page, SEED.people.you.id);
    await expect(couple).toHaveCount(1);
    await expect(couple.locator(".hcard-row")).toHaveCount(2);
    // …and the spouse sits in the same card, below the head.
    await expect(couple.locator(`.hcard-row[data-id="${SEED.people.wife.id}"]`)).toHaveCount(1);
  });

  test("tapping a row opens the record in place; Esc closes it", async ({ page }) => {
    await page.goto(treeRoute());
    await row(page, SEED.people.son.id).click();
    await expect(page.locator(".inspector-name")).toHaveText("Arjun Verma");
    expect(new URL(page.url()).pathname).toBe(treeRoute());
    await page.keyboard.press("Escape");
    await expect(page.locator(".inspector")).toHaveCount(0);
  });

  test("the portrait ring reflects born-in vs married-in (a3)", async ({ page }) => {
    await page.goto(treeRoute());
    // Ishaan is the root (born into this line) → red ring.
    const ishaan = row(page, SEED.people.you.id).locator(".hcard-portrait");
    await expect(ishaan).toHaveClass(/hcard-portrait--born/);
    await expect(ishaan).toHaveCSS("border-top-color", "rgb(178, 34, 34)");
    // Meera married into the Verma line → marigold ring.
    const meera = row(page, SEED.people.wife.id).locator(".hcard-portrait");
    await expect(meera).toHaveClass(/hcard-portrait--married/);
    await expect(meera).toHaveCSS("border-top-color", "rgb(255, 140, 0)");
  });

  test("the spine turns marigold where the name changes — a daughter's house", async ({ page }) => {
    await page.goto(treeRoute());
    // Arjun (a son) carries the name on → red spine.
    await expect(card(page, SEED.people.son.id)).toHaveClass(/hcard--born/);
    // Sara (a daughter) — her children take the husband's name → marigold spine.
    await expect(card(page, SEED.people.daughter.id)).toHaveClass(/hcard--married/);
  });

  test("the viewer's own row reads '· you' in red", async ({ page }) => {
    await page.goto(treeRoute());
    const you = row(page, SEED.people.you.id).locator(".hcard-years--you");
    await expect(you).toContainText("you");
    await expect(you).toHaveCSS("color", "rgb(178, 34, 34)");
    // Nobody else carries the marker.
    await expect(row(page, SEED.people.wife.id).locator(".hcard-years--you")).toHaveCount(0);
  });

  test("the legend names both ring meanings (g9)", async ({ page }) => {
    await page.goto(treeRoute());
    const legend = page.locator(".tree-legend");
    await expect(legend).toContainText("born into this line");
    await expect(legend).toContainText("married in");
  });

  test("the rail lists generations, each jumping the canvas (Spec 05 g8/a7)", async ({ page }) => {
    await page.goto(treeRoute());
    const genjump = page.locator(".tree-genjump");
    // Seed spans two generations: I (Ishaan + Meera) and II (their children).
    await expect(genjump.locator(".tree-genjump-row")).toHaveCount(2);
    await expect(genjump.locator(".tree-genjump-numeral").first()).toHaveText("I");
    await expect(genjump.locator(".tree-genjump-numeral").nth(1)).toHaveText("II");
    // Keyboard-operable: each row is a focusable button; Enter jumps the canvas
    // without a route change.
    await genjump.locator(".tree-genjump-row").nth(1).focus();
    await expect(genjump.locator(".tree-genjump-row").nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".tree-canvas")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(treeRoute());
  });

  test("the rail attention filter dims non-matching households, never hides them (a8)", async ({
    page,
  }) => {
    await page.goto(treeRoute());
    await page.locator(".rail-checklist-dismiss").click();
    await expect(page.locator(".rail-attention-row")).toHaveCount(3);
    const total = await page.locator(".node-wrap").count();

    await page.getByRole("button", { name: /No account linked/ }).click();
    // Nothing is removed — every household stays on the canvas (a8).
    await expect(page.locator(".node-wrap")).toHaveCount(total);
    // The root couple (both accounts linked) has no issue → dimmed; a child with
    // no account stays full.
    await expect(page.locator(`.node-wrap:has([data-id="${SEED.people.you.id}"])`)).toHaveClass(
      /dimmed/
    );
    await expect(page.locator(`.node-wrap:has([data-id="${SEED.people.son.id}"])`)).not.toHaveClass(
      /dimmed/
    );

    // Clicking the same filter again clears it.
    await page.getByRole("button", { name: /No account linked/ }).click();
    await expect(page.locator(".node-wrap.dimmed")).toHaveCount(0);
  });

  test("the canvas controls offer Fit and zoom (g10)", async ({ page }) => {
    await page.goto(treeRoute());
    const controls = page.locator(".tree-controls");
    await expect(controls.getByRole("button", { name: "Fit" })).toBeVisible();
    await expect(controls.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await expect(controls.getByRole("button", { name: "Zoom out" })).toBeVisible();
    await controls.getByRole("button", { name: "Fit" }).click();
    await expect(page.locator(".tree-canvas")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(treeRoute());
  });
});
