import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { SEED, treeRoute } from "./fixtures";

/**
 * Spec 13 flow 7 / a10 — a stale save is never a silent overwrite. Each test
 * opens a record, then makes a concurrent write straight to the DB (bumping the
 * optimistic-lock version) to stand in for another keeper editing at the same
 * time. When our save lands on a moved record: fields nobody else touched merge
 * in silently; a field both sides changed opens the conflict dialog for a choice.
 *
 * This suite persists writes, so it snapshots the target row and restores it
 * after every test. The son (Arjun) is the target — an account-less relative
 * nothing else in the seed keys on.
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const arjun = SEED.people.son.id;

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: LOCAL_DB });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

let original: { data: unknown; version: number };

test.beforeAll(async () => {
  original = await withDb(async (c) => {
    const r = await c.query<{ data: unknown; version: number }>(
      "select data, version from people where id=$1",
      [arjun]
    );
    return r.rows[0]!;
  });
});

test.afterEach(async () => {
  await withDb((c) =>
    c.query("update people set data=$1::jsonb, version=$2 where id=$3", [
      JSON.stringify(original.data),
      original.version,
      arjun,
    ])
  );
});

/** Stand in for another keeper's concurrent write (also bumps the version). */
async function concurrentlySet(path: string[], valueJson: string) {
  await withDb((c) =>
    c.query(
      `update people set data = jsonb_set(data, $1, $2::jsonb, true), version = version + 1 where id=$3`,
      [`{${path.join(",")}}`, valueJson, arjun]
    )
  );
}

test.describe("Record panel — stale-save conflict (Spec 13 flow 7 / a10)", () => {
  test("a field both sides changed opens the conflict dialog; my choice is what saves", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${arjun}`);
    await expect(page.locator(".inspector-name")).toHaveText("Arjun Verma");

    await page.getByRole("button", { name: "Edit record" }).click();
    await page.getByLabel("Name").fill("Arjun Mine");

    // Meanwhile, someone else renames the same record.
    await concurrentlySet(["name", "official_name"], JSON.stringify("Arjun Theirs"));

    await page.getByRole("button", { name: "Save" }).click();

    // Never silently overwritten — the contested field surfaces both versions.
    const choice = page.locator(".conflict-choice");
    await expect(choice).toBeVisible();
    await expect(choice).toContainText("Arjun Mine");
    await expect(choice).toContainText("Arjun Theirs");

    // "Keep mine" is the default; confirm the save.
    await page.locator(".dialog .btn-primary").click();

    await expect(page.locator(".toast")).toContainText("Saved to");
    await expect(page.locator(".conflict-choice")).toHaveCount(0);
    // My choice won, and it's now the stored record.
    await expect(page.locator(".inspector-name")).toHaveText("Arjun Mine");
    expect(
      await withDb((c) =>
        c
          .query("select data->'name'->>'official_name' n from people where id=$1", [arjun])
          .then((r) => r.rows[0]!.n)
      )
    ).toBe("Arjun Mine");
  });

  test("a field only the other side changed merges in silently — no dialog (flow 7)", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${arjun}`);
    await expect(page.locator(".inspector-name")).toHaveText("Arjun Verma");

    await page.getByRole("button", { name: "Edit record" }).click();
    await page.getByLabel("Name").fill("Arjun Renamed");

    // Meanwhile, someone else fills in a DIFFERENT field (a detail).
    await concurrentlySet(["custom_fields"], JSON.stringify({ occupation: "Farmer" }));

    await page.getByRole("button", { name: "Save" }).click();

    // Nothing contested → no dialog, both changes survive.
    await expect(page.locator(".toast")).toContainText("Saved to");
    await expect(page.locator(".conflict-choice")).toHaveCount(0);
    await expect(page.locator(".inspector-name")).toHaveText("Arjun Renamed");
    await expect(page.locator(".inspector-section", { hasText: "Details" })).toContainText(
      "Farmer"
    );
  });
});
