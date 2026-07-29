import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { WRITER } from "./fixtures";

/**
 * Spec 03 c2 / a7 — First run. A tree with exactly one person shows a card
 * floating over the canvas ("Your tree starts with you.") with two buttons and a
 * quiet link, and the canvas shows one node with a connector stub and no
 * floating Add button. We create a fresh tree (which lands on first run, flow
 * f4) and delete it afterward.
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const NAME = "E2E FirstRun Tree";

async function signInAsWriter(page: Page) {
  await page.goto("/");
  await page.locator("#auth-email").fill(WRITER.email);
  await page.locator("#auth-password").fill(WRITER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 20_000 });
}

test.use({ storageState: { cookies: [], origins: [] } });

test.afterEach(async () => {
  const c = new Client({ connectionString: LOCAL_DB });
  await c.connect();
  try {
    await c.query("delete from trees where name like $1 and owner_uid = $2", [
      `${NAME}%`,
      WRITER.uid,
    ]);
  } finally {
    await c.end();
  }
});

test("a fresh tree lands on first run: one node + stub + the card, no floating Add (a7)", async ({
  page,
}) => {
  await signInAsWriter(page);
  await page.goto("/trees/new");
  await expect(page.locator(".create-panel")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("What should this record be called?").fill(NAME);
  await page.getByRole("button", { name: "Create the record" }).click();

  // Routed into the new tree (flow f4).
  await expect(page).toHaveURL(/\/tree\/tree_[A-Za-z0-9_-]+$/, { timeout: 20_000 });

  // The first-run card, verbatim.
  const card = page.locator(".firstrun-card");
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.locator(".firstrun-h1")).toHaveText("Your tree starts with you.");
  await expect(card.getByRole("button", { name: "Add my parents" })).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Invite the relative who remembers" })
  ).toBeVisible();
  await expect(card).toContainText("complete your record");

  // a7: exactly one node with a connector stub.
  await expect(page.locator(".node-wrap")).toHaveCount(1);
  await expect(page.locator(".tree-stub")).toHaveCount(1);
});
