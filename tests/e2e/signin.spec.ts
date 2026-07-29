import { test, expect } from "@playwright/test";
import { SEED } from "./fixtures";

/**
 * Spec 02 — Sign in. The card (SI-A): one "Welcome back" heading, two tabs on
 * one card (email + password only), one filled red button, a neutral Google
 * outline, inline non-disclosing errors, and keyboard-operable tabs. Runs signed
 * out, at `/`, where AppProvider renders the sign-in card.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Sign in — the card (Spec 02 SI-A)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".login-card")).toBeVisible({ timeout: 20_000 });
  });

  test("one ink heading, exactly one filled red button (a1/a3)", async ({ page }) => {
    await expect(page.locator(".login-title")).toHaveText("Welcome back");
    // a1: the heading is ink #1a1a1a, never marigold.
    const color = await page.locator(".login-title").evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe("rgb(26, 26, 26)");
    // a3: exactly one filled red button on the card.
    await expect(page.locator(".login-card .btn-primary")).toHaveCount(1);
  });

  test("Google is a neutral outline, never leaf green (a2)", async ({ page }) => {
    const google = page.locator(".auth-google");
    await expect(google).toHaveText(/Continue with Google/);
    await expect(google).not.toHaveClass(/btn-primary/);
    const bg = await google.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgb(46, 139, 87)"); // leaf green means "you", never here
    // The real multi-colour mark is present.
    await expect(google.locator("svg")).toHaveCount(1);
  });

  test("switching tabs preserves the typed email + swaps the password copy (a4)", async ({
    page,
  }) => {
    await page.locator("#auth-email").fill("someone@example.com");
    await page.getByRole("tab", { name: "Create account" }).click();
    await expect(page.locator("#auth-email")).toHaveValue("someone@example.com");
    await expect(page.locator('label[for="auth-password"]')).toHaveText("Choose a password");
    await expect(page.locator(".auth-hint")).toHaveText("at least 8 characters");
    // Back to Sign in: the label reverts and Forgot? returns.
    await page.getByRole("tab", { name: "Sign in" }).click();
    await expect(page.locator('label[for="auth-password"]')).toHaveText("Password");
    await expect(page.locator(".auth-forgot")).toHaveText("Forgot?");
  });

  test("email validation fires on blur, not on keystroke (a5)", async ({ page }) => {
    await page.locator("#auth-email").fill("notanemail");
    // No error while typing.
    await expect(page.locator(".auth-field-error")).toHaveCount(0);
    await page.locator("#auth-email").blur();
    await expect(page.locator(".auth-field-error")).toBeVisible();
  });

  test("a failed sign-in clears only the password and refocuses it (a6)", async ({ page }) => {
    await page.locator("#auth-email").fill(SEED.email);
    await page.locator("#auth-password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // One non-disclosing message above the button.
    await expect(page.locator(".auth-form-error")).toHaveText(
      "That password does not match this email.",
      { timeout: 15_000 }
    );
    // Email kept, password cleared + focused.
    await expect(page.locator("#auth-email")).toHaveValue(SEED.email);
    await expect(page.locator("#auth-password")).toHaveValue("");
    await expect(page.locator("#auth-password")).toBeFocused();
  });

  test("an already-registered email on Create switches to Sign in instead of erroring (a7)", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Create account" }).click();
    await page.locator("#auth-email").fill(SEED.email); // already registered
    await page.locator("#auth-password").fill("whatever-password");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    // Switched to Sign in, email carried, a note (not an error).
    await expect(page.getByRole("tab", { name: "Sign in" })).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 15_000 }
    );
    await expect(page.locator(".auth-form-note")).toHaveText(
      "You already have an account with this email."
    );
    await expect(page.locator("#auth-email")).toHaveValue(SEED.email);
  });

  test("tabs are operable by keyboard (a9)", async ({ page }) => {
    const signinTab = page.getByRole("tab", { name: "Sign in" });
    const createTab = page.getByRole("tab", { name: "Create account" });
    await signinTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(createTab).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(signinTab).toHaveAttribute("aria-selected", "true");
  });
});
