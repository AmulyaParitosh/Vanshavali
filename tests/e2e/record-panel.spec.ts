import { test, expect } from "@playwright/test";
import { SEED, treeRoute } from "./fixtures";

/**
 * Spec 07 — record panel. Read mode (sub-unit A); the access block, edit-in-place
 * and write footer follow. Acceptance covered here: a2 (opening never changes the
 * route), a7 (prose names are working links that swap the panel in place), plus
 * the relation-to-viewer reading from the record's sex (a10).
 */

const you = SEED.people.you.id;
const son = SEED.people.son.id;

test.describe("Record panel — read mode (Spec 07)", () => {
  test("opening a record never changes the route (a2)", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".inspector")).toBeVisible();
    // The path is the tree canvas — no /person/ route of its own.
    expect(new URL(page.url()).pathname).toBe(treeRoute());
  });

  test("every name in the prose lineage is a link that swaps the panel in place (a7)", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".inspector-name")).toHaveText("Ishaan Verma");
    await page.locator(".prose-link", { hasText: "Arjun Verma" }).click();
    await expect(page.locator(".inspector-name")).toHaveText("Arjun Verma");
    // Swapped in place: still the tree route, no navigation.
    expect(new URL(page.url()).pathname).toBe(treeRoute());
  });

  test("the relation to the viewer reads from the record's sex, never hard-coded (a10)", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".inspector-relation-line")).toHaveText("this is you");
    await page.goto(`${treeRoute()}?person=${son}`);
    await expect(page.locator(".inspector-relation-line")).toHaveText("your son");
  });

  test("the header carries the generation·line eyebrow and the record name", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".inspector .eyebrow").first()).toHaveText(
      "Generation I · Verma line"
    );
    await expect(page.locator(".inspector-name")).toHaveText("Ishaan Verma");
    await expect(page.locator(".inspector-prose")).toContainText("Married Meera Verma");
  });

  test("the same panel serves the ⌘K search — a hit opens the record in place (a1)", async ({
    page,
  }) => {
    await page.goto(treeRoute());
    await expect(page.locator(".inspector")).toHaveCount(0);
    await page.locator(".chrome-search").click();
    await page.locator(".cmdk-panel input").fill("Meera");
    await page.locator(".cmdk-row", { hasText: "Meera Verma" }).first().click();
    // One inspector component, opened from search — and still no route of its own (a1/a2).
    await expect(page.locator(".inspector-name")).toHaveText("Meera Verma");
    expect(new URL(page.url()).pathname).toBe(treeRoute());
  });
});

test.describe("Record panel — access block, read display (Spec 07 a3)", () => {
  test("a member's access is stated to the viewer: role chip + since", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    const block = page.locator(".access-block");
    await expect(block.locator(".chip")).toHaveText("Keeper");
    await expect(block.locator(".access-line")).toContainText("since");
  });

  test("the eyebrow is gendered by the record, never hard-coded (a10)", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${you}`); // Ishaan, M
    await expect(page.locator(".access-block .eyebrow")).toHaveText("What he may do");
    await page.goto(`${treeRoute()}?person=${SEED.people.wife.id}`); // Meera, F
    await expect(page.locator(".access-block .eyebrow")).toHaveText("What she may do");
  });

  test("your own record states who may change it", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".access-self")).toHaveText(
      "This is your access. Only a keeper can change it."
    );
  });

  test("an account-less person reads Not on Vanshavali yet, with Invite for a keeper", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${son}`);
    await expect(page.locator(".access-none")).toContainText("Not on Vanshavali yet");
    await expect(page.locator(".access-none").getByRole("link", { name: /Invite/ })).toBeVisible();
  });
});

test.describe("Record panel — edit in place (Spec 07 a2/a4/a9)", () => {
  test("Edit record opens fields in place, no route change; footer only when dirty", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await page.getByRole("button", { name: "Edit record" }).click();

    // Fields in place, same route (a2), the shared form present (a9).
    await expect(page.locator(".record-editor")).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue("Ishaan Verma");
    expect(new URL(page.url()).pathname).toBe(treeRoute());

    // Clean: no footer, so Save is not even offered (disabled-until-dirty, a4).
    await expect(page.locator(".record-editor-foot")).toHaveCount(0);

    // Dirty: the footer appears with Save.
    await page.getByLabel("Name").fill("Ishaan K. Verma");
    await expect(page.locator(".record-editor-foot")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();

    // Discard returns to read mode without writing.
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.locator(".record-editor")).toHaveCount(0);
    await expect(page.locator(".inspector-name")).toHaveText("Ishaan Verma");
  });

  test("closing a dirty edit routes through the itemised leaving guard (a6, §10)", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await page.getByRole("button", { name: "Edit record" }).click();
    await page.getByLabel("Name").fill("Ishaan K. Verma");

    // ✕ while dirty → the guard, itemising the change; never a browser confirm.
    await page.locator(".icon-close").click();
    const guard = page.getByRole("dialog", { name: "Leave without saving?" });
    await expect(guard).toBeVisible();
    await expect(guard.locator(".verb-chip")).toHaveText("Changed");
    await expect(guard.locator(".leave-value")).toContainText("Name");
    for (const name of ["Save and leave", "Keep editing", "Throw them away"]) {
      await expect(guard.getByRole("button", { name })).toBeVisible();
    }
    expect(new URL(page.url()).pathname).toBe(treeRoute()); // no navigation

    // Keep editing keeps the panel and the edits.
    await guard.getByRole("button", { name: "Keep editing" }).click();
    await expect(guard).toHaveCount(0);
    await expect(page.getByLabel("Name")).toHaveValue("Ishaan K. Verma");

    // Throw them away leaves without saving.
    await page.locator(".icon-close").click();
    await page.getByRole("button", { name: "Throw them away" }).click();
    await expect(page.locator(".inspector")).toHaveCount(0);
  });

  test("closing a clean panel does not raise the guard", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await page.locator(".icon-close").click();
    await expect(page.getByRole("dialog", { name: "Leave without saving?" })).toHaveCount(0);
    await expect(page.locator(".inspector")).toHaveCount(0);
  });

  test("Save shows the confirmation toast with a 12s Undo (flow 2/3)", async ({ page }) => {
    // Non-destructive round trip: edit relative to the current value (always
    // dirty), Save, then Undo back — the seed is preserved whatever it started at.
    await page.goto(`${treeRoute()}?person=${you}`);
    await page.getByRole("button", { name: "Edit record" }).click();
    const nameField = page.getByLabel("Name");
    const original = await nameField.inputValue();
    await nameField.fill(`${original} ·`);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // The toast names the tree and what the family now sees, and offers Undo.
    const toast = page.locator(".toast-viewport .toast");
    await expect(toast).toBeVisible();
    await expect(toast.locator(".toast-primary")).toContainText("Saved to");
    await expect(toast.locator(".toast-consequence")).toContainText("everyone sees it now");

    // Undo fires and confirms with its own toast (restoring the previous state).
    await toast.getByRole("button", { name: "Undo" }).click();
    await expect(page.locator(".toast-viewport .toast")).toContainText("Put back the way it was");
  });
});

test.describe("Record panel — keeper access write (Spec 07 a3/a5)", () => {
  const wife = SEED.people.wife.id;

  test("a keeper sees the role radio set with the stored role marked now", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${wife}`);
    await expect(page.locator(".access-roles")).toBeVisible();
    await expect(page.locator(".radio-row", { hasText: "Write" }).locator(".radio-now")).toHaveText(
      "now"
    );
  });

  test("changing the role saves with no confirmation step, and Undo restores (a5)", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${wife}`);
    await page.locator(".radio-row", { hasText: "Read" }).click();

    // No confirmation dialog before saving a role change (a5) — just a Save.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const save = page.locator(".access-controls").getByRole("button", { name: "Save" });
    await expect(save).toBeVisible();
    await save.click();

    const toast = page.locator(".toast-viewport .toast");
    await expect(toast.locator(".toast-primary")).toContainText("may now read the tree");

    // Undo restores the previous role, leaving the seed clean. The confirmation
    // toast only appears once the restore write has resolved server-side, so wait
    // for it — the radio alone can read "now" off stale state before the write
    // lands, which would end the test (and close the page) mid-request.
    await toast.getByRole("button", { name: "Undo" }).click();
    await expect(page.locator(".toast-viewport .toast")).toContainText("Put back the way it was");
    await expect(page.locator(".radio-row", { hasText: "Write" }).locator(".radio-now")).toHaveText(
      "now"
    );
  });

  test("your own record shows no role radio — only a keeper can change your access", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${you}`);
    await expect(page.locator(".access-roles")).toHaveCount(0);
    await expect(page.locator(".access-self")).toBeVisible();
  });
});

test.describe("Record panel — Remove access (Spec 07 a8)", () => {
  const wife = SEED.people.wife.id;

  test("Remove access opens a consequence dialog naming what stays; Cancel is non-destructive", async ({
    page,
  }) => {
    await page.goto(`${treeRoute()}?person=${wife}`);
    await page.getByRole("button", { name: "Remove access" }).click();

    const dlg = page.getByRole("dialog", { name: /Remove Meera Verma's access/ });
    await expect(dlg).toBeVisible();
    await expect(dlg.locator(".consequence")).toContainText("keeps their record");
    // Never a filled red button (the action is the quiet destructive pill).
    await expect(dlg.getByRole("button", { name: "Remove access" })).toHaveClass(/btn-danger/);

    // Cancel changes nothing — Meera is still a Write member.
    await dlg.getByRole("button", { name: "Cancel" }).click();
    await expect(dlg).toHaveCount(0);
    await expect(page.locator(".radio-row", { hasText: "Write" }).locator(".radio-now")).toHaveText(
      "now"
    );
  });
});
