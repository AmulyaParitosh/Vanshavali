import { describe, expect, it } from "vitest";
import { canEdit, canViewTree, isAdmin } from "./access";
import { USER_ROLES } from "../constants";

describe("canViewTree", () => {
  it.each([USER_ROLES.VIEWER, USER_ROLES.EDITOR, USER_ROLES.ADMIN])(
    "%s can view the tree",
    (role) => {
      expect(canViewTree(role)).toBe(true);
    }
  );

  it.each([USER_ROLES.PENDING, USER_ROLES.DENIED, null, undefined, "", "unknown"])(
    "%s cannot view the tree",
    (role) => {
      expect(canViewTree(role)).toBe(false);
    }
  );
});

describe("canEdit", () => {
  it.each([USER_ROLES.EDITOR, USER_ROLES.ADMIN])("%s can edit", (role) => {
    expect(canEdit(role)).toBe(true);
  });

  it.each([USER_ROLES.VIEWER, USER_ROLES.PENDING, USER_ROLES.DENIED, null, undefined, "", "owner"])(
    "%s cannot edit",
    (role) => {
      expect(canEdit(role)).toBe(false);
    }
  );
});

describe("isAdmin", () => {
  it("admin is admin", () => {
    expect(isAdmin(USER_ROLES.ADMIN)).toBe(true);
  });

  it.each([USER_ROLES.EDITOR, USER_ROLES.VIEWER, null, undefined])("%s is not admin", (role) => {
    expect(isAdmin(role)).toBe(false);
  });
});
