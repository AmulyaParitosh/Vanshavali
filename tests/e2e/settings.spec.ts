import { test, expect } from "@playwright/test";
import { SEED, treeRoute } from "./fixtures";

/**
 * Spec 11 — Tree settings. Deleting the record requires the exact tree name typed
 * and states the real counts (a7); the danger action is quiet-red text, never a
 * filled red button (a8). This suite never confirms the delete (it would destroy
 * the seed tree) — it stops at Cancel.
 */

test.describe("Tree settings — delete (Spec 11 a7/a8)", () => {
  test("delete needs the exact name + real counts, and no filled red (a7/a8)", async ({ page }) => {
    await page.goto(treeRoute("settings"));

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
