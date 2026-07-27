import { describe, expect, it } from "vitest";
import { canEdit, canInvite, canViewTree, isOwner, isMember } from "@/lib/access";
import { TREE_ROLES } from "@/constants";

describe("canViewTree", () => {
  it.each([TREE_ROLES.VIEWER, TREE_ROLES.EDITOR, TREE_ROLES.OWNER])(
    "%s can view the tree",
    (role) => {
      expect(canViewTree(role)).toBe(true);
    }
  );

  it.each([null, undefined, "", "unknown", "pending", "denied"])(
    "%s cannot view the tree",
    (role) => {
      expect(canViewTree(role)).toBe(false);
    }
  );
});

describe("canEdit", () => {
  it.each([TREE_ROLES.EDITOR, TREE_ROLES.OWNER])("%s can edit", (role) => {
    expect(canEdit(role)).toBe(true);
  });

  it.each([TREE_ROLES.VIEWER, null, undefined, "", "admin"])("%s cannot edit", (role) => {
    expect(canEdit(role)).toBe(false);
  });
});

describe("isOwner / canInvite", () => {
  it("owner is owner and can invite", () => {
    expect(isOwner(TREE_ROLES.OWNER)).toBe(true);
    expect(canInvite(TREE_ROLES.OWNER)).toBe(true);
  });

  it.each([TREE_ROLES.EDITOR, TREE_ROLES.VIEWER, null, undefined])("%s is not owner", (role) => {
    expect(isOwner(role)).toBe(false);
    expect(canInvite(role)).toBe(false);
  });
});

describe("isMember", () => {
  it.each([TREE_ROLES.OWNER, TREE_ROLES.EDITOR, TREE_ROLES.VIEWER])("%s is a member", (role) => {
    expect(isMember(role)).toBe(true);
  });

  it.each([null, undefined])("%s is not a member", (role) => {
    expect(isMember(role)).toBe(false);
  });
});
