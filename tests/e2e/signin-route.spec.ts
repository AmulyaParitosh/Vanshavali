import { test, expect } from "@playwright/test";
import { SEED, treeRoute } from "./fixtures";

/**
 * Spec 02 — Sign in, the route (SI-B). The public GET /signin: no shell,
 * ?intent preselects the tab, ?next (validated internal path only) carries a
 * successful auth to its destination — so an invitation survives account
 * creation (a8) — and a session on /signin is redirected straight out. Plus the
 * separate /reset request page.
 */

test.describe("Sign in — the route, signed out (Spec 02 SI-B)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/signin renders the card with no shell", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.locator(".login-card")).toBeVisible({ timeout: 20_000 });
    // No app chrome on this page (no shell).
    await expect(page.locator(".chrome-avatar-link")).toHaveCount(0);
    await expect(page.locator(".chrome-search")).toHaveCount(0);
  });

  test("?intent=create preselects the Create account tab", async ({ page }) => {
    await page.goto("/signin?intent=create");
    await expect(page.getByRole("tab", { name: "Create account" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  test("?next carries a successful sign-in to its destination (a8)", async ({ page }) => {
    const dest = treeRoute(); // an internal path
    await page.goto(`/signin?next=${encodeURIComponent(dest)}`);
    await page.locator("#auth-email").fill(SEED.email);
    await page.locator("#auth-password").fill(SEED.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(dest.replace(/[/]/g, "\\/")), { timeout: 20_000 });
  });

  test("an off-site ?next is ignored — never redirect off-origin (e3)", async ({ page }) => {
    await page.goto("/signin?next=https://evil.example.com/pwn");
    await page.locator("#auth-email").fill(SEED.email);
    await page.locator("#auth-password").fill(SEED.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // Lands somewhere on our origin, never the off-site URL. Asserted against the
    // configured baseURL rather than a hard-coded port, so the check is about the
    // origin — not about which port the dev server happens to be on.
    await expect(page).not.toHaveURL(/evil\.example\.com/);
    await expect
      .poll(() => new URL(page.url()).origin, { timeout: 20_000 })
      .toBe(new URL(test.info().project.use.baseURL!).origin);
  });

  test("/reset asks for one email, then confirms the link was sent", async ({ page }) => {
    await page.goto("/reset");
    await expect(page.locator(".login-title")).toHaveText("Reset your password");
    await page.locator("#reset-email").fill("someone@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.locator(".auth-form-note")).toHaveText(
      "Check your email — we sent a link to someone@example.com",
      { timeout: 15_000 }
    );
  });
});

test.describe("Sign in — the route, signed in (Spec 02 SI-B)", () => {
  test("an authenticated visit to /signin is redirected out (p2/s5)", async ({ page }) => {
    await page.goto("/signin");
    // Redirected off /signin to the app (the picker lands on the single tree).
    await expect(page).not.toHaveURL(/\/signin/, { timeout: 20_000 });
    await expect(page.locator(".login-card")).toHaveCount(0);
  });
});
