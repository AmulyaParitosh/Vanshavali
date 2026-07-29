import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { SEED, WRITER } from "./fixtures";

/**
 * Spec 12 — Account · Your record (/user/record). The editor is the SAME component
 * as the inspector's edit mode (a2); saving propagates the own facts to every
 * linked tree and returns to the overview (a5). The sidebar names where the record
 * appears and that only its owner may change it (a4 read-back).
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: LOCAL_DB });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

test.describe("Account — Your record (Spec 12)", () => {
  // The save test writes to the linked record; always restore the seed name.
  test.afterEach(async () => {
    await withDb((c) =>
      c.query(
        `update people set data = jsonb_set(data, '{name,official_name}', '"Ishaan Verma"') where id=$1`,
        [SEED.people.you.id]
      )
    );
  });

  test("the Account chrome has no tree switcher and no search (a8)", async ({ page }) => {
    await page.goto("/user/profile");
    await expect(page.locator(".chrome-avatar-link")).toBeVisible(); // signed in
    // Outside any tree — neither the switcher nor the search appears (even though
    // this keeper does have a tree).
    await expect(page.locator(".chrome-treeswitcher")).toHaveCount(0);
    await expect(page.locator(".chrome-search")).toHaveCount(0);
  });

  test("reuses the record editor and names where it appears (a2/a3)", async ({ page }) => {
    await page.goto("/user/record");
    // The same RecordEditor as the inspector — the Name field carries the record.
    await expect(page.locator(".record-editor")).toBeVisible();
    await expect(page.locator(".record-editor").getByLabel("Name")).toHaveValue("Ishaan Verma");
    // The sidebar lists where the one record shows up.
    const side = page.locator(".urec-side");
    await expect(side).toContainText("Where this appears");
    await expect(side).toContainText(SEED.tree.name);
    await expect(side).toContainText("Only you can change this");
  });

  test("saving propagates the own facts and returns to the overview (a5)", async ({ page }) => {
    await page.goto("/user/record");
    const name = page.locator(".record-editor").getByLabel("Name");
    await name.fill("Ishaan K. Verma");
    await page.locator(".record-editor").getByRole("button", { name: "Save" }).click();
    // Returns to the account overview (/user redirects to /user/profile).
    await expect(page).toHaveURL(/\/user(\/profile)?$/);
    // …and the change is persisted to the (one) linked record.
    await expect
      .poll(() =>
        withDb((c) =>
          c
            .query("select data->'name'->>'official_name' n from people where id=$1", [
              SEED.people.you.id,
            ])
            .then((r) => r.rows[0]!.n)
        )
      )
      .toBe("Ishaan K. Verma");
  });
});

test.describe("Account — leaving a tree (Spec 12 a6)", () => {
  // Sign in as the writer (a member — not owner — of the seed tree).
  test.use({ storageState: { cookies: [], origins: [] } });

  async function signInAsWriter(page: Page) {
    await page.goto("/");
    await page.locator("#auth-email").fill(WRITER.email);
    await page.locator("#auth-password").fill(WRITER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 30_000 });
  }

  test("a member's tree offers Leave; the dialog says the record stays; Cancel is non-destructive", async ({
    page,
  }) => {
    await signInAsWriter(page);
    await page.goto("/user/profile");
    const row = page.locator(".account-tree-row", { hasText: SEED.tree.name });
    await expect(row).toBeVisible({ timeout: 20_000 });
    // A member (not keeper) row offers Leave.
    await row.getByRole("button", { name: "Leave" }).click();
    const dialog = page.locator(".dialog");
    await expect(dialog).toContainText("Your record stays with you");
    // Cancel leaves the membership in place (non-destructive — keeps the seed clean).
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator(".dialog")).toHaveCount(0);
    await expect(row).toBeVisible();
  });
});
