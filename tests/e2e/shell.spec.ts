import { test, expect } from "@playwright/test";
import { treeRoute } from "./fixtures";

/**
 * Spec 00 §02 — the shell (chrome bar + rail + columns), and integration
 * contract §1 (chrome + rail render on every in-tree route and never remount).
 * Runs authenticated as the seeded tree keeper (default storageState).
 */

test.describe("Shell — chrome bar and rail", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(treeRoute());
    // Wait for the whole shell to settle — the rail mounts a tick after the
    // chrome bar (it waits for currentTreeId to bind from the URL).
    await expect(page.locator(".chrome-bar")).toBeVisible();
    await expect(page.locator(".tree-rail")).toBeVisible();
  });

  test("the chrome bar carries the wordmark, tree switcher, search trigger and you avatar", async ({
    page,
  }) => {
    await expect(page.locator(".chrome-wordmark")).toBeVisible();
    await expect(page.locator(".chrome-treeswitcher")).toBeVisible();
    await expect(page.locator(".chrome-search")).toBeVisible();
    await expect(page.locator(".chrome-avatar-link")).toBeVisible();
  });

  test("the rail lists exactly the four destinations Tree, Members, Households, Settings", async ({
    page,
  }) => {
    const items = page.locator(".tree-rail-item");
    await expect(items).toHaveCount(4);
    await expect(items.locator(".tree-rail-label")).toHaveText([
      "Tree",
      "Members",
      "Households",
      "Settings",
    ]);
  });

  test("the you avatar is leaf green (#2e8b57), and nothing else", async ({ page }) => {
    const avatar = page.locator(".chrome-avatar--placeholder");
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveCSS("background-color", "rgb(46, 139, 87)");
  });

  test("the banner is drawn from banner.jpg", async ({ page }) => {
    const bg = await page.evaluate(
      () => getComputedStyle(document.querySelector(".chrome-bar-banner")!).backgroundImage
    );
    expect(bg).toContain("banner.jpg");
  });

  test("the active destination is a solid red block with light text", async ({ page }) => {
    await page.locator(".tree-rail-item", { hasText: "Members" }).click();
    await expect(page).toHaveURL(/\/members$/);
    const active = page.locator(".tree-rail-item.active");
    await expect(active.locator(".tree-rail-label")).toHaveText("Members");
    await expect(active).toHaveCSS("background-color", "rgb(178, 34, 34)");
    await expect(active).toHaveCSS("color", "rgb(255, 253, 249)");
  });

  test("the search trigger opens the ⌘K search palette", async ({ page }) => {
    await expect(page.locator(".cmdk-panel")).toHaveCount(0);
    await page.locator(".chrome-search").click();
    await expect(page.locator(".cmdk-panel")).toBeVisible();
  });

  test("the chrome bar and rail do not remount when the route changes (contract §1)", async ({
    page,
  }) => {
    // Definitive check: hold references to the live shell nodes and confirm they
    // are the SAME DOM nodes after client navigation. A remount replaces them.
    const chromeBefore = await page.$(".chrome-bar");
    const railBefore = await page.$(".tree-rail");

    const settleOn = async (label: string, url: RegExp) => {
      await page.locator(".tree-rail-item", { hasText: label }).click();
      // Generous timeout: the dev server compiles a route on its first visit, so
      // the client navigation can take longer than the 5s default late in a run.
      await expect(page).toHaveURL(url, { timeout: 20_000 });
      await expect(page.locator(".tree-rail-item.active .tree-rail-label")).toHaveText(label);
      await page.waitForLoadState("networkidle");
    };
    const stillSame = async () => ({
      chrome: await page.evaluate(
        (el) => el === document.querySelector(".chrome-bar"),
        chromeBefore
      ),
      rail: await page.evaluate((el) => el === document.querySelector(".tree-rail"), railBefore),
    });

    await settleOn("Members", /\/members$/);
    expect(await stillSame()).toEqual({ chrome: true, rail: true });

    await settleOn("Households", /\/families$/);
    expect(await stillSame()).toEqual({ chrome: true, rail: true });
  });
});

test.describe("Shell — signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the chrome bar is absent on the sign-in screen (present only when authenticated)", async ({
    page,
  }) => {
    await page.goto("/signin");
    await expect(page.locator(".login-screen")).toBeVisible();
    await expect(page.locator(".chrome-bar")).toHaveCount(0);
  });
});
