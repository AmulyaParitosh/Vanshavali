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

  test("a row opens the shared record in place — no route change (a1/a2)", async ({ page }) => {
    await page.goto(membersRoute);
    await page.locator(".records-row", { hasText: "Meera Verma" }).click();
    // The one shared inspector opens as a right drawer, on this same route.
    await expect(page.locator(".record-dock .inspector-name")).toHaveText("Meera Verma");
    expect(new URL(page.url()).pathname).toBe(membersRoute);
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

test.describe("Members — inviting (Spec 06 a4, invite panel)", () => {
  const arjun = SEED.people.son.id;
  const sara = SEED.people.daughter.id;

  test.afterEach(async () => {
    // Clean up any invites created + undo the deceased marker.
    await withDb((c) => c.query("delete from tree_invites where tree_id=$1", [SEED.tree.id]));
    await withDb((c) =>
      c.query(
        "update people set data = data - 'events' || jsonb_build_object('events','[]'::jsonb) where id=$1",
        [sara]
      )
    );
  });

  test("Invite appears only on account-less rows, never on the linked (a4)", async ({ page }) => {
    await page.goto(membersRoute);
    // Linked people show a chip, not Invite.
    await expect(
      page.locator(".records-row", { hasText: "Ishaan Verma" }).locator(".records-invite")
    ).toHaveCount(0);
    // An account-less relative offers Invite to the keeper.
    await expect(
      page.locator(".records-row", { hasText: "Arjun Verma" }).locator(".records-invite")
    ).toHaveText("Invite");
  });

  test("Invite never appears on a deceased person (a4 / edge e2)", async ({ page }) => {
    await withDb((c) =>
      c.query(
        `update people set data = jsonb_set(data, '{events}', '[{"type":"death","date":"2020"}]'::jsonb, true) where id=$1`,
        [sara]
      )
    );
    await page.goto(membersRoute);
    const saraRow = page.locator(".records-row", { hasText: "Sara Verma" });
    await expect(saraRow.locator(".records-invite")).toHaveCount(0);
    await expect(saraRow.locator(".records-noaccount")).toHaveText("no account");
  });

  test("the Invite pill opens the panel with that person fixed (steps + validation)", async ({
    page,
  }) => {
    await page.goto(membersRoute);
    await page
      .locator(".records-row", { hasText: "Arjun Verma" })
      .locator(".records-invite")
      .click();
    // Opened in place — no route change (a2), the panel names who is chosen.
    expect(new URL(page.url()).pathname).toBe(membersRoute);
    const panel = page.locator(".invite-panel");
    await expect(panel.locator(".invite-heading")).toHaveText("Who are you inviting?");
    await expect(panel.locator(".invite-who-primary")).toHaveText("Arjun Verma");
    await expect(panel.locator(".invite-step-label").first()).toHaveText("1 · who you picked");
    await expect(panel.locator(".invite-role-card")).toHaveCount(2);
    // The message preview states what Send will do (a8).
    await expect(panel.locator(".invite-preview-body")).toContainText("family record");
    // Send is disabled until the email is valid.
    const send = panel.getByRole("button", { name: "Send the invitation" });
    await expect(send).toBeDisabled();
    await panel.getByLabel("Email address").fill("cousin@example.com");
    await expect(send).toBeEnabled();
  });

  test("sending ties the invite to the person; the row then reads Invited", async ({ page }) => {
    await page.goto(membersRoute);
    await page
      .locator(".records-row", { hasText: "Arjun Verma" })
      .locator(".records-invite")
      .click();
    await page
      .locator(".invite-panel")
      .getByLabel("Email address")
      .fill("arjun.invite@example.com");
    await page
      .locator(".invite-panel")
      .getByRole("button", { name: "Send the invitation" })
      .click();
    // The invite lands in the DB tied to Arjun (the outbound email is env-gated, but
    // the row is written regardless).
    await expect
      .poll(() =>
        withDb((c) =>
          c
            .query(
              "select count(*)::int n from tree_invites where person_id=$1 and status='pending'",
              [arjun]
            )
            .then((r) => r.rows[0]!.n)
        )
      )
      .toBe(1);
    // On the keeper's next view, Arjun's May cell reads Invited (not the Invite pill).
    await page.goto(membersRoute);
    const arjunRow = page.locator(".records-row", { hasText: "Arjun Verma" });
    await expect(arjunRow.locator(".chip--invited")).toHaveText("Invited");
    await expect(arjunRow.locator(".records-invite")).toHaveCount(0);
  });
});

test.describe("Members — removing access (Spec 06 a8)", () => {
  // Removing access deletes only the membership; this suite restores it after.
  let saved: { uid: string; role: string; personId: string | null };

  test.beforeAll(async () => {
    saved = await withDb(async (c) => {
      const r = await c.query<{ uid: string; role: string; person_id: string | null }>(
        "select uid, role, person_id from tree_members where person_id=$1",
        [SEED.people.wife.id]
      );
      const row = r.rows[0]!;
      return { uid: row.uid, role: row.role, personId: row.person_id };
    });
  });

  test.afterEach(async () => {
    await withDb((c) =>
      c.query(
        `insert into tree_members(tree_id, uid, role, person_id, joined_at)
         values($1, $2, $3, $4, now())
         on conflict (tree_id, uid) do update set role = excluded.role, person_id = excluded.person_id`,
        [SEED.tree.id, saved.uid, saved.role, saved.personId]
      )
    );
  });

  test("removing a member's access never deletes their person record (a8)", async ({ page }) => {
    await page.goto(`${treeRoute()}?person=${SEED.people.wife.id}`);
    await expect(page.locator(".inspector-name")).toHaveText("Meera Verma");

    // Keeper opens the access block's Remove access → the consequence dialog.
    await page.locator(".btn-danger-text", { hasText: "Remove access" }).click();
    await page.locator(".dialog .btn-danger").click();
    await expect(page.locator(".toast")).toContainText("no longer has access");

    // a8: the PERSON record survives — reopen it, it's still there, now account-less.
    await page.goto(`${treeRoute()}?person=${SEED.people.wife.id}`);
    await expect(page.locator(".inspector-name")).toHaveText("Meera Verma");
    await expect(page.locator(".access-none")).toContainText("Not on Vanshavali yet");
    // And the member is genuinely gone from the DB (not just the UI).
    const remaining = await withDb((c) =>
      c
        .query("select count(*)::int n from tree_members where person_id=$1", [SEED.people.wife.id])
        .then((r) => r.rows[0]!.n)
    );
    expect(remaining).toBe(0);
  });
});
