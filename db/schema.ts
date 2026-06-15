/**
 * Vanshavali database schema (Postgres / Supabase).
 *
 * This schema is the multi-tenant target described in `docs/ARCHITECTURE.md` §4.
 * Each user can own multiple trees and be invited to others; people / families
 * are tree-scoped; roles live on `tree_members` (per-tree), not on `users`.
 *
 * Row-Level Security policies that enforce per-tree access are defined in
 * `db/migrations/0001_initial.sql` — the schema here just shapes the tables.
 */

import {
  pgTable,
  text,
  jsonb,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// users — one row per auth identity (mirrors Supabase auth.users.id).
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  uid: text("uid").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// trees — every tree has exactly one owner.
// ---------------------------------------------------------------------------
export const trees = pgTable(
  "trees",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerUid: text("owner_uid")
      .notNull()
      .references(() => users.uid, { onDelete: "restrict" }),
    visibility: text("visibility").notNull().default("private"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index("trees_owner_idx").on(table.ownerUid),
  })
);

// ---------------------------------------------------------------------------
// tree_members — per-tree role assignment. Replaces the global users.role.
// ---------------------------------------------------------------------------
export const treeMembers = pgTable(
  "tree_members",
  {
    treeId: text("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    uid: text("uid")
      .notNull()
      .references(() => users.uid, { onDelete: "cascade" }),
    role: text("role").notNull(),
    personId: text("person_id"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.treeId, table.uid] }),
    uidIdx: index("tree_members_uid_idx").on(table.uid),
  })
);

// ---------------------------------------------------------------------------
// people — tree-scoped. Person ids only need to be tree-unique.
//
// The `data` jsonb column holds the rich Person shape (name, sex, events,
// custom_fields, image_url, root flag) — keeps the schema flexible while the
// product is still evolving.
// ---------------------------------------------------------------------------
export const people = pgTable(
  "people",
  {
    id: text("id").primaryKey(),
    treeId: text("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull(),
    userId: text("user_id").references(() => users.uid, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    treeIdx: index("people_tree_idx").on(table.treeId),
    // At most one Person per (tree, linked user) — prevents two people in the
    // same tree both claiming the same auth identity.
    treeUserUnique: uniqueIndex("people_tree_user_unique")
      .on(table.treeId, table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
    // At most one root: true per tree. Enforced as a partial unique index on a
    // jsonb expression — Postgres supports this.
    treeRootUnique: uniqueIndex("people_tree_root_unique")
      .on(table.treeId)
      .where(sql`(${table.data}->>'root')::boolean = true`),
  })
);

// ---------------------------------------------------------------------------
// families — tree-scoped, references people inside the same tree.
//
// husband_id / wife_id are nullable to support single-parent families. The
// legacy `partners[]` field is intentionally not modeled — clean slate.
// ---------------------------------------------------------------------------
export const families = pgTable(
  "families",
  {
    id: text("id").primaryKey(),
    treeId: text("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    husbandId: text("husband_id").references(() => people.id, {
      onDelete: "set null",
    }),
    wifeId: text("wife_id").references(() => people.id, {
      onDelete: "set null",
    }),
    children: text("children")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    treeIdx: index("families_tree_idx").on(table.treeId),
  })
);

// ---------------------------------------------------------------------------
// tree_invites — email-based invites. Recipient may not have an account yet.
// ---------------------------------------------------------------------------
export const treeInvites = pgTable(
  "tree_invites",
  {
    id: text("id").primaryKey(),
    treeId: text("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.uid, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    treeIdx: index("tree_invites_tree_idx").on(table.treeId),
    emailIdx: index("tree_invites_email_idx").on(table.email),
  })
);

// ---------------------------------------------------------------------------
// suggestions — site-level feedback inbox (not tree-scoped).
// ---------------------------------------------------------------------------
export const suggestions = pgTable("suggestions", {
  id: text("id").primaryKey(),
  uid: text("uid")
    .notNull()
    .references(() => users.uid, { onDelete: "cascade" }),
  message: text("message").notNull(),
  status: text("status").notNull().default("unread"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations — Drizzle uses these for typed joins / nested queries.
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  ownedTrees: many(trees),
  memberships: many(treeMembers),
  invitesSent: many(treeInvites),
  suggestions: many(suggestions),
}));

export const treesRelations = relations(trees, ({ one, many }) => ({
  owner: one(users, { fields: [trees.ownerUid], references: [users.uid] }),
  members: many(treeMembers),
  people: many(people),
  families: many(families),
  invites: many(treeInvites),
}));

export const treeMembersRelations = relations(treeMembers, ({ one }) => ({
  tree: one(trees, { fields: [treeMembers.treeId], references: [trees.id] }),
  user: one(users, { fields: [treeMembers.uid], references: [users.uid] }),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  tree: one(trees, { fields: [people.treeId], references: [trees.id] }),
  user: one(users, { fields: [people.userId], references: [users.uid] }),
}));

export const familiesRelations = relations(families, ({ one }) => ({
  tree: one(trees, { fields: [families.treeId], references: [trees.id] }),
  husband: one(people, {
    fields: [families.husbandId],
    references: [people.id],
    relationName: "family_husband",
  }),
  wife: one(people, {
    fields: [families.wifeId],
    references: [people.id],
    relationName: "family_wife",
  }),
}));

// Type exports — these mirror the row shapes that providers will hand back to
// application code. They're separate from the domain types in src/types/* so
// the persistence layer can evolve without forcing the UI to track every
// internal column rename.
export type DbUser = typeof users.$inferSelect;
export type DbTree = typeof trees.$inferSelect;
export type DbTreeMember = typeof treeMembers.$inferSelect;
export type DbPerson = typeof people.$inferSelect;
export type DbFamily = typeof families.$inferSelect;
export type DbTreeInvite = typeof treeInvites.$inferSelect;
export type DbSuggestion = typeof suggestions.$inferSelect;

export type NewDbUser = typeof users.$inferInsert;
export type NewDbTree = typeof trees.$inferInsert;
export type NewDbTreeMember = typeof treeMembers.$inferInsert;
export type NewDbPerson = typeof people.$inferInsert;
export type NewDbFamily = typeof families.$inferInsert;
export type NewDbTreeInvite = typeof treeInvites.$inferInsert;
export type NewDbSuggestion = typeof suggestions.$inferInsert;
