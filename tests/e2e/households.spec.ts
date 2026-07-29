import { test, expect } from "@playwright/test";
import { treeRoute } from "./fixtures";

/**
 * Spec 08 — Households. H-B covers the list: the column set (Partners · Married ·
 * Children · Gen), generation ordering, the "no marriage date" absence, and a row
 * opening the editor. The editor internals (marriage prose, reorder, delete) are H-C+.
 */

const route = treeRoute("families");

test.describe("Households — the list (Spec 08)", () => {
  test("the table carries the Spec 08 columns", async ({ page }) => {
    await page.goto(route);
    const head = page.locator(".records-thead");
    await expect(head).toContainText("Partners");
    await expect(head).toContainText("Married");
    await expect(head).toContainText("Children");
    await expect(head).toContainText("Gen");
  });

  test("a household reads partners, marriage, children and generation", async ({ page }) => {
    await page.goto(route);
    const row = page.locator(".records-row", { hasText: "Ishaan Verma" });
    await expect(row.locator(".records-name-primary")).toHaveText("Ishaan Verma & Meera Verma");
    // No marriage date recorded in the seed → stated as an absence, not blank.
    await expect(row.locator(".hh-col-married")).toHaveText("no marriage date");
    await expect(row.locator(".hh-col-children")).toContainText("2");
    await expect(row.locator(".hh-col-gen")).toHaveText("I");
  });

  test("clicking a household opens the editor in place", async ({ page }) => {
    await page.goto(route);
    await page.locator(".records-row", { hasText: "Ishaan Verma" }).click();
    await expect(page.locator(".inspector")).toBeVisible();
    await expect(page.locator(".inspector")).toContainText("Children · eldest first");
    expect(new URL(page.url()).pathname).toBe(route);
  });
});

test.describe("Households — the editor (Spec 08)", () => {
  const openEditor = async (page: import("@playwright/test").Page) => {
    await page.goto(route);
    await page.locator(".records-row", { hasText: "Ishaan Verma" }).click();
    await expect(page.locator(".inspector")).toBeVisible();
  };

  test("marriage facts read back as prose; editing reveals the footer (a5)", async ({ page }) => {
    await openEditor(page);
    const prose = page.locator(".hh-marriage-prose");
    await expect(prose).toHaveText("No marriage date recorded.");
    // A clean editor shows no footer (nothing to save).
    await expect(page.locator(".inspector-foot")).toHaveCount(0);
    // Typing a date reads back as a sentence and reveals the Save footer.
    await page.getByLabel("Marriage date").fill("1983");
    await expect(prose).toHaveText("Married 1983.");
    await page.getByLabel("Marriage place").fill("Ranchi");
    await expect(prose).toHaveText("Married 1983 in Ranchi.");
    await expect(
      page.locator(".inspector-foot").getByRole("button", { name: "Save" })
    ).toBeVisible();
  });

  test("children reorder by Alt+Arrow, in birth order (a3)", async ({ page }) => {
    await openEditor(page);
    const names = page.locator(".hh-child .hh-child-name");
    await expect(names.first()).toHaveText("Arjun Verma");
    await page.locator(".hh-child").first().focus();
    await page.keyboard.press("Alt+ArrowDown");
    // The eldest slot is now the other child — reorder is live (not yet saved).
    await expect(names.first()).toHaveText("Sara Verma");
  });

  test("Delete household routes through the consequence dialog; Cancel is non-destructive (a6)", async ({
    page,
  }) => {
    await openEditor(page);
    await page.getByRole("button", { name: "Delete household" }).click();
    const dialog = page.locator(".dialog");
    await expect(dialog).toBeVisible();
    // Names what stays — the children keep their own records.
    await expect(dialog).toContainText("keep their own records");
    // The destructive action is the quiet-red pill, not a filled red button.
    await expect(dialog.locator(".btn-danger")).toHaveText("Delete household");
    // Cancel leaves the household in place.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator(".dialog")).toHaveCount(0);
    await expect(page.locator(".inspector")).toBeVisible();
  });
});
