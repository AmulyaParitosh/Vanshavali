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

  test("the generation rail lists generations and is keyboard-navigable (a7)", async ({ page }) => {
    await page.goto(treeRoute());
    const rail = page.locator(".genrail");
    // Seed spans two generations: I (Ishaan + Meera) and II (their children).
    await expect(rail.locator(".genrail-row")).toHaveCount(2);
    await expect(rail.locator(".genrail-numeral").first()).toHaveText("I");
    await expect(rail.locator(".genrail-numeral").nth(1)).toHaveText("II");
    // Arrow keys move between generations without leaving the rail.
    await rail.locator(".genrail-row").first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(rail.locator(".genrail-row").nth(1)).toBeFocused();
    // Enter jumps the canvas (no route change).
    await page.keyboard.press("Enter");
    await expect(page.locator(".tree-canvas")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(treeRoute());
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
