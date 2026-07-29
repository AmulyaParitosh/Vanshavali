import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { SEED } from "./fixtures";

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
    // Returns to the account overview…
    await expect(page).toHaveURL(/\/user$/);
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
    // Restore the seed name.
    await withDb((c) =>
      c.query(
        `update people set data = jsonb_set(data, '{name,official_name}', '"Ishaan Verma"') where id=$1`,
        [SEED.people.you.id]
      )
    );
  });
});
