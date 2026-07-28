import path from "node:path";

/**
 * Shared E2E fixtures: the storageState path the auth setup writes, and the
 * seeded data every in-tree test reads. The seed lives in the local Supabase
 * stack (see IMPLEMENTATION.md — auth fixture). designreview2 owns the Ishaan
 * Verma tree; its password is set deterministically by scripts before tests.
 */

export const AUTH_FILE = path.join(process.cwd(), ".playwright", "auth", "user.json");

export const SEED = {
  email: "designreview2@local.test",
  password: "password123",
  userId: "b55abbd6-d155-42b6-a4da-52c5af73b58f",
  tree: {
    id: "tree_e9PAKZi8KB",
    name: "Ishaan Verma family tree",
  },
  people: {
    // The signed-in user's own record (root of the tree).
    you: { id: "p_b55abbd6-d155-42b6-a4da-52c5af73b58f", latin: "Ishaan Verma", sex: "M" },
    wife: { id: "p_meera", latin: "Meera Verma", sex: "F" },
    son: { id: "p_arjun", latin: "Arjun Verma", sex: "M" },
    daughter: { id: "p_sara", latin: "Sara Verma", sex: "F" },
  },
} as const;

/** Route for the seeded tree canvas and its sub-pages. */
export const treeRoute = (sub = ""): string =>
  `/tree/${SEED.tree.id}${sub ? `/${sub.replace(/^\//, "")}` : ""}`;
