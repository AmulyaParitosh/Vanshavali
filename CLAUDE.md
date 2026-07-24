# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Direction (June 2026)

This project is being **migrated to multi-tenancy and off Firebase entirely** for public release. See `docs/ARCHITECTURE.md` for the target architecture, data model, and phased migration plan. See `docs/SUPABASE-SETUP.md` for the end-to-end provisioning checklist (manual steps the migrations can't do — storage policies, realtime publication, OAuth config). See `docs/DESIGN-LANGUAGE.md` for the visual identity. See `docs/BACKLOG.md` for deferred design / refactor work that's been scoped but not picked up. See `CONTRIBUTING.md` for dev workflow.

Locked-in decisions (do not re-litigate without a strong reason):

- **Backend**: Supabase (Postgres + Auth + Storage + Realtime). No Firebase / GCP anywhere.
- **Auth providers**: Google + email/password.
- **Tenancy**: Tree owners + invites. Per-tree roles: `owner` / `editor` / `viewer`. Global admin role is gone.
- **Existing Firebase data**: archived, not migrated. Clean slate on launch.
- **Invitations**: email-based, auto-link on signup.
- **Tree visualization**: React + D3 hybrid — D3 for layout math only, nodes as React components inside `<foreignObject>` (closes the current XSS surface).
- **Visual identity**: Madhubani / Mithila heritage as **surface accents** (banner, decorative borders, key surfaces). Generic UI stays clean and accessible.
- **Quality tooling**: ESLint, Prettier, Vitest + React Testing Library. No Playwright in v1.
- **Hosting**: parked — decide before launch.

**While the migration is in progress**, the current code still uses Firebase. Do not write new Firebase code; write against the upcoming Supabase provider implementations (or refactor in pure-domain code that's backend-agnostic). The provider abstraction (`AuthProvider`, `DataProvider`, `StorageProvider`) survives the migration.

## Commands

- `npm run dev` — start Next.js dev server at `http://localhost:3000`
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:generate` — Drizzle Kit: generate a new migration from `db/schema.ts` changes
- `npm run db:push` — Drizzle Kit: push schema directly to the DB at `DATABASE_URL` (dev only)
- `npm run db:studio` — Drizzle Studio (visual DB browser)
- `npm run db:apply-policies` — apply RLS policies + triggers from `db/migrations/0001_initial.sql`
- `npx tsx scripts/sync-firebase.ts` — legacy; pulls Firebase data into `.local_data/`
- `npx tsx scripts/migrate-user-person-relation.ts` — legacy local-data migration

The TypeScript config is strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).

## Environment

Copy `.env.sample` → `.env` (gitignored) and fill values. Key vars:

- `NEXT_PUBLIC_APP_ENV` — `local` (file-backed, default for dev) or `supabase`. Firebase support was removed in Phase 8.
- `NEXT_PUBLIC_LOCAL_USER_UID` — mock UID used in local mode.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client config.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; for routes that bypass RLS.
- `DATABASE_URL` — Postgres connection string used by Drizzle Kit migrations.
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — transactional email (invitations).
- `NEXT_PUBLIC_SITE_URL` — canonical site origin used to build invite-acceptance URLs in outbound email. Defaults to request origin when unset.
- `NEXT_PUBLIC_SITE_ADMIN_UIDS` — comma-separated allowlist for the global suggestions inbox.

If `NEXT_PUBLIC_APP_ENV` is unset, the factory defaults to `supabase` when Supabase env vars are present, else `local`.

## Architecture

### Provider abstraction (the central pattern)

All backend access (auth, data, storage) goes through interfaces in `src/services/types.ts`. `DataProvider` is split per ISP into focused sub-interfaces — `UserProvider`, `TreeMetaProvider`, `TreeDataProvider`, `MembershipProvider`, `InvitationProvider`, `SuggestionProvider`. Consumers should type their dependencies against the narrowest one they need. Two implementations:

- `src/services/local/` — file-backed providers hitting Next.js API routes under `src/app/api/local/`. The local DB layout is `.local_data/db/{global}.json` for global collections (users, trees, suggestions) and `.local_data/db/trees/{treeId}/{collection}.json` for per-tree data (people, families, members, invites). Retained as the dev/test double.
- `src/services/supabase/` — Phase 1 scaffold; methods throw `NotImplementedError` until Phase 5/6/7 land the real implementations against `db/schema.ts`.

`ProviderFactory.getProviders()` (`src/services/ProviderFactory.ts`) chooses one set based on `NEXT_PUBLIC_APP_ENV` and memoizes it. **Any new backend operation must be added to the interface and implemented in _both_ the local and Supabase providers** — otherwise one mode silently breaks.

Local-mode subscriptions are 5s-polled (`LOCAL_DATA_CONFIG.POLLING_INTERVAL`) and dedupe via JSON string comparison so the callback only fires when content actually changes. Supabase will use Realtime channels.

### App bootstrap, tenancy, and auth gating

`src/app/layout.tsx` wraps everything in `AppProvider` (`src/providers/AppProvider.tsx`), which calls `useAuthAndData()`. That hook composes:

- `useProviders()` — memoized `{ auth, data, storage }` from the factory.
- `useAuthUser(authProvider)` — subscribes to auth state; returns `{ user, isLoaded }`.
- `useUserProfile(user, userProvider)` — fetches / creates the user's global profile (just name/email/photo — roles live on memberships).
- `useMyTrees(uid, provider)` — subscribes to the user's list of owned + invited trees.
- `useTreeMembership(treeId, uid, provider)` — subscribes to the user's role + linked person in the active tree.
- `useTreeSubscription(treeId, provider)` — subscribes to people / families of the active tree.

First-sign-in auto-provisions a tree for the user as owner, seeded with one root Person representing them. `currentTreeId` defaults to the user's first owned tree; Phase 9 makes it sourceable from the URL.

`AppProvider` renders one of `Loading`, `LoginScreen`, or `children`. The pending/denied screens are gone — under multi-tenancy a new user goes straight to their own tree, and access to other trees is gated per-membership.

Role gating uses the predicates in `src/lib/access.ts`: `canViewTree(role)`, `canEdit(role)`, `isOwner(role)`, `canInvite(role)`. Don't inline role string comparisons; use the helpers. Roles are `owner | editor | viewer` (defined in `TREE_ROLES`).

### Data model

Domain types in `src/types/`:

- `Person` — `id`, `name.official_name`, `sex: 'M'|'F'`, optional `events`, `custom_fields`, `image_url`, `userId` (link to the auth user that represents this person _in this tree_), `root: true` on exactly one person _per tree_.
- `Family` — `husband?`, `wife?`, `children: string[]`. The legacy `partners?: string[]` field is removed at the schema level but still tolerated in pure-domain code via the `familyPartners(family)` helper — use the helper.
- `Tree`, `TreeMeta`, `TreeMembership`, `TreeInvite` types in `src/types/tree.ts`.

Per-tree uniqueness:

- One root Person per tree (enforced by `ConsistencyValidator` and a partial unique index in Postgres).
- One linked Person per (tree, uid) pair — i.e. a single auth user maps to at most one Person within a tree, but can be linked across multiple trees.

### Database (multi-tenant target)

`db/schema.ts` defines the Postgres schema in Drizzle ORM. Tables: `users`, `trees`, `tree_members`, `people`, `families`, `tree_invites`, `suggestions`. See `docs/ARCHITECTURE.md` §4 for the full shape.

`db/migrations/0001_initial.sql` contains the RLS policies + triggers. Applied via `npm run db:apply-policies`. RLS is what actually enforces per-tree access; the client uses the anon key.

`drizzle.config.ts` points Drizzle Kit at `DATABASE_URL`.

### Tree rendering and graph logic

`src/lib/graph/GraphManager.ts` is the pure-domain graph layer (no React, no provider awareness). It builds a D3-ready hierarchy from `(people, families)`:

- `buildHierarchy()` — produces a tree rooted at the person with `root: true`. Each family becomes a "partner group" node; a child who is themself a partner in another family gets _replaced_ by that family's node, with `lineageMemberId` marking which side of the couple continues the line.
- `getAncestors` / `getDescendants` — BFS over family memberships.
- `findPath(a, b)` — BFS shortest path producing `{personId, relation}` steps (Spouse / Parent / Child / Sibling).

`ConsistencyValidator.validate(graphManager)` (`src/lib/graph/ConsistencyValidator.ts`) reports phantom IDs, missing `sex`, self-as-parent cycles, and multiple-root violations.

The D3 visualization is decomposed in `src/components/tree/`: `useTreeLayout` (pure math), `useTreeZoom` (d3-zoom wired to refs), `<PersonNode>` / `<PartnerNode>` / `<TreeLink>` / `<DetailsCard>` (React components inside `<foreignObject>`). `src/components/Tree.tsx` is the composition. Details cards are React-rendered so user content is auto-escaped (no XSS surface).

### Routing

App router under `src/app/`. All non-`/api` routes currently operate on `currentTreeId` from `AppContext`; Phase 9 introduces `/tree/[id]/*` route scoping.

- `/` — tree visualization (gated by membership in the active tree)
- `/family` — family editor
- `/people` — searchable list of people
- `/about` — static info page
- `/user/profile` — global user profile (name/email/photo) + per-tree linked-person editor
- `/user/suggestions` — site-level feedback inbox; gated by the `NEXT_PUBLIC_SITE_ADMIN_UIDS` allowlist
- `/invite/[id]` — invite-acceptance landing; calls `/api/invite/accept` after the user is signed in
- `/api/invite/send` — server route; sends the invitation email via Resend after the owner creates an invite
- `/api/invite/accept` — server route; uses the service-role client to atomically validate the invite + create the `tree_members` row + mark the invite accepted (RLS blocks the invitee from doing this client-side)
- `/api/local/db` — local-mode database; supports `?collection=...` for global, `?collection=...&tree=...` for tree-scoped, and `DELETE ?tree=...` for tree deletion
- `/api/local/storage` — local-mode file storage

## Conventions

- Strict TypeScript everywhere. Imports must use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- `'use client'` is required at the top of any component that uses hooks or browser APIs.
- Constants and string literals for roles, suggestion statuses, and local-mode config live in `src/constants/index.ts` — reuse `TREE_ROLES`, `SUGGESTION_STATUS`, `LOCAL_DATA_CONFIG.GLOBAL_COLLECTIONS` / `TREE_COLLECTIONS` instead of inlining strings.
- Styling: single global stylesheet at `src/app/globals.css` with the token system documented in `docs/DESIGN-LANGUAGE.md`; no CSS-in-JS or modules in new code.

## Deployment

Hosting is parked (Firebase App Hosting was the legacy target; not used anymore). Phase 15 picks a host before public launch — viable options include Vercel, Cloudflare Pages, Netlify, Railway, Fly.io, self-host.
