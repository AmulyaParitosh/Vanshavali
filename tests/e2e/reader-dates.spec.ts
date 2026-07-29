import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { SEED, WRITER, treeRoute } from "./fixtures";

/**
 * Spec 11 a4 — reader date privacy, enforced server-side. When a tree's
 * readers_see_dates is off (default), a reader receives only the YEAR of a
 * living relative's events; a keeper receives the exact date. We assert the
 * actual /api/tree/[id]/data response, because that one read feeds the canvas,
 * the panel and search alike — redact it once and every surface is covered.
 *
 * Arjun (living, not the reader's own record) is given a full birth date for the
 * duration of each test and restored to no events afterward.
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const FULL_DATE = "1989-05-12";

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: LOCAL_DB });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

const setArjunBirth = (json: string) =>
  withDb((c) =>
    c.query("update people set data = jsonb_set(data, '{events}', $1::jsonb) where id='p_arjun'", [
      json,
    ])
  );
const setReadersSeeDates = (v: boolean) =>
  withDb((c) => c.query("update trees set readers_see_dates=$1 where id=$2", [v, SEED.tree.id]));
const setRole = (role: "editor" | "viewer") =>
  withDb((c) =>
    c.query("update tree_members set role=$1 where tree_id=$2 and uid=$3", [
      role,
      SEED.tree.id,
      WRITER.uid,
    ])
  );

/** The birth date of Arjun in the tree's /data response, as this session sees it. */
async function fetchArjunBirth(page: Page): Promise<string | undefined> {
  const waitData = page.waitForResponse(
    (r) => r.url().includes(`/api/tree/${SEED.tree.id}/data`) && r.request().method() === "GET",
    { timeout: 20_000 }
  );
  await page.goto(treeRoute());
  const json = (await (await waitData).json()) as {
    people: { id: string; events?: { type: string; date?: string }[] }[];
  };
  const arjun = json.people.find((p) => p.id === "p_arjun");
  return arjun?.events?.find((e) => e.type === "Birth")?.date;
}

test.beforeEach(async () => {
  await setArjunBirth(`[{"type":"Birth","date":"${FULL_DATE}","place":"Patna"}]`);
});
test.afterEach(async () => {
  await setArjunBirth("[]");
});

test.describe("Reader dates — keeper is unaffected (Spec 11 a4)", () => {
  test("the keeper receives the exact date", async ({ page }) => {
    expect(await fetchArjunBirth(page)).toBe(FULL_DATE);
  });
});

test.describe("Reader dates — a reader is redacted (Spec 11 a4)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.afterEach(async () => {
    await setReadersSeeDates(false);
    await setRole("editor");
  });

  test("a reader gets the year only when the setting is off, the full date when on", async ({
    page,
  }) => {
    await setRole("viewer");
    await setReadersSeeDates(false);

    await page.goto("/signin");
    await page.locator("#auth-email").fill(WRITER.email);
    await page.locator("#auth-password").fill(WRITER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 20_000 });

    // Setting off (default) → year only.
    expect(await fetchArjunBirth(page)).toBe("1989");

    // Keeper flips the switch on → the reader now sees the exact date, no reload
    // of the app needed beyond the next fetch (respected on every query, e2).
    await setReadersSeeDates(true);
    expect(await fetchArjunBirth(page)).toBe(FULL_DATE);
  });
});
