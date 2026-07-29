import { test, expect } from "@playwright/test";
import { SEED, treeRoute } from "./fixtures";

/**
 * Spec 06 — Members, the one list of people. M-A covers the table: the column set,
 * generation→birth ordering (a10), search (a9), the May column as a read-only
 * display with NO inline role control (a3), and a row that opens the record.
 * Invite/Add/duplicate-guard panels and the in-place inspector follow (M-B..M-E).
 */

const membersRoute = treeRoute("members");

test.describe("Members — the list (Spec 06)", () => {
  test("the table carries the full Spec 06 column set", async ({ page }) => {
    await page.goto(membersRoute);
    const head = page.locator(".records-thead");
    await expect(head).toContainText("Name");
    await expect(head).toContainText("Gen");
    await expect(head).toContainText("Born");
    await expect(head).toContainText("Relation to you");
    await expect(head).toContainText("Updated");
    await expect(head).toContainText("May");
  });

  test("rows are ordered by generation, not alphabetically (a10)", async ({ page }) => {
    await page.goto(membersRoute);
    const gens = page.locator(".records-row .records-col-gen");
    await expect(gens.first()).toHaveText("I"); // the root generation leads
    // Ishaan (gen I) sorts above his children (gen II) — alphabetical would put
    // Arjun first.
    const firstName = page.locator(".records-row .records-name-primary").first();
    await expect(firstName).toHaveText("Ishaan Verma");
  });

  test("the May column states each person's access, with no inline control (a3)", async ({
    page,
  }) => {
    await page.goto(membersRoute);
    // The signed-in keeper's own row shows the Keeper chip.
    const youRow = page.locator(".records-row", { hasText: "Ishaan Verma" });
    await expect(youRow.locator(".records-col-relation")).toHaveText("you");
    await expect(youRow.locator(".records-col-may .chip")).toHaveText("Keeper");
    // The editor member reads Write; an account-less relative reads "no account".
    await expect(
      page.locator(".records-row", { hasText: "Meera Verma" }).locator(".records-col-may .chip")
    ).toHaveText("Write");
    await expect(
      page.locator(".records-row", { hasText: "Arjun Verma" }).locator(".records-noaccount")
    ).toHaveText("no account");
    // a3: roles are never written from the table — no <select> lives in it.
    await expect(page.locator(".records-table select")).toHaveCount(0);
  });

  test("a row opens the shared record (a1) — it links to the person, not a new page", async ({
    page,
  }) => {
    await page.goto(membersRoute);
    const row = page.locator(".records-row", { hasText: "Meera Verma" });
    await expect(row).toHaveAttribute("href", new RegExp(`\\?person=${SEED.people.wife.id}`));
    await row.click();
    await expect(page.locator(".inspector-name")).toHaveText("Meera Verma");
  });

  test("search filters by name and alias without re-ordering (a9)", async ({ page }) => {
    await page.goto(membersRoute);
    await page.locator(".records-search input").fill("meera");
    await expect(page.locator(".records-row")).toHaveCount(1);
    await expect(page.locator(".records-row .records-name-primary")).toHaveText("Meera Verma");
    await page.locator(".records-search input").fill("zzzznobody");
    await expect(page.locator(".records-empty")).toHaveText("Nobody here by that name");
  });
});
