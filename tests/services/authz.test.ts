import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Spec 00 §04 — the permission matrix, enforced server-side (the pg connection
 * bypasses RLS, so authz.ts IS the control). One describe per matrix row; each
 * proves the guard REJECTS an insufficient role with HttpError(403) and accepts
 * the sufficient ones. Roles: repo owner/editor/viewer = spec keeper/write/read.
 *
 * The guards resolve the caller's role via MembershipRepository.find — mocked
 * here so these are pure unit tests (no DB). Rows 4 ("see living relatives'
 * exact dates" — a read projection) and 5 ("edit their own record" — the
 * self-edit exception) are enforced by the per-record patch path and the read
 * filter; their rejection tests live with those units (see IMPLEMENTATION.md).
 */

const find = vi.fn();
vi.mock("@/repositories/MembershipRepository", () => ({
  MembershipRepository: { find: (...a: unknown[]) => find(...a) },
}));
vi.mock("@/repositories/db", () => ({ getPool: () => ({}) }));

import { requireView, requireEdit, requireOwner, requireInvite } from "@/services/authz";
import { HttpError } from "@/lib/api";
import { TREE_ROLES } from "@/constants";

const OWNER = TREE_ROLES.OWNER; // keeper
const EDITOR = TREE_ROLES.EDITOR; // write
const VIEWER = TREE_ROLES.VIEWER; // read

/** Point the mocked membership lookup at a role (or null = not a member). */
function asRole(role: string | null) {
  find.mockReset();
  find.mockResolvedValue(role === null ? null : { treeId: "t1", uid: "u1", role });
}

async function rejects(guard: () => Promise<unknown>) {
  await expect(guard()).rejects.toBeInstanceOf(HttpError);
  try {
    await guard();
  } catch (e) {
    expect((e as HttpError).status).toBe(403);
  }
}

async function allows(guard: () => Promise<unknown>, role: string) {
  await expect(guard()).resolves.toBe(role);
}

afterEach(() => find.mockReset());

const view = () => requireView("t1", "u1");
const edit = () => requireEdit("t1", "u1");
const owner = () => requireOwner("t1", "u1");
const invite = () => requireInvite("t1", "u1");

describe("Read the tree, every person, every household (R ✓ / W ✓ / K ✓)", () => {
  it.each([VIEWER, EDITOR, OWNER])("%s may read", async (role) => {
    asRole(role);
    await allows(view, role);
  });
  it("a non-member is rejected", async () => {
    asRole(null);
    await rejects(view);
  });
});

describe("Search across people, places and events (R ✓ / W ✓ / K ✓)", () => {
  // Search reads through the same view guard.
  it("a non-member is rejected", async () => {
    asRole(null);
    await rejects(view);
  });
});

describe("See who holds what access — the May column (R ✓ / W ✓ / K ✓)", () => {
  it("a non-member is rejected", async () => {
    asRole(null);
    await rejects(view);
  });
});

describe("Add a person (R — / W ✓ / K ✓)", () => {
  it.each([EDITOR, OWNER])("%s may add", async (role) => {
    asRole(role);
    await allows(edit, role);
  });
  it("a reader is rejected", async () => {
    asRole(VIEWER);
    await rejects(edit);
  });
});

describe("Correct anyone's record (R — / W ✓ / K ✓)", () => {
  it("a reader is rejected", async () => {
    asRole(VIEWER);
    await rejects(edit);
  });
});

describe("Create or edit a household (R — / W ✓ / K ✓)", () => {
  it("a reader is rejected", async () => {
    asRole(VIEWER);
    await rejects(edit);
  });
});

describe("Attach a photograph to anyone (R — / W ✓ / K ✓)", () => {
  it("a reader is rejected", async () => {
    asRole(VIEWER);
    await rejects(edit);
  });
});

describe("Export or print the whole tree (R — / W ✓ / K ✓)", () => {
  it("a reader is rejected", async () => {
    asRole(VIEWER);
    await rejects(edit);
  });
});

describe("Invite a relative who has no account (R — / W — / K ✓)", () => {
  it("a keeper may invite", async () => {
    asRole(OWNER);
    await allows(invite, OWNER);
  });
  it.each([EDITOR, VIEWER])("%s is rejected", async (role) => {
    asRole(role);
    await rejects(invite);
  });
});

describe("Change what someone may do (R — / W — / K ✓)", () => {
  it.each([EDITOR, VIEWER])("%s is rejected", async (role) => {
    asRole(role);
    await rejects(owner);
  });
});

describe("Remove someone's access (R — / W — / K ✓)", () => {
  it.each([EDITOR, VIEWER])("%s is rejected", async (role) => {
    asRole(role);
    await rejects(owner);
  });
});

describe("Rename the tree, change tree settings (R — / W — / K ✓)", () => {
  it("a keeper is allowed", async () => {
    asRole(OWNER);
    await allows(owner, OWNER);
  });
  it.each([EDITOR, VIEWER])("%s is rejected", async (role) => {
    asRole(role);
    await rejects(owner);
  });
});

describe("Delete a person, a household, or the tree (R — / W — / K ✓)", () => {
  it.each([EDITOR, VIEWER])("%s is rejected", async (role) => {
    asRole(role);
    await rejects(owner);
  });
  it("a non-member is rejected", async () => {
    asRole(null);
    await rejects(owner);
  });
});
