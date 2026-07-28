import { afterEach, describe, expect, it, vi } from "vitest";
import { canEdit, canInvite, canViewTree, isOwner, isSiteAdmin } from "@/lib/access";
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

describe("isSiteAdmin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("matches uids on the comma-separated allowlist (whitespace tolerated)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ADMIN_UIDS", "uid_a, uid_b");
    expect(isSiteAdmin("uid_a")).toBe(true);
    expect(isSiteAdmin("uid_b")).toBe(true);
    expect(isSiteAdmin("uid_c")).toBe(false);
  });

  it("denies everyone when the allowlist is unset or empty", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ADMIN_UIDS", "");
    expect(isSiteAdmin("uid_a")).toBe(false);
    expect(isSiteAdmin(null)).toBe(false);
    expect(isSiteAdmin(undefined)).toBe(false);
  });
});
