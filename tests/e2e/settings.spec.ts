import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { SEED, WRITER, treeRoute } from "./fixtures";

/**
 * Spec 11 — Tree settings.
 *  - Cards: each has its own Save, disabled until that card changes (a2); the
 *    keeper's edits round-trip (the ST-A/ST-B write path).
 *  - Delete: requires the exact tree name typed + real counts (a7); the danger
 *    action is quiet-red text, never a filled red button (a8). This suite never
 *    confirms the delete (it would destroy the seed) — it stops at Cancel.
 *
 * The read-only view for non-keepers (a1) runs through a writer's session (a
 * member of the seed tree) — the cross-tree path fixed in useAuthAndData (Q15).
 * Server-side keeper enforcement is also unit-tested in tree-service.test.ts.
 */

const LOCAL_DB =
  process.env.DATABASE_URL_LOCAL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const settingsRoute = treeRoute("settings");

/** The Save button belonging to the card whose heading contains `heading`. */
const cardSave = (page: Page, heading: string) =>
  page.locator(".settings-card", { hasText: heading }).locator(".settings-save");

async function setNameOrder(order: string) {
  const c = new Client({ connectionString: LOCAL_DB });
  await c.connect();
  try {
    await c.query("update trees set name_order=$1 where id=$2", [order, SEED.tree.id]);
  } finally {
    await c.end();
  }
}

async function readNameOrder(): Promise<string> {
  const c = new Client({ connectionString: LOCAL_DB });
  await c.connect();
  try {
    const r = await c.query<{ name_order: string }>("select name_order from trees where id=$1", [
      SEED.tree.id,
    ]);
    return r.rows[0]?.name_order ?? "";
  } finally {
    await c.end();
  }
}

test.describe("Tree settings — cards (Spec 11 a2)", () => {
  // Always leave the seed's name order back at the default, however a test ends.
  test.afterEach(async () => setNameOrder("devanagari"));

  test("the sub-line is shown to every role (verbatim)", async ({ page }) => {
    await page.goto(settingsRoute);
    await expect(page.locator(".settings-sub")).toHaveText(
      "Only the keeper can change these. Everyone else sees them read-only."
    );
  });

  test("each card's Save is disabled until that card changes (a2)", async ({ page }) => {
    await page.goto(settingsRoute);
    const nameSave = cardSave(page, "What this tree is called");
    const orderSave = cardSave(page, "How names are shown");
    const shareSave = cardSave(page, "Sharing");

    // Nothing dirty yet — every Save is disabled.
    await expect(nameSave).toBeDisabled();
    await expect(orderSave).toBeDisabled();
    await expect(shareSave).toBeDisabled();

    // Editing the name arms ONLY the name card's Save (per-card, a2).
    const nameField = page.getByLabel("Tree name");
    await nameField.fill(`${SEED.tree.name} (edited)`);
    await expect(nameSave).toBeEnabled();
    await expect(orderSave).toBeDisabled();
    await expect(shareSave).toBeDisabled();

    // Restoring the value disarms it again — dirty is a real diff, not any keystroke.
    await nameField.fill(SEED.tree.name);
    await expect(nameSave).toBeDisabled();

    // A different card's control arms only its own Save.
    await page.getByRole("radio", { name: "Latin first" }).click();
    await expect(orderSave).toBeEnabled();
    await expect(nameSave).toBeDisabled();
    await expect(shareSave).toBeDisabled();
  });

  test("the keeper's name-order edit persists and re-loads selected", async ({ page }) => {
    await page.goto(settingsRoute);
    await page.getByRole("radio", { name: "Latin first" }).click();
    const orderSave = cardSave(page, "How names are shown");
    await orderSave.click();

    // The write reached the DB (one patch, this card only).
    await expect.poll(readNameOrder).toBe("latin");

    // Re-loading shows it selected — no separate "unsaved" state lingering.
    await page.goto(settingsRoute);
    await expect(page.getByRole("radio", { name: "Latin first" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });
});

test.describe("Tree settings — delete (Spec 11 a7/a8)", () => {
  test("delete needs the exact name + real counts, and no filled red (a7/a8)", async ({ page }) => {
    await page.goto(settingsRoute);

    // a8: the danger action is quiet-red text, not a filled red button.
    const trigger = page.locator(".settings-danger-action");
    await expect(trigger).toBeVisible();
    await expect(page.locator(".settings-danger .btn-primary")).toHaveCount(0);

    await trigger.click();
    const dialog = page.locator(".dialog");
    await expect(dialog).toBeVisible();
    // a7: states the real counts (seed = 4 people, 1 household).
    await expect(dialog).toContainText("4 people");
    await expect(dialog).toContainText("1 household");

    // a7: the action stays disabled until the exact tree name is typed.
    const action = dialog.locator(".btn-danger");
    await expect(action).toBeDisabled();
    const confirmField = dialog.getByLabel(/Type .* to confirm/);
    await confirmField.fill("not the name");
    await expect(action).toBeDisabled();
    await confirmField.fill(SEED.tree.name);
    await expect(action).toBeEnabled();

    // Never actually delete the seed — cancel out.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator(".dialog")).toHaveCount(0);
  });
});

/**
 * a1 — non-keepers see every setting read-only, with the sub-line, never a
 * hidden page. Runs as the writer member (designreview3) of the seed tree.
 */
test.describe("Tree settings — read-only for non-keepers (Spec 11 a1)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a writer sees the cards read-only with no Save (a1)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#auth-email").fill(WRITER.email);
    await page.locator("#auth-password").fill(WRITER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".chrome-avatar-link")).toBeVisible({ timeout: 20_000 });

    await page.goto(settingsRoute);
    // Same page, same sub-line — never hidden.
    await expect(page.locator(".settings-sub")).toHaveText(
      "Only the keeper can change these. Everyone else sees them read-only."
    );
    // No controls: no Save buttons, no editable name field, no danger zone.
    await expect(page.locator(".settings-save")).toHaveCount(0);
    await expect(page.getByLabel("Tree name")).toHaveCount(0);
    await expect(page.locator(".settings-danger")).toHaveCount(0);
    // But the values are all present as plain text.
    await expect(page.locator(".settings-readonly-value").first()).toBeVisible();
  });
});
