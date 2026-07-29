import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Person } from "@/types/person";

/**
 * Spec 04 a3/a4/a5/a6 — accepting an invitation. No collision → claim the offered
 * record (f4). Collision + no choice → needs_decision, writing NOTHING (a4).
 * "Yes, that's me" → the user's facts overlay the placeholder IN PLACE, keeping
 * its id so links stay intact (a5). "Someone else" → read membership + the user's
 * own record placed beside, placeholder untouched (a6). Repos mocked.
 */

const findInvite = vi.fn();
const updateStatus = vi.fn();
const findMember = vi.fn();
const insertMember = vi.fn();
const setPersonId = vi.fn();
const ensureUser = vi.fn();
const listByUser = vi.fn();
const findPerson = vi.fn();
const linkUser = vi.fn();
const upsertPerson = vi.fn();

vi.mock("@/repositories/db", () => ({
  getPool: () => ({}),
  transaction: (fn: (tx: unknown) => unknown) => fn({}),
}));
vi.mock("@/repositories/InviteRepository", () => ({
  InviteRepository: {
    find: (...a: unknown[]) => findInvite(...a),
    updateStatus: (...a: unknown[]) => updateStatus(...a),
  },
}));
vi.mock("@/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    find: (...a: unknown[]) => findMember(...a),
    insert: (...a: unknown[]) => insertMember(...a),
    setPersonId: (...a: unknown[]) => setPersonId(...a),
  },
}));
vi.mock("@/repositories/PersonRepository", () => ({
  PersonRepository: {
    listByUser: (...a: unknown[]) => listByUser(...a),
    find: (...a: unknown[]) => findPerson(...a),
    linkUser: (...a: unknown[]) => linkUser(...a),
    upsert: (...a: unknown[]) => upsertPerson(...a),
  },
}));
vi.mock("@/repositories/UserRepository", () => ({
  UserRepository: { ensure: (...a: unknown[]) => ensureUser(...a) },
}));
vi.mock("@/repositories/TreeRepository", () => ({ TreeRepository: {} }));
vi.mock("@/lib/resend", () => ({ sendInviteEmail: vi.fn() }));

import { acceptInvite } from "@/services/invite-service";

const INVITE = {
  id: "inv_1",
  treeId: "tree_1",
  email: "sneha@example.com",
  personId: "p_placeholder",
  role: "editor",
  invitedBy: "u_keeper",
  status: "pending",
  expiresAt: Date.now() + 1_000_000,
};
const CANON: Person = {
  id: "p_canon",
  name: { official_name: "Sneha Mishra" },
  sex: "F",
  events: [{ type: "Birth", date: "2001", place: "Darbhanga" }],
};

beforeEach(() => {
  for (const m of [
    findInvite,
    updateStatus,
    findMember,
    insertMember,
    setPersonId,
    ensureUser,
    listByUser,
    findPerson,
    linkUser,
    upsertPerson,
  ])
    m.mockReset();
  findInvite.mockResolvedValue({ ...INVITE });
  findMember.mockResolvedValue(null);
  linkUser.mockResolvedValue(true);
  findPerson.mockResolvedValue({
    id: "p_placeholder",
    name: { official_name: "Sneha (keeper's guess)" },
    sex: "F",
  });
});

const upserted = (): Person => upsertPerson.mock.calls[0]![2] as Person;

describe("acceptInvite (Spec 04)", () => {
  it("claims the offered record when there is no collision (f4)", async () => {
    listByUser.mockResolvedValue([]); // no existing record
    const res = await acceptInvite("inv_1", "u_new", "sneha@example.com");
    expect(res.status).toBe("joined");
    expect(insertMember).toHaveBeenCalledWith(expect.anything(), "tree_1", "u_new", "editor");
    expect(linkUser).toHaveBeenCalledWith(expect.anything(), "tree_1", "p_placeholder", "u_new");
    expect(setPersonId).toHaveBeenCalledWith(expect.anything(), "tree_1", "u_new", "p_placeholder");
  });

  it("returns needs_decision and writes nothing on a collision with no choice (a4)", async () => {
    listByUser.mockResolvedValue([{ treeId: "tree_other", person: CANON }]);
    const res = await acceptInvite("inv_1", "u_sneha", "sneha@example.com");
    expect(res.status).toBe("needs_decision");
    expect(insertMember).not.toHaveBeenCalled();
    expect(upsertPerson).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("become one: overlays the user's facts onto the placeholder in place (a5)", async () => {
    listByUser.mockResolvedValue([{ treeId: "tree_other", person: CANON }]);
    const res = await acceptInvite("inv_1", "u_sneha", "sneha@example.com", "become_one");
    expect(res.status).toBe("joined");
    const row = upserted();
    expect(row.id).toBe("p_placeholder"); // the row keeps its id — links stay intact
    expect(row.name.official_name).toBe("Sneha Mishra"); // the user's facts win
    expect(row.userId).toBe("u_sneha");
    expect(insertMember).toHaveBeenCalledWith(expect.anything(), "tree_1", "u_sneha", "editor");
    expect(setPersonId).toHaveBeenCalledWith(
      expect.anything(),
      "tree_1",
      "u_sneha",
      "p_placeholder"
    );
  });

  it("someone else: read membership + own record placed beside, placeholder untouched (a6)", async () => {
    listByUser.mockResolvedValue([{ treeId: "tree_other", person: CANON }]);
    const res = await acceptInvite("inv_1", "u_sneha", "sneha@example.com", "separate");
    expect(res.status).toBe("joined");
    expect(res.role).toBe("viewer"); // read access, not the invited editor
    expect(insertMember).toHaveBeenCalledWith(expect.anything(), "tree_1", "u_sneha", "viewer");
    const row = upserted();
    expect(row.id).not.toBe("p_placeholder"); // a NEW row beside — placeholder untouched
    expect(row.name.official_name).toBe("Sneha Mishra");
    expect(row.userId).toBe("u_sneha");
    expect(findPerson).not.toHaveBeenCalled(); // never overwrites the placeholder
  });
});
