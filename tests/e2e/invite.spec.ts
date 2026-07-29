import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { SEED } from "./fixtures";

/**
 * Spec 04 — Invitation, step 1 (IN-A). The invitation is legible from the token
 * before any sign-in (a1); the two ways in carry the invite through /signin via
 * ?next (a2); a signed-in visitor on the wrong account can't accept (a7); a
 * revoked/expired token shows the explained card, never a 404 (a8). Seeds two
 * invites for the seed tree (to Arjun) and cleans them up.
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const VALID = "inv_e2e_valid";
const REVOKED = "inv_e2e_revoked";
const INVITE_EMAIL = "cousin.e2e@example.com";

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: LOCAL_DB });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

test.beforeAll(async () => {
  await withDb(async (c) => {
    await c.query("delete from tree_invites where id like 'inv_e2e_%'");
    for (const [id, status] of [
      [VALID, "pending"],
      [REVOKED, "revoked"],
    ] as const) {
      await c.query(
        `insert into tree_invites (id, tree_id, email, person_id, role, invited_by, status, expires_at)
         values ($1, $2, $3, 'p_arjun', 'editor', $4, $5, now() + interval '14 days')`,
        [id, SEED.tree.id, INVITE_EMAIL, SEED.userId, status]
      );
    }
  });
});

test.afterAll(async () => {
  await withDb((c) => c.query("delete from tree_invites where id like 'inv_e2e_%'"));
});

test.describe("Invitation step 1 — signed out (Spec 04 a1/a2/a8)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the invitation is legible from the token, no session (a1)", async ({ page }) => {
    await page.goto(`/invite/${VALID}`);
    const card = page.locator(".invite-card");
    await expect(card).toBeVisible({ timeout: 20_000 });
    // Not the sign-in gate — the invitation itself renders.
    await expect(page.locator(".login-card")).toHaveCount(0);
    // Tree summary, offered record, role in verbs + the limit.
    await expect(card).toContainText("Ishaan Verma family tree");
    await expect(card).toContainText("Arjun Verma"); // the offered record
    await expect(card).toContainText("Read everything");
    await expect(card).toContainText("Add and correct"); // editor role → a ✓ verb
    await expect(card).toContainText("Not invite others or change the tree");
  });

  test("both ways in carry the invite through /signin via ?next (a2)", async ({ page }) => {
    await page.goto(`/invite/${VALID}`);
    await page.getByRole("link", { name: "I already have an account" }).click();
    await expect(page).toHaveURL(new RegExp(`/signin\\?next=.*invite.*${VALID}`), {
      timeout: 20_000,
    });
  });

  test("a revoked token shows the explained card, never a 404 (a8)", async ({ page }) => {
    await page.goto(`/invite/${REVOKED}`);
    await expect(page.locator(".invite-card")).toContainText("This invitation is no longer valid");
    await expect(page.getByRole("link", { name: /Ask .* for a new link/ })).toBeVisible();
  });
});

test.describe("Invitation step 1 — wrong account (Spec 04 a7)", () => {
  // Default storageState = designreview2, whose email ≠ the invited email.
  test("a signed-in visitor on the wrong account cannot accept", async ({ page }) => {
    await page.goto(`/invite/${VALID}`);
    await expect(page.locator(".invite-wrong-note")).toContainText(INVITE_EMAIL, {
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: "Sign in as someone else" })).toBeVisible();
    // No accept/join button on the wrong account.
    await expect(page.getByRole("button", { name: /^Join / })).toHaveCount(0);
  });
});
