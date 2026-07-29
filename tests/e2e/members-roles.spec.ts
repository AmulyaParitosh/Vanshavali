import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { SEED, WRITER, treeRoute } from "./fixtures";

/**
 * Spec 06 role-gated views (a2/a5) — seen through a non-keeper's session. The
 * default suite runs as the keeper; here we sign in as designreview3 (a Write
 * member of the same tree), and demote them to Read for the reader case. The May
 * column shows for every role but is interactive only for a keeper (a2); a reader
 * sees "Ask a keeper to add someone" instead of "+ Add person" (a5).
 *
 * These run through a member's cross-tree session (designreview3 deep-linking to a tree
 * they don't own) — the path that used to thrash on "Loading" (QUESTIONS Q15). Fixed in
 * useAuthAndData: the active-tree accessibility check now spans owned + member trees, so
 * a member tree bound from the URL is no longer reset out from under the layout.
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const membersRoute = treeRoute("members");

// Run signed out; each test signs in as the writer explicitly.
test.use({ storageState: { cookies: [], origins: [] } });

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
  await page.waitForLoadState("networkidle");
}

/** Open the seeded tree's Members page and wait past the loading gate. */
async function openMembers(page: Page) {
  await page.goto(membersRoute);
  // Switching into another owner's tree loads membership + data fresh; give it room.
  await expect(page.locator(".records-thead")).toBeVisible({ timeout: 20_000 });
}

test.afterEach(async () => {
  await setRole("editor"); // leave the seed's writer as it was
});

test("a writer sees the May column but no keeper controls (a2)", async ({ page }) => {
  await setRole("editor");
  await signInAsWriter(page);
  await openMembers(page);

  // The May column renders for a writer (every role reads it)…
  await expect(
    page.locator(".records-row", { hasText: "Ishaan Verma" }).locator(".records-col-may .chip")
  ).toHaveText("Keeper");
  // …but none of the keeper controls: no Invite pill anywhere, no inline role <select>.
  await expect(page.locator(".records-invite")).toHaveCount(0);
  await expect(page.locator(".records-table select")).toHaveCount(0);
  // A writer may still add people.
  await expect(page.getByRole("button", { name: "+ Add person" })).toBeVisible();
});

test("a reader sees 'Ask a keeper to add someone', no add and no invite (a5)", async ({ page }) => {
  await setRole("viewer");
  await signInAsWriter(page);
  await openMembers(page);

  await expect(page.locator(".records-reader-note")).toHaveText("Ask a keeper to add someone");
  await expect(page.getByRole("button", { name: "+ Add person" })).toHaveCount(0);
  await expect(page.locator(".records-invite")).toHaveCount(0);
  // The May column is still fully readable.
  await expect(
    page.locator(".records-row", { hasText: "Ishaan Verma" }).locator(".records-col-may .chip")
  ).toHaveText("Keeper");
});
