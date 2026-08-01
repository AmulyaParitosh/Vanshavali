import { test, expect } from "@playwright/test";
import { SEED, treeRoute } from "./fixtures";

/**
 * Spec 05 node visuals (T-B): the lineage ring carries the meaning (red born-in /
 * marigold married-in, a3), the viewer's own node reads "· you", and a couple's
 * right-hand label is offset down so two names never collide (a2).
 */

const node = (page: import("@playwright/test").Page, id: string) =>
  page.locator(`.node[data-id="${id}"]`);

test.describe("Tree canvas — node visuals (Spec 05)", () => {
  test("a couple renders as one pill, not two overlapping circles (a1)", async ({ page }) => {
    await page.goto(treeRoute());
    // The root couple (Ishaan + Meera) is a single partner group…
    const group = page.locator(".partner-group");
    await expect(group).toHaveCount(1);
    // …with exactly one household pill behind both portraits, and two person nodes.
    await expect(group.locator(".node-pill")).toHaveCount(1);
    await expect(group.locator(".node")).toHaveCount(2);
  });

  test("tapping a node opens the record in place; Esc closes it (a5)", async ({ page }) => {
    await page.goto(treeRoute());
    await node(page, SEED.people.son.id).click();
    await expect(page.locator(".inspector-name")).toHaveText("Arjun Verma");
    // Opened without navigating.
    expect(new URL(page.url()).pathname).toBe(treeRoute());
    await page.keyboard.press("Escape");
    await expect(page.locator(".inspector")).toHaveCount(0);
  });

  test("the ring colour reflects born-in vs married-in (a3)", async ({ page }) => {
    await page.goto(treeRoute());
    // Ishaan is the root (born into this line) → red ring.
    const ishaanRing = node(page, SEED.people.you.id).locator(".person-ring");
    await expect(ishaanRing).toHaveCSS("stroke", "rgb(178, 34, 34)");
    // Meera married into the Verma line → marigold ring.
    const meeraRing = node(page, SEED.people.wife.id).locator(".person-ring");
    await expect(meeraRing).toHaveCSS("stroke", "rgb(255, 140, 0)");
  });

  test("the viewer's own node reads '· you' in red", async ({ page }) => {
    await page.goto(treeRoute());
    const you = node(page, SEED.people.you.id).locator(".node-year--you");
    await expect(you).toContainText("you");
    await expect(you).toHaveCSS("color", "rgb(178, 34, 34)");
    // Nobody else carries the marker.
    await expect(node(page, SEED.people.wife.id).locator(".node-year--you")).toHaveCount(0);
  });

  test("a couple's right-hand label is offset below the left (a2)", async ({ page }) => {
    await page.goto(treeRoute());
    // Husband (left) label at y=52; wife (right) label at y=78.
    const husbandLabel = node(page, SEED.people.you.id).locator("foreignObject");
    const wifeLabel = node(page, SEED.people.wife.id).locator("foreignObject");
    await expect(husbandLabel).toHaveAttribute("y", "52");
    await expect(wifeLabel).toHaveAttribute("y", "78");
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
    // without a route change (Spec 00 — the canvas is operable via the rail).
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
    // The attention filter takes the rail's "unfinished" slot once getting-started
    // is put away (Spec 05 — attention lives in the rail, not on the canvas).
    await page.locator(".rail-checklist-dismiss").click();
    await expect(page.locator(".rail-attention-row")).toHaveCount(3);
    const total = await page.locator(".node-wrap").count();

    await page.getByRole("button", { name: /No account linked/ }).click();
    // Nothing is removed — every household stays on the canvas (a8).
    await expect(page.locator(".node-wrap")).toHaveCount(total);
    // The root couple (both accounts linked) has no issue → dimmed; a child with
    // no account stays full.
    await expect(
      page.locator(`.node-wrap:has(.node[data-id="${SEED.people.you.id}"])`)
    ).toHaveClass(/dimmed/);
    await expect(
      page.locator(`.node-wrap:has(.node[data-id="${SEED.people.son.id}"])`)
    ).not.toHaveClass(/dimmed/);

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
    // Fit runs without error and the canvas stays put (no route change).
    await controls.getByRole("button", { name: "Fit" }).click();
    await expect(page.locator(".tree-canvas")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(treeRoute());
  });
});
