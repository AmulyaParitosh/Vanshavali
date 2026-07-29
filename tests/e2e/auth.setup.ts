import { test as setup, expect } from "@playwright/test";
import { AUTH_FILE, SEED } from "./fixtures";

/**
 * Authenticate once and persist the session (localStorage/cookies) to AUTH_FILE.
 * The chromium project depends on this and reuses the state, so every in-tree
 * test starts signed in as the tree's keeper without logging in again.
 *
 * Logs in through the real UI (the current LoginScreen: #auth-email / #auth-password),
 * not by injecting a token — so it also exercises that the sign-in flow works.
 */
setup("authenticate", async ({ page }) => {
  // The login → auth → app-boot chain compiles several routes on a cold dev
  // server; give the whole setup room so it doesn't flake the whole suite.
  setup.setTimeout(90_000);
  await page.goto("/signin");

  await page.locator("#auth-email").fill(SEED.email);
  await page.locator("#auth-password").fill(SEED.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Authenticated signal: the chrome-bar avatar link only renders with a user,
  // and the login screen unmounts. (Chrome-bar itself renders logged-out too.)
  await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".login-screen")).toHaveCount(0);

  await page.context().storageState({ path: AUTH_FILE });
});
