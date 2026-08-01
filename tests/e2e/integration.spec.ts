import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { SEED, WRITER, treeRoute } from "./fixtures";

/**
 * Wave 7 — cross-spec integration contracts (the seams BETWEEN specs). Contracts
 * fully covered by a per-spec suite are referenced in INTEGRATION.md; this file
 * holds the ones that only exist at a seam:
 *   #2  the ONE shared inspector, opened from different surfaces, in place
 *   #11 search respects the reader-dates setting (Spec 09 ← Spec 11 ST-D)
 *   #12 Esc closes the topmost overlay
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: LOCAL_DB });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function openSearch(page: Page) {
  // Top-nav search trigger removed; open the palette via the shared event.
  await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("vanshavali:open-search")));
  await expect(page.locator(".cmdk-panel")).toBeVisible();
}

test.describe("Integration #2 — the one shared inspector", () => {
  test("opens the same record dock from a members row and from ⌘K search, in place", async ({
    page,
  }) => {
    // From a Members row — the shared inspector opens in place, no route change.
    await page.goto(treeRoute("members"));
    await page.locator(".records-row", { hasText: "Meera Verma" }).click();
    await expect(page.locator(".inspector-name")).toHaveText("Meera Verma", { timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe(treeRoute("members"));

    // From ⌘K search on the canvas — the SAME inspector component, opened via
    // ?person on the current route (no navigation away from the canvas).
    await page.goto(treeRoute());
    await openSearch(page);
    await page.locator(".cmdk-panel input").fill("Meera");
    await page.locator(".cmdk-row", { hasText: "Meera Verma" }).first().click();
    await expect(page.locator(".inspector-name")).toHaveText("Meera Verma", { timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe(treeRoute());
  });
});

test.describe("Integration #11 — search respects reader-dates", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async () => {
    await withDb((c) =>
      c.query(
        'update people set data = jsonb_set(data, \'{events}\', \'[{"type":"Birth","date":"1989-05-12","place":"Patna"}]\'::jsonb) where id=\'p_arjun\''
      )
    );
    await withDb((c) =>
      c.query("update tree_members set role='viewer' where tree_id=$1 and uid=$2", [
        SEED.tree.id,
        WRITER.uid,
      ])
    );
    await withDb((c) =>
      c.query("update trees set readers_see_dates=false where id=$1", [SEED.tree.id])
    );
  });
  test.afterEach(async () => {
    await withDb((c) =>
      c.query("update people set data = data - 'events' || '{\"events\":[]}' where id='p_arjun'")
    );
    await withDb((c) =>
      c.query("update tree_members set role='editor' where tree_id=$1 and uid=$2", [
        SEED.tree.id,
        WRITER.uid,
      ])
    );
  });

  test("a reader's search shows a living relative's year only, never the exact date", async ({
    page,
  }) => {
    // Sign in as the reader (designreview3, now viewer of the seed tree).
    await page.goto("/signin");
    await page.locator("#auth-email").fill(WRITER.email);
    await page.locator("#auth-password").fill(WRITER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 20_000 });

    await page.goto(treeRoute());
    await openSearch(page);
    await page.locator(".cmdk-panel input").fill("Patna"); // matches Arjun's birth event
    // The results carry the year, never the exact date the reader may not see.
    const results = page.locator(".cmdk-results");
    await expect(results).toContainText("1989");
    await expect(results).not.toContainText("1989-05-12");
  });
});

test.describe("Integration #12 — Esc closes the topmost overlay", () => {
  test("Esc closes the ⌘K search palette", async ({ page }) => {
    await page.goto(treeRoute());
    await openSearch(page);
    await page.keyboard.press("Escape");
    await expect(page.locator(".cmdk-panel")).toHaveCount(0);
  });
});
