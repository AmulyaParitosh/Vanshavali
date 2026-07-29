import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { WRITER } from "./fixtures";

/**
 * Spec 03 c3 / a2 — Create a tree. Two fields; "Create the record" stays
 * disabled until the name has a non-space character; creating routes into the
 * new tree. Runs as designreview3 and deletes any tree it makes so the picker's
 * tree count stays stable.
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const NAME = "E2E Create Test Tree";

async function signInAsWriter(page: Page) {
  await page.goto("/signin");
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
    // Cascade removes the tree's people + membership.
    await c.query("delete from trees where name like $1 and owner_uid = $2", [
      `${NAME}%`,
      WRITER.uid,
    ]);
  } finally {
    await c.end();
  }
});

test("Create the record is disabled until the name is non-empty, then creates + routes in (a2)", async ({
  page,
}) => {
  await signInAsWriter(page);
  await page.goto("/trees/new");
  // Wait past the loading gate + first-hit route compile.
  await expect(page.locator(".create-panel")).toBeVisible({ timeout: 20_000 });

  const submit = page.getByRole("button", { name: "Create the record" });
  await expect(page.getByLabel("What should this record be called?")).toBeVisible();
  await expect(page.getByLabel("Where is the family from?")).toBeVisible();

  // Disabled with an empty / whitespace-only name (f3).
  await expect(submit).toBeDisabled();
  await page.getByLabel("What should this record be called?").fill("   ");
  await expect(submit).toBeDisabled();

  await page.getByLabel("What should this record be called?").fill(NAME);
  await page.getByLabel("Where is the family from?").fill("Madhubani, Bihar");
  await expect(submit).toBeEnabled();

  await submit.click();
  // Routed into the freshly-created tree.
  await expect(page).toHaveURL(/\/tree\/tree_[A-Za-z0-9_-]+$/, { timeout: 20_000 });
});
