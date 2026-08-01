import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { SEED, treeRoute } from "./fixtures";

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

/**
 * Spec 08 — Households. H-B covers the list: the column set (Partners · Married ·
 * Children · Gen), generation ordering, the "no marriage date" absence, and a row
 * opening the editor. The editor internals (marriage prose, reorder, delete) are H-C+.
 */

const route = treeRoute("families");

test.describe("Households — the list (Spec 08)", () => {
  test("the table carries the Spec 08 columns", async ({ page }) => {
    await page.goto(route);
    const head = page.locator(".records-thead");
    await expect(head).toContainText("Partners");
    await expect(head).toContainText("Married");
    await expect(head).toContainText("Children");
    await expect(head).toContainText("Gen");
  });

  test("a household reads partners, marriage, children and generation", async ({ page }) => {
    await page.goto(route);
    const row = page.locator(".records-row", { hasText: "Ishaan Verma" });
    await expect(row.locator(".records-name-primary")).toHaveText("Ishaan Verma & Meera Verma");
    // No marriage date recorded in the seed → stated as an absence, not blank.
    await expect(row.locator(".hh-col-married")).toHaveText("no date recorded");
    await expect(row.locator(".hh-col-children")).toContainText("2");
    await expect(row.locator(".hh-col-gen")).toHaveText("I");
  });

  test("clicking a household opens the editor in place", async ({ page }) => {
    await page.goto(route);
    await page.locator(".records-row", { hasText: "Ishaan Verma" }).click();
    await expect(page.locator(".inspector")).toBeVisible();
    await expect(page.locator(".inspector")).toContainText("Children · eldest first");
    expect(new URL(page.url()).pathname).toBe(route);
  });
});

test.describe("Households — the editor (Spec 08)", () => {
  const openEditor = async (page: import("@playwright/test").Page) => {
    await page.goto(route);
    await page.locator(".records-row", { hasText: "Ishaan Verma" }).click();
    await expect(page.locator(".inspector")).toBeVisible();
  };

  test("marriage facts read back as prose; editing reveals the footer (a5)", async ({ page }) => {
    await openEditor(page);
    const prose = page.locator(".hh-marriage-prose");
    // The seed household (Ishaan & Meera) has two children, so the count reads
    // back as its own sentence (Spec 08 c10).
    await expect(prose).toHaveText("No marriage date recorded. Two children.");
    // A clean editor shows no footer (nothing to save).
    await expect(page.locator(".inspector-foot")).toHaveCount(0);
    // Typing a date reads back as a sentence (place first, then date) and reveals Save.
    await page.getByLabel("Marriage date").fill("1983");
    await expect(prose).toHaveText("Married on 1983. Two children.");
    await page.getByLabel("Marriage place").fill("Ranchi");
    await expect(prose).toHaveText("Married at Ranchi on 1983. Two children.");
    await expect(
      page.locator(".inspector-foot").getByRole("button", { name: "Save" })
    ).toBeVisible();
  });

  test("children reorder by Alt+Arrow, in birth order (a3)", async ({ page }) => {
    await openEditor(page);
    const names = page.locator(".hh-child .hh-child-name");
    await expect(names.first()).toHaveText("Arjun Verma");
    await page.locator(".hh-child").first().focus();
    await page.keyboard.press("Alt+ArrowDown");
    // The eldest slot is now the other child — reorder is live (not yet saved).
    await expect(names.first()).toHaveText("Sara Verma");
  });

  test("Delete household routes through the consequence dialog; Cancel is non-destructive (a6)", async ({
    page,
  }) => {
    await openEditor(page);
    await page.getByRole("button", { name: "Delete household" }).click();
    const dialog = page.locator(".dialog");
    await expect(dialog).toBeVisible();
    // Names what stays — the children keep their own records.
    await expect(dialog).toContainText("keep their own records");
    // The destructive action is the quiet-red pill, not a filled red button.
    await expect(dialog.locator(".btn-danger")).toHaveText("Delete household");
    // Cancel leaves the household in place.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator(".dialog")).toHaveCount(0);
    await expect(page.locator(".inspector")).toBeVisible();
  });

  test("each partner's lineage label matches the ring colour (a2)", async ({ page }) => {
    await openEditor(page);
    // Ishaan is born into the line; Meera married in.
    await expect(
      page.locator(".hh-partner", { hasText: "Ishaan Verma" }).locator(".hh-tag")
    ).toHaveText("lineage");
    await expect(
      page.locator(".hh-partner", { hasText: "Meera Verma" }).locator(".hh-tag")
    ).toHaveText("married in");
  });

  test("removing a child from the household leaves the list live, person untouched (a4)", async ({
    page,
  }) => {
    await openEditor(page);
    await expect(page.locator(".hh-child")).toHaveCount(2);
    await page
      .locator(".hh-child", { hasText: "Arjun Verma" })
      .getByRole("button", { name: "Remove child" })
      .click();
    // Removed from the household (live, not yet saved) — one child left.
    await expect(page.locator(".hh-child")).toHaveCount(1);
    // The person is never in the delete path — Arjun is still a record in the tree.
    const arjunExists = await withDb((c) =>
      c
        .query("select count(*)::int n from people where id=$1", [SEED.people.son.id])
        .then((r) => r.rows[0]!.n)
    );
    expect(arjunExists).toBe(1);
  });
});

test.describe("Households — saving (Spec 08 a7)", () => {
  test.afterEach(async () => {
    // Restore the seed household (this test writes marriage facts).
    await withDb((c) =>
      c.query("update families set marriage_date=null, marriage_place=null where id='f_root'")
    );
  });

  test("saving marriage facts persists and re-lays the list without a reload (a7)", async ({
    page,
  }) => {
    await page.goto(route);
    await page.locator(".records-row", { hasText: "Ishaan Verma" }).click();
    await page.getByLabel("Marriage date").fill("1983");
    await page.getByLabel("Marriage place").fill("Ranchi");
    await page.locator(".inspector-foot").getByRole("button", { name: "Save" }).click();
    // The list re-lays with the saved facts — same route, no reload.
    await expect(
      page.locator(".records-row", { hasText: "Ishaan Verma" }).locator(".hh-col-married")
    ).toHaveText("1983, Ranchi");
    expect(new URL(page.url()).pathname).toBe(route);
    // Persisted to the DB (poll — the save is an async round-trip).
    await expect
      .poll(() =>
        withDb((c) =>
          c
            .query("select marriage_date, marriage_place from families where id='f_root'")
            .then((r) => `${r.rows[0]!.marriage_date}, ${r.rows[0]!.marriage_place}`)
        )
      )
      .toBe("1983, Ranchi");
  });
});
