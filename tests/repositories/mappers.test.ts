import { describe, expect, it } from "vitest";
import {
  familyToRow,
  personToRow,
  rowToFamily,
  rowToPerson,
  rowToSuggestion,
  rowToTreeInvite,
  rowToTreeMembership,
  rowToTreeMeta,
  type FamilyRow,
  type PersonRow,
  type SuggestionRow,
  type TreeInviteRow,
  type TreeMemberRow,
  type TreeRow,
} from "@/repositories/mappers";
import type { Person } from "@/types/person";
import type { Family } from "@/types/family";

/**
 * The mappers are the only place where Postgres column shapes meet domain
 * shapes. A silent regression here would corrupt every read/write that goes
 * through the Supabase provider, so they're worth pinning down with explicit
 * round-trip assertions.
 */

describe("rowToTreeMeta", () => {
  it("maps owner_uid → ownerUid and parses created_at to millis", () => {
    const row: TreeRow = {
      id: "tree_a",
      name: "Sharma family",
      owner_uid: "uid_owner",
      visibility: "private",
      created_at: "2026-06-16T12:00:00.000Z",
    };
    expect(rowToTreeMeta(row)).toEqual({
      id: "tree_a",
      name: "Sharma family",
      ownerUid: "uid_owner",
      visibility: "private",
      createdAt: new Date("2026-06-16T12:00:00.000Z").getTime(),
    });
  });

  it("treats an unknown visibility string as the column value as-is (no silent default)", () => {
    const row: TreeRow = {
      id: "t",
      name: "n",
      owner_uid: "u",
      visibility: "something-new",
      created_at: "2026-06-16T12:00:00.000Z",
    };
    expect(rowToTreeMeta(row).visibility).toBe("something-new");
  });
});

describe("rowToTreeMembership", () => {
  it("omits personId when person_id is null (exactOptionalPropertyTypes)", () => {
    const row: TreeMemberRow = {
      tree_id: "t",
      uid: "u",
      role: "editor",
      person_id: null,
      joined_at: "2026-06-16T12:00:00.000Z",
    };
    const m = rowToTreeMembership(row);
    expect(m.role).toBe("editor");
    expect(m).not.toHaveProperty("personId");
  });

  it("includes personId when present", () => {
    const row: TreeMemberRow = {
      tree_id: "t",
      uid: "u",
      role: "owner",
      person_id: "p_42",
      joined_at: "2026-06-16T12:00:00.000Z",
    };
    expect(rowToTreeMembership(row).personId).toBe("p_42");
  });
});

describe("rowToPerson / personToRow round-trip", () => {
  const fullPerson: Person = {
    id: "p_1",
    name: { official_name: "Alice", aliases: ["Ali"] },
    sex: "F",
    events: [{ type: "birth", date: "1990-01-01" }],
    custom_fields: { occupation: "teacher" },
    image_url: "https://x/y.jpg",
    image_storage_path: "trees/t/people/p_1/y.jpg",
    root: true,
    userId: "uid_alice",
    version: 3,
  };

  it("round-trips a fully-populated Person without loss", () => {
    const row = personToRow(fullPerson, "tree_main");
    // version is a row column personToRow drops (it isn't part of the data blob);
    // the DB supplies it, so reconstruct it here the way the repository would.
    const reconstructed = rowToPerson({
      ...row,
      version: 3,
      created_at: "2026-06-16T12:00:00.000Z",
      updated_at: "2026-06-16T12:00:00.000Z",
    });
    expect(reconstructed).toEqual(fullPerson);
  });

  it("personToRow strips id and userId into top-level columns, not into data", () => {
    const row = personToRow(fullPerson, "tree_main");
    expect(row.id).toBe("p_1");
    expect(row.user_id).toBe("uid_alice");
    expect(row.tree_id).toBe("tree_main");
    expect(row.data).not.toHaveProperty("id");
    expect(row.data).not.toHaveProperty("userId");
    expect(row.data.name.official_name).toBe("Alice");
  });

  it("personToRow turns missing userId into null (not absent) so PostgREST accepts it", () => {
    const noUserPerson: Person = {
      id: "p_2",
      name: { official_name: "Bob" },
      sex: "M",
    };
    const row = personToRow(noUserPerson, "tree_main");
    expect(row.user_id).toBeNull();
  });

  it("rowToPerson omits userId when user_id is null (exactOptionalPropertyTypes)", () => {
    const row: PersonRow = {
      id: "p_2",
      tree_id: "tree_main",
      data: { name: { official_name: "Bob" }, sex: "M" },
      user_id: null,
      version: 1,
      created_at: "2026-06-16T12:00:00.000Z",
      updated_at: "2026-06-16T12:00:00.000Z",
    };
    const person = rowToPerson(row);
    expect(person.id).toBe("p_2");
    expect(person).not.toHaveProperty("userId");
  });
});

describe("rowToFamily / familyToRow round-trip", () => {
  const couple: Family = {
    id: "f_1",
    husband: "p_h",
    wife: "p_w",
    children: ["p_c1", "p_c2"],
  };

  it("round-trips a couple-with-children family", () => {
    const row = familyToRow(couple, "tree_main");
    const reconstructed = rowToFamily({
      ...row,
      created_at: "2026-06-16T12:00:00.000Z",
      updated_at: "2026-06-16T12:00:00.000Z",
    });
    expect(reconstructed).toEqual(couple);
  });

  it("familyToRow turns missing husband/wife into null", () => {
    const single: Family = { id: "f_2", husband: "p_only", children: [] };
    const row = familyToRow(single, "tree_main");
    expect(row.husband_id).toBe("p_only");
    expect(row.wife_id).toBeNull();
    expect(row.children).toEqual([]);
  });

  it("rowToFamily omits husband/wife when their ids are null", () => {
    const row: FamilyRow = {
      id: "f_3",
      tree_id: "tree_main",
      husband_id: null,
      wife_id: "p_w",
      children: [],
      created_at: "2026-06-16T12:00:00.000Z",
      updated_at: "2026-06-16T12:00:00.000Z",
    };
    const family = rowToFamily(row);
    expect(family).not.toHaveProperty("husband");
    expect(family.wife).toBe("p_w");
  });

  it("rowToFamily tolerates null children array from a partial row by coercing to []", () => {
    const row = {
      id: "f_4",
      tree_id: "tree_main",
      husband_id: "p_h",
      wife_id: null,
      // mimic a row read where the Postgres array column came back null
      children: null as unknown as string[],
      created_at: "2026-06-16T12:00:00.000Z",
      updated_at: "2026-06-16T12:00:00.000Z",
    } as FamilyRow;
    expect(rowToFamily(row).children).toEqual([]);
  });
});

describe("rowToTreeInvite", () => {
  it("maps snake_case columns and millis timestamps", () => {
    const row: TreeInviteRow = {
      id: "inv_1",
      tree_id: "t",
      email: "a@b.com",
      role: "editor",
      invited_by: "uid_owner",
      status: "pending",
      created_at: "2026-06-16T12:00:00.000Z",
      expires_at: "2026-06-23T12:00:00.000Z",
    };
    const invite = rowToTreeInvite(row);
    expect(invite).toEqual({
      id: "inv_1",
      treeId: "t",
      email: "a@b.com",
      role: "editor",
      invitedBy: "uid_owner",
      status: "pending",
      createdAt: new Date("2026-06-16T12:00:00.000Z").getTime(),
      expiresAt: new Date("2026-06-23T12:00:00.000Z").getTime(),
    });
  });

  it("omits expiresAt when expires_at is null", () => {
    const row: TreeInviteRow = {
      id: "inv_2",
      tree_id: "t",
      email: "a@b.com",
      role: "viewer",
      invited_by: "uid_owner",
      status: "pending",
      created_at: "2026-06-16T12:00:00.000Z",
      expires_at: null,
    };
    expect(rowToTreeInvite(row)).not.toHaveProperty("expiresAt");
  });
});

describe("rowToSuggestion", () => {
  it("maps uid → userId and created_at → millis", () => {
    const row: SuggestionRow = {
      id: "s_1",
      uid: "uid_sender",
      message: "Hello",
      status: "unread",
      created_at: "2026-06-16T12:00:00.000Z",
    };
    const sugg = rowToSuggestion(row);
    expect(sugg).toEqual({
      id: "s_1",
      userId: "uid_sender",
      message: "Hello",
      status: "unread",
      timestamp: new Date("2026-06-16T12:00:00.000Z").getTime(),
    });
  });
});
