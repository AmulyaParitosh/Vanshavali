# Vanshavali Architecture

This document describes both the **current** architecture (as audited in 2026-06) and the **target** architecture that the codebase is being migrated to for the public release. When the two diverge, the section is split with **Current** and **Target** sub-sections. All file paths are relative to the repo root.

## 1. Product

Vanshavali is a multi-tenant family-tree application. Each authenticated user can own one or more family trees and invite specific family members to view or edit specific trees. Permissions are per-tree, not global. The visual identity is rooted in Madhubani / Mithila heritage and is carried by the tree visualization, decorative borders, and key surfaces — the bulk of interactive UI stays clean and accessible.

### Personas

- **Owner** — created a tree. Full control: add/edit data, invite members, change member roles, delete the tree.
- **Editor** — invited with edit rights. Can add/edit people and families. Cannot manage members or delete the tree.
- **Viewer** — invited with read-only rights. Sees everything the editor sees; can change nothing.

Roles are scoped to a single tree. The same user can be an Owner of one tree and a Viewer of another.

### Out of scope for v1

- Shareable read-only public links (deferred).
- Public/discoverable trees (all trees are private).
- Branch-scoped permissions (no "you can only edit the maternal side").
- GEDCOM / PDF exports (deferred).
- Billing / monetization.
- Native mobile apps.

---

## 2. Tech stack

### Current

- **Framework**: Next.js 15 (App Router) on React 18, TypeScript with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- **Backend (data + auth + storage)**: Firebase Realtime Database, Firebase Auth (Google only), Firebase Storage. Project config hardcoded in `src/lib/firebase.ts`.
- **Visualization**: D3.js 7 (imperative DOM manipulation inside `src/components/Tree.tsx`).
- **Styling**: single global stylesheet `src/app/globals.css` with CSS custom properties. No CSS-in-JS, no CSS modules.
- **Email** (broken): `nodemailer` wired in `src/app/api/send-access-request.ts` with placeholder credentials; this endpoint also uses the legacy Pages-API signature and does not actually execute under the App Router.
- **Deployment**: Firebase App Hosting via GitHub integration on `main`.

### Target

- **Framework**: Next.js 15 / React / TypeScript — unchanged.
- **Backend**: **Supabase** — managed Postgres + Auth (Google + email/password) + Storage. Real-time tree subscriptions via Supabase Realtime channels. Replaces Firebase entirely (per project owner decision: no GCP/Google services).
- **Schema**: plain SQL migrations under `db/migrations/` (no ORM). `supabase-js` is the runtime query layer; RLS enforces access.
- **Visualization**: D3 retained for hierarchy/layout math only; nodes and ornaments rendered as **React components inside `<foreignObject>`** (closes the current XSS surface and makes the tree testable).
- **Styling**: same global stylesheet model. New design tokens for spacing, type scale, semantic color roles (`--color-danger`, `--color-success`, etc.) and elevation. Heritage motifs as **surface accents** — banner, decorative borders, key empty/login/error states — not on every button.
- **Email**: Resend for transactional invites. SMTP creds in `.env` only (never committed).
- **Quality tooling**: ESLint (TypeScript + React + jsx-a11y), Prettier, Vitest + React Testing Library for unit tests on graph logic and providers. Husky + lint-staged pre-commit. No Playwright in v1.
- **Deployment**: undecided (user has explicitly parked this — viable options include Vercel, Cloudflare Pages, Netlify, Railway, Fly.io, self-host).

---

## 3. Provider abstraction (preserved across migration)

The single most important architectural pattern in the codebase. All backend access flows through interfaces in `src/services/types.ts`:

- `AuthProvider` — auth state, sign-in/out.
- `DataProvider` — tree data, users, suggestions, memberships, invites.
- `StorageProvider` — file uploads.

Two implementations of each:

- **Firebase** (`src/services/firebase/`) — being removed.
- **Local** (`src/services/local/`) — file-backed, hits `src/app/api/local/db` and `src/app/api/local/storage` which read/write `.local_data/db/*.json` and `.local_data/storage/`. **Retained** as the dev/test double for the migrated codebase.

After migration:

- **Supabase** (`src/services/supabase/`, new) — replaces Firebase.
- **Local** — kept, schema mirrored: `.local_data/db/trees/{treeId}/people.json` (per-tree paths replace the flat layout).

`ProviderFactory.getProviders()` (`src/services/ProviderFactory.ts`) returns the Supabase providers and memoizes them. `NEXT_PUBLIC_ENV` (`local` | `prod`) selects which Supabase they target — the local `supabase start` stack or the cloud project — via `src/lib/supabaseEnv.ts`. The file-backed local provider was retired as a runtime mode; it survives only as the unit-test double.

### Invariant

> **Any new backend operation must be added to the interface and implemented in _both_ the Supabase and local providers** — otherwise local mode silently breaks. This applies during and after the migration.

### Interface split (target)

The current `DataProvider` mixes tree data, user profiles, admin user list, suggestions, and link operations into one interface (ISP violation flagged in the code audit). Target split:

- `TreeDataProvider` — `subscribeToTreeData(treeId)`, `saveTreeData(treeId, ...)`, `linkUserToPerson(treeId, ...)`.
- `UserProvider` — `getUserProfile(uid)`, `createUserProfile(uid, ...)`.
- `TreeMetaProvider` — `createTree(...)`, `deleteTree(treeId)`, `listMyTrees(uid)`, `subscribeToMyTrees(uid)`, `getTreeMeta(treeId)`.
- `MembershipProvider` — `getMembership(treeId, uid)`, `subscribeToMembers(treeId)`, `updateMemberRole(...)`, `removeMember(...)`.
- `InvitationProvider` — `createInvite(...)`, `acceptInvite(...)`, `revokeInvite(...)`, `subscribeToInvites(treeId)`.
- `SuggestionProvider` — global site feedback only; unchanged signature.

Composed via `ProviderConfig`.

---

## 4. Data model

### Current (Firebase RTDB, single global tree)

```
/people:          Person[]    — global flat array, root: true on exactly one
/families:        Family[]    — global flat array
/users:           { [uid]: { email, name, role, personId? } }
/suggestions:     { [id]: Suggestion }
```

`Person.userId` links a person to an auth user (canonical since the `migrate-user-person-relation.ts` script ran). `users[uid].personId` is the deprecated reverse pointer.

### Target (Postgres / Supabase, multi-tenant)

```sql
-- Users — one row per auth identity
users (
  uid              text primary key,           -- matches Supabase auth.users.id
  email            text not null,
  name             text,
  photo_url        text,
  created_at       timestamptz default now()
)

-- Trees — owned by exactly one user, members have per-tree roles
trees (
  id               text primary key,           -- nanoid
  name             text not null,
  owner_uid        text not null references users(uid),
  created_at       timestamptz default now(),
  visibility       text not null default 'private'   -- 'private' for v1; future-proof
)

-- Per-tree membership — replaces the global `users.role`
tree_members (
  tree_id          text not null references trees(id) on delete cascade,
  uid              text not null references users(uid),
  role             text not null check (role in ('owner','editor','viewer')),
  person_id        text,                       -- which Person inside this tree is the linked identity (nullable)
  joined_at        timestamptz default now(),
  primary key (tree_id, uid)
)

-- Tree-scoped people
people (
  id               text primary key,           -- tree-unique, not globally unique
  tree_id          text not null references trees(id) on delete cascade,
  data             jsonb not null,             -- official_name, sex, events, custom_fields, image_url, root, etc.
  user_id          text references users(uid), -- the auth user this person represents WITHIN THIS TREE
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
)
create unique index one_root_per_tree on people (tree_id) where (data->>'root')::boolean = true;

-- Tree-scoped families
families (
  id               text primary key,
  tree_id          text not null references trees(id) on delete cascade,
  husband_id       text references people(id),
  wife_id          text references people(id),
  children         text[] not null default '{}',  -- array of person ids
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
)

-- Email-based invitations to a tree
tree_invites (
  id               text primary key,           -- nanoid; used in /invite/[id] accept link
  tree_id          text not null references trees(id) on delete cascade,
  email            text not null,              -- normalized lowercase
  role             text not null check (role in ('editor','viewer')),  -- never invite as owner
  invited_by       text not null references users(uid),
  status           text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  created_at       timestamptz default now(),
  expires_at       timestamptz                  -- e.g. now() + interval '14 days'
)

-- Site-level feedback (global, not tree-scoped)
suggestions (
  id               text primary key,
  uid              text not null references users(uid),
  message          text not null,
  status           text not null default 'unread' check (status in ('unread','read','archived','prioritized')),
  created_at       timestamptz default now()
)
```

**Key changes vs current**:

- `Person` and `Family` are tree-scoped (every row has `tree_id`). Person ids only need to be tree-unique, not globally unique.
- `Person.root: true` becomes "exactly one per tree" — enforced by a partial unique index.
- `User.role` is **gone**. Roles live on `tree_members.role`.
- `User.personId` is **gone**. The linkage is on `tree_members.person_id` (and additionally on `people.user_id` for fast within-tree lookup).
- The `partners?: string[]` legacy fallback on `Family` is **removed** (we're rebuilding the schema; the archived Firebase data will be discarded per the user's decision).
- Suggestions stay global — only a designated site-admin (env-var allowlisted UID) sees the inbox. The pending-approval gate is **gone**: new users self-provision a tree on sign-up.

### Domain types (target)

`src/types/`:

- `person.ts` — `Person` interface, unchanged at the field level. Drop `image_storage_path` (Supabase Storage URLs are self-describing). `userId` semantic narrows to per-tree.
- `family.ts` — drop deprecated `partners?: string[]`. Keep `husband?`, `wife?`, `children: string[]`.
- `tree.ts` — new: `Tree`, `TreeMeta`, `TreeMembership`, `TreeInvite`, role union types.

### Domain logic (preserved across migration)

`src/lib/graph/GraphManager.ts` and `src/lib/graph/ConsistencyValidator.ts` are pure domain code: no React, no provider awareness. Constructor takes `(people, families)`. They remain unchanged after the migration except:

- The `[family.husband, family.wife, ...partners].filter(Boolean)` idiom is replaced by a `familyPartners(family)` helper (the `partners` legacy field is gone, so the idiom collapses to `[husband, wife].filter(Boolean)`).
- `ConsistencyValidator` gains a rule: "exactly one Person with `root: true` per `(tree_id)`" — currently implicit, made explicit so a bad import doesn't silently produce a tree with two roots.

---

## 5. Auth & multi-tenancy bootstrap

### Current (`src/hooks/useAuthAndData.ts`)

Single source of truth for `AuthUser`, the user's global role (`pending | denied | viewer | editor | admin`), `personId`, and the global `TreeData` subscription. Auto-creates the user profile with `role: 'pending'` on first sign-in. Role-gates the tree behind `viewer | editor | admin`; `editor | admin` may call `onSave`.

### Target

The single god-hook is decomposed (audit SOLID finding):

- `useAuthUser()` — returns the current `AuthUser` from the `AuthProvider`. Pure auth state.
- `useUserProfile(user)` — fetches/creates the user's `UserProfile`. On first sign-in: creates the profile _and_ their first tree (with themselves as the root Person and `owner` membership). No more `pending` / `denied` global states.
- `useMyTrees(uid)` — subscribes to `{ owned: TreeMeta[], member: TreeMeta[] }`.
- `useCurrentTree(treeId)` — given a tree id from the URL, subscribes to tree data and the current user's membership in that tree (`{ role, personId? }`). Returns `null` for both if not a member (caller renders an access-denied per-tree screen).

`AppProvider` composes these and exposes:

```ts
useAppContext() => {
  user: AuthUser | null,
  myTrees: { owned, member } | null,
  currentTreeId: string | null,        // from URL [id] param
  treeData: TreeData | null,           // people + families for currentTreeId
  membership: { role, personId? } | null,
  canEdit: boolean,                    // derived: ['owner','editor'].includes(membership.role)
  dataProvider, authProvider, storageProvider,
  onSave, refreshUser, signOut,
}
```

The context value is memoized so consumers don't cascade-rerender on unrelated state changes (audit perf finding).

### First-time sign-up flow

1. User signs in with Google or email/password (Supabase Auth).
2. `users` row created (idempotent via upsert) with email + name + photo_url.
3. If the user owns zero trees: create their first tree (`{ name: "${displayName}'s family", owner_uid: uid, ... }`), seed one Person `{ id: p_${nanoid()}, name.official_name: displayName, sex: 'M' (TBD via onboarding), root: true, user_id: uid }`, write membership `{ tree_id, uid, role: 'owner', person_id: <the seeded person> }`.
4. Redirect to `/tree/{newTreeId}` and start the onboarding tour.

### Invitation accept flow

1. Owner enters `email + role` on `/tree/[id]/members`. A row in `tree_invites` is created with status `pending`.
2. Resend sends an email with a link to `/invite/[inviteId]`.
3. Recipient clicks the link:
   - **If not signed in**: prompted to sign up or sign in. On successful sign-in, redirected back to `/invite/[inviteId]`.
   - **If signed in**: server-side checks the invite is `pending`, not expired, and the user's email matches (normalized). Creates a `tree_members` row, marks invite `accepted`, redirects to `/tree/[id]`.

---

## 6. Routing

### Current

```
/                       — tree (single global)
/family                 — split editor for families
/people                 — split editor for people
/about                  — static info
/user/profile           — link to a Person, view role
/user/access_requests   — global admin: approve/deny pending users
/user/management        — global admin: change user roles
/user/suggestions       — global admin: triage feedback
/api/local/db           — local-mode backend
/api/local/storage      — local-mode backend
/api/send-access-request — broken endpoint (Pages-API signature, App Router doesn't route to it)
```

### Target

```
/                       — landing: list of "My trees" (owned + member). If exactly one tree, redirect to it.
/trees                  — alias of / for explicit access (optional)
/tree/[id]              — visual tree (the visualization)
/tree/[id]/family       — family editor (split view)
/tree/[id]/people       — people editor (split view)
/tree/[id]/members      — members list, invite UI, role changes, remove (owner only for changes)
/tree/[id]/settings     — tree name, delete, transfer ownership (owner only)
/about                  — static, unchanged
/user/profile           — global user info: name, photo, email, list of trees, account deletion
/user/suggestions       — site-admin only (env-var allowlisted UID); replaces the global admin page
/invite/[id]            — accept-invite landing
/auth/sign-in           — sign-in screen (Google + email/password)
/auth/sign-up           — sign-up screen
/auth/reset-password    — password reset flow
/api/invite/send        — server route, calls Resend
/api/local/db           — kept, accepts `?tree=<id>&collection=...`
/api/local/storage      — kept, paths under `images/trees/{treeId}/...`
```

Deleted: `/user/access_requests`, `/user/management`, `/api/send-access-request`. Their per-tree replacements are `/tree/[id]/members`.

---

## 7. Security model

### Current

- All role gating is **client-side**. Any authenticated user can write to `users/{uid}.role` and self-promote unless Realtime DB security rules forbid it. There are **no security rules in the repo** (audit critical finding).
- API keys hardcoded in `src/lib/firebase.ts`. Web API keys aren't secret per se but enable abuse if rules are loose.

### Target (Supabase Row-Level Security)

Every table has RLS enabled. The policies enforce per-tree access on the server, not in the client.

```sql
-- people: read if you're a member of the tree; write if you're owner or editor
create policy "members_can_read_people" on people for select using (
  exists (select 1 from tree_members tm where tm.tree_id = people.tree_id and tm.uid = auth.uid())
);
create policy "editors_can_write_people" on people for insert, update, delete using (
  exists (select 1 from tree_members tm where tm.tree_id = people.tree_id and tm.uid = auth.uid() and tm.role in ('owner','editor'))
);

-- families: same shape as people
-- ...

-- tree_members: readable by any member of the tree; writable only by owner
create policy "members_can_read_members" on tree_members for select using (
  exists (select 1 from tree_members tm where tm.tree_id = tree_members.tree_id and tm.uid = auth.uid())
);
create policy "owners_can_write_members" on tree_members for insert, update, delete using (
  exists (select 1 from tree_members tm where tm.tree_id = tree_members.tree_id and tm.uid = auth.uid() and tm.role = 'owner')
);

-- tree_invites: invitee can read their own pending invites; owner can read all for trees they own
-- ...

-- users: a user can read/write only their own row; cannot change their own uid
create policy "self_user_read_write" on users for select, update using (uid = auth.uid());
-- Insert handled by a trigger on Supabase auth.users (no direct insert from client).
```

The Next.js app talks to Supabase using the user's JWT. The anon key is public (it's designed to be), but RLS is the actual access control. There is no client-side trust assumption.

### Other security work

- **XSS in `Tree.tsx`**: the `createDetailsHtml` function (lines 23-53) builds HTML strings from raw user data and renders via D3 `.html(string)`. Editors can inject scripts that run for all viewers. Fix: render details cards as React components inside `<foreignObject>` (no string interpolation).
- **Local-mode endpoints** (`src/app/api/local/db/route.ts`, `storage/route.ts`) accept arbitrary `collection` / `path` strings. Allowlist collections, and verify `path.join(...)` resolves inside the storage root (prevent traversal).
- **Image upload**: validate `file.size` and `file.type` client-side (rejected to spare network) and again server-side (Supabase Storage policies).
- **Suggestions**: enforce `userId === auth.uid()` via RLS — the client cannot submit suggestions impersonating another user.

---

## 8. Visual / UI architecture (summary; see `DESIGN-LANGUAGE.md` for full spec)

- Single global stylesheet `src/app/globals.css`. No CSS modules, no CSS-in-JS for new code (existing inline `style` attributes are migration-debt to clean up).
- Design tokens in `:root`. New tokens added for **spacing scale**, **type scale**, **semantic colors** (`--color-danger`, `--color-success`, `--color-warning`, `--color-info`), and **neutral scale** (`--color-neutral-50` through `--color-neutral-900`).
- Component variants live as CSS class modifiers, not as JSX prop branching to inline styles.
- Heritage motifs (Madhubani patterns, decorative borders, banner) live on key surfaces — sign-in, header, tree, empty/error states — not on every button.
- Icon system: a single library (Lucide or Phosphor, TBD) replacing the current ad-hoc mix of Unicode glyphs, HTML entities, and inline SVG.
- Accessibility: every interactive element gets `:focus-visible`; icon-only buttons get `aria-label`; the tree gets keyboard navigation; modals get focus traps.
- Decorative assets get optimized — the current `canvas_background.png` (8.3 MB), `madhubani_banner.png` (2 MB), `node_border.png` (1.9 MB) become SVG / optimized WebP variants. Target: ≤500 KB total decorative weight per page.

---

## 9. Migration plan

The migration runs in **non-breaking ground-prep** → **breaking schema swap** → **multi-tenant UI** → **invitations** → **decommission legacy**. Each phase is one or several PRs.

### Phase A — Ground-prep (non-breaking, can land before Supabase exists)

1. **Refactor pass 1**: lift the repeated patterns out — `familyPartners(family)` helper, `canEdit(role)` predicate, `getPlaceholderUrl(person)` util, `useAdminUsers()` hook, replace all role string literals with `USER_ROLES` constants, eliminate `@ts-ignore` and `as any` in favor of proper types. **No behavior change.** All findings in audit Section 3 (DRY) and Section 5 (Type safety).
2. **Refactor pass 2**: split `useAuthAndData` into `useAuthUser` + `useUserProfile` + `useTreeSubscription`; memoize `AppProvider` context value; split `DataProvider` interface into the smaller-purpose interfaces from §3. **No behavior change.**
3. **Tree.tsx refactor**: split into `<TreeNode>`, `<PartnerNode>`, `<DetailsCard>` React components rendered inside `<foreignObject>`; D3 used only for hierarchy and zoom math. **Closes the XSS surface as a side effect.** Visual parity required.
4. **Add `treeId` parameter to all tree-scoped `DataProvider` methods**, with both implementations treating any non-default value as a no-op for now (a constant `"legacy"`). Plumb `currentTreeId` through `AppContext`. This is the seam that later phases turn into the real multi-tenancy.
5. **Add quality tooling**: ESLint, Prettier, Vitest, husky + lint-staged. Initial test coverage: `GraphManager`, `ConsistencyValidator`, the new helper utilities. CI enforces lint + typecheck + test pass.

### Phase B — Supabase scaffold (parallel work; doesn't ship yet)

6. **Create the Supabase project** (user action). Save URL + anon key in `.env`.
7. **Author schema migrations** (`db/migrations/0001_initial.sql`) — tables from §4, RLS policies from §7.
8. **Author `SupabaseDataProvider`, `SupabaseAuthProvider`, `SupabaseStorageProvider`** — implement the split interfaces against Supabase JS SDK. Real-time subscriptions via Supabase channels.
9. **Update `LocalDataProvider`** to mirror the per-tree path layout (`.local_data/db/trees/{treeId}/people.json`). The local API route accepts `?tree=...`.
10. **`ProviderFactory` always selects Supabase**; `NEXT_PUBLIC_ENV` (`local` | `prod`) chooses local stack vs cloud. (The JSON local mode was later retired as a runtime path — test-double only.)

### Phase C — Critical bug fixes (lands with Phase B or earlier)

11. **Save races**: switch from whole-collection writes to per-entity writes (`updatePerson(treeId, personId, partial)`). Update both providers.
12. **`linkUserToPerson` transactional**: use Supabase's transaction support (or a stored procedure) so the "is already linked" check and the write are atomic.
13. **`findPath` spouse-pair bug**: loop over all spouse pairs in `GraphManager.findPath` (currently only the first two; see audit §1).
14. **`personId === null` redirect race**: track `isProfileLoaded` separately in `useUserProfile`; redirect only when loaded and null.
15. **Error surfacing**: every catch block that currently `console.error`s now also pushes a toast. Failed login/save/fetch becomes visible to the user.

### Phase D — Multi-tenant UI (breaking)

16. **New routes**: `/tree/[id]/*` replaces top-level `/family`, `/people`. `/` becomes the tree picker. Backward-compat redirect from `/family` → `/tree/<defaultTreeId>/family` for any cached links.
17. **Header**: current tree breadcrumb + tree switcher dropdown. Delete the static `Tree`/`People`/`Family` nav links.
18. **`/tree/[id]/members`** page — list members, invite form, role changes, remove member, revoke invite.
19. **`/tree/[id]/settings`** page — tree name, delete (with confirmation), transfer ownership (post-v1).
20. **Auto-create tree on first sign-in**.

### Phase E — Invitations

21. **`POST /api/invite/send`** server route — creates the `tree_invites` row, calls Resend with the email template.
22. **`/invite/[id]`** accept page — handles signed-in and not-signed-in cases.
23. **Email template** — heritage-themed but accessible HTML/text email.

### Phase F — Decommission legacy

24. **Delete** `/user/management`, `/user/access_requests`, `AccessDeniedScreen.tsx`, `PendingApprovalScreen.tsx`, `/api/send-access-request.ts`.
25. **Delete** the Firebase provider files and the hardcoded Firebase config.
26. **Rotate** the existing Firebase API key (it's been committed; treat as compromised) — moot for production but good hygiene.

### Phase G — Polish

27. Design-language pass: consolidate the heritage aesthetic onto identified surfaces; introduce the new spacing/type/semantic-color tokens; clean up the 14 CRITICAL + 49 HIGH UI findings from the audit.
28. Accessibility pass: `aria-*` attributes, `:focus-visible` rules, keyboard navigation on the D3 tree, touch-target sizes.
29. Mobile layout: introduce breakpoints, sidebar collapse, mobile header, pinch-to-zoom on the tree.
30. Decorative asset optimization: PNGs → optimized SVGs / WebP.

### Breaking-change moment

Phase D step 16 (routes change to `/tree/[id]/*`) is the single user-visible breaking moment. Bookmarks to `/family` continue to work via the redirect, but the URL bar changes.

---

## 10. Estimated effort

| Phase                              | Work       | Risk                                                 |
| ---------------------------------- | ---------- | ---------------------------------------------------- |
| A — Ground-prep refactor + tooling | ~5 days    | Low (no behavior change, tests catch regressions)    |
| B — Supabase scaffold              | ~3 days    | Low-medium (schema design is the only judgment call) |
| C — Critical bug fixes             | ~2 days    | Low (mostly mechanical given the audit)              |
| D — Multi-tenant UI                | ~5-7 days  | Medium (every page touched; manual QA needed)        |
| E — Invitations                    | ~3-4 days  | Medium (email plumbing; Resend setup)                |
| F — Decommission                   | ~1 day     | Low (deletion only)                                  |
| G — Polish                         | ~5-10 days | Low-medium (design judgment + lots of small fixes)   |

Total: **~4-6 weeks** of focused work for one engineer.

The biggest unknown is Phase G — design polish is open-ended and the audit found 100+ findings. Aim for the CRITICAL + HIGH list (63 findings) for v1 launch; MEDIUM + LOW are post-launch.

---

## 11. Open questions / parked decisions

- **Hosting**: user has explicitly parked this. Viable options listed in §2 ("Target"). Decision needed before launch.
- **Email-domain restriction for v1**: do we want to soft-restrict signup to specific email providers (to prevent spam during early launch)? TBD.
- **Account deletion / data export**: required for GDPR. Scope for v1 is "delete on request via support email"; automated self-service in v1.5.
- **Site-admin identity**: the deleted global admin role is replaced by a single env-var allowlisted UID for moderating `/user/suggestions`. Mechanism is TBD — env-var allowlist is simplest.
- **Person.userId collision policy**: under multi-tenancy, the same uid can be the linked identity for different Person rows in different trees. This is intentional. We should validate that a single (`tree_id`, `user_id`) pair is unique inside one tree, to prevent two People claiming the same user inside one tree. Already enforced via `linkUserToPerson` transactional check; should also be a Postgres unique index `(tree_id, user_id) where user_id is not null`.

---

_Last updated: 2026-06. Maintained alongside CLAUDE.md. When this document and the code disagree, the code is canonical and this document is wrong — open a PR to fix it._
