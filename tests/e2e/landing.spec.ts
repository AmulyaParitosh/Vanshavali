import { test, expect } from "@playwright/test";

/**
 * Spec 01 — Landing. The public page at `/`: eight bands, verbatim copy, exactly
 * two filled primary CTAs to /signin?intent=create (a4). A signed-in visitor
 * never sees it — `/` redirects them to their tree (a1). Renders with no shell.
 */

test.describe("Landing — anonymous (Spec 01)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("renders the hero and verbatim copy for a stranger (a3/a8)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".landing-hero")).toBeVisible({ timeout: 20_000 });
    const h1 = page.locator(".landing-hero-h1");
    await expect(h1).toContainText("Every family loses a generation");
    await expect(h1).toContainText("to nobody writing it down.");
    await expect(page.locator(".landing-eyebrow")).toHaveText("वंशावली · the record of a lineage");
    await expect(page.locator(".landing-trust")).toHaveText(
      "Free while we're small · no card · nothing public, ever"
    );
    await expect(page.locator(".landing-close-h2")).toContainText("Write your family down");
    // No app chrome on the public page.
    await expect(page.locator(".chrome-avatar-link")).toHaveCount(0);
    await expect(page.locator(".tree-rail")).toHaveCount(0);
  });

  test("exactly two filled primary CTAs, both to /signin?intent=create (a4)", async ({ page }) => {
    await page.goto("/");
    const ctas = page.locator(".landing-cta");
    await expect(ctas).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(ctas.nth(i)).toHaveAttribute("href", "/signin?intent=create");
    }
    // The nav's sign-in link.
    await expect(page.locator(".landing-nav-signin")).toHaveAttribute("href", "/signin");
  });

  test("anchor links reach the argument bands", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#why")).toBeAttached();
    await expect(page.locator("#how")).toBeAttached();
    await expect(page.locator("#privacy")).toBeAttached();
  });
});

test.describe("Landing — signed in redirects away (Spec 01 a1)", () => {
  test("a signed-in visitor to / is sent to their tree, never the landing", async ({ page }) => {
    await page.goto("/");
    // Redirected off the landing into the app.
    await expect(page.locator(".landing-hero")).toHaveCount(0, { timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/$/);
  });
});
