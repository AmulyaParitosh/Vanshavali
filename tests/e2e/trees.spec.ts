import { test, expect, type Page } from "@playwright/test";
import { SEED, WRITER, treeRoute } from "./fixtures";

/**
 * Spec 03 — My trees (the picker). A user with one tree skips it (a1); a user
 * with several sees one ordered list of cards, each stating the viewer's role in
 * words (a5), plus the "Start another tree" card; the chrome carries no switcher
 * and no search here (a4).
 */

async function signInAs(page: Page, email: string, password: string) {
  await page.goto("/signin");
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 20_000 });
}

test.describe("My trees — one tree skips the picker (Spec 03 a1)", () => {
  test("a user with exactly one tree lands straight in their tree", async ({ page }) => {
    // Default storageState = designreview2, keeper of the one seed tree.
    await page.goto("/trees");
    await expect(page).toHaveURL(new RegExp(treeRoute().replace(/[/]/g, "\\/")), {
      timeout: 20_000,
    });
    await expect(page.locator(".picker-grid")).toHaveCount(0);
  });
});

test.describe("My trees — the picker (Spec 03 a4/a5)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a user with several trees sees one list, roles in words, no switcher/search", async ({
    page,
  }) => {
    // designreview3 owns their own tree AND is an editor of the seed tree → 2 trees.
    await signInAs(page, WRITER.email, WRITER.password);
    await page.goto("/trees");

    await expect(page.locator(".picker-head h1")).toHaveText("Your family records");
    await expect(page.locator(".picker-sub")).toHaveText("Open one, or start another.");

    // One list, two real tree cards + the dashed new-tree card.
    const realCards = page.locator(".picker-card:not(.picker-card--new)");
    await expect(realCards).toHaveCount(2);
    await expect(page.locator(".picker-card--new")).toHaveText(/Start another tree/);

    // a5: role stated in words — their own tree is "kept by you", the seed
    // (where they are an editor) is "you may add and correct".
    await expect(
      page
        .locator(".picker-card", { hasText: "Sneha Verma family tree" })
        .locator(".picker-card-meta")
    ).toContainText("kept by you");
    await expect(
      page
        .locator(".picker-card", { hasText: "Ishaan Verma family tree" })
        .locator(".picker-card-meta")
    ).toContainText("you may add and correct");

    // a4: no tree switcher, no search on this route.
    await expect(page.locator(".chrome-search")).toHaveCount(0);
    await expect(page.locator(".tree-switcher")).toHaveCount(0);
  });

  test("a tree card opens that tree (a8 — the card is one link)", async ({ page }) => {
    await signInAs(page, WRITER.email, WRITER.password);
    await page.goto("/trees");
    await page.locator(".picker-card", { hasText: "Ishaan Verma family tree" }).click();
    await expect(page).toHaveURL(new RegExp(`/tree/${SEED.tree.id}`), { timeout: 20_000 });
  });
});
