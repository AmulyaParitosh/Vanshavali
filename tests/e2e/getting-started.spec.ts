import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { SEED, WRITER, treeRoute } from "./fixtures";

/**
 * Spec 10 — Getting started. The checklist lives in the rail, not a modal (a1);
 * its steps link out and block nothing (a2); a reader is offered three steps,
 * not four, and the counter reflects it (a8).
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function setRole(role: "editor" | "viewer") {
  const c = new Client({ connectionString: LOCAL_DB });
  await c.connect();
  try {
    await c.query("update tree_members set role=$1 where tree_id=$2 and uid=$3", [
      role,
      SEED.tree.id,
      WRITER.uid,
    ]);
  } finally {
    await c.end();
  }
}

async function signInAsWriter(page: Page) {
  await page.goto("/");
  await page.locator("#auth-email").fill(WRITER.email);
  await page.locator("#auth-password").fill(WRITER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 20_000 });
}

test.describe("Getting started — the rail checklist (Spec 10 a1/a2)", () => {
  test("the checklist lives in the rail, no welcome modal, four steps for a keeper (a1)", async ({
    page,
  }) => {
    await page.goto(treeRoute());
    const list = page.locator(".rail-checklist");
    await expect(list).toBeVisible({ timeout: 20_000 });
    await expect(list).toContainText("Getting started");
    for (const label of [
      "Join the tree",
      "Add a photograph",
      "Confirm your dates",
      "Add who's missing",
    ]) {
      await expect(list.getByText(label, { exact: true })).toBeVisible();
    }
    // a1: no welcome modal anywhere.
    await expect(page.locator(".welcome-modal")).toHaveCount(0);
  });

  test("a step links out and blocks nothing (a2)", async ({ page }) => {
    await page.goto(treeRoute());
    await expect(page.locator(".rail-checklist")).toBeVisible({ timeout: 20_000 });
    await page.locator(".rail-checklist-item", { hasText: "Add who's missing" }).click();
    await expect(page).toHaveURL(new RegExp(`/tree/${SEED.tree.id}/members`), { timeout: 20_000 });
  });
});

test.describe("Getting started — a reader is offered three steps (Spec 10 a8)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.afterEach(async () => setRole("editor"));

  test("a reader sees three steps, not four, and the counter reads / 3", async ({ page }) => {
    await setRole("viewer");
    await signInAsWriter(page);
    await page.goto(treeRoute());
    const list = page.locator(".rail-checklist");
    await expect(list).toBeVisible({ timeout: 20_000 });
    await expect(list.locator(".rail-checklist-item")).toHaveCount(3);
    await expect(list.getByText("Add who's missing", { exact: true })).toHaveCount(0);
    await expect(page.locator(".rail-checklist-count")).toContainText("/ 3");
  });
});
