# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Direction (June 2026)

This project was **migrated to multi-tenancy and off Firebase entirely** for public release. See `docs/ARCHITECTURE.md` for the target architecture, data model, and phased migration plan. See `docs/SUPABASE-SETUP.md` for the end-to-end provisioning checklist (manual steps the migrations can't do — storage policies, realtime publication, OAuth config). See `docs/DESIGN-LANGUAGE.md` for the visual identity. See `docs/BACKLOG.md` for deferred design / refactor work that's been scoped but not picked up. See `CONTRIBUTING.md` for dev workflow.

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

**The migration is complete** — the app runs entirely on Supabase. The provider abstraction (`AuthProvider`, `DataProvider`, `StorageProvider`) remains the seam for all backend access: never import `supabase-js` directly in components — go through the providers.

## Commands

All backend-touching commands follow **`NEXT_PUBLIC_ENV`** (`local` | `prod`) — one set of commands, one switch. No `:local` twins.

- `npm run dev` — start Next.js dev server at `http://localhost:3000` (against the active env)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:apply-policies` — apply the SQL migrations (`db/migrations/*.sql`: tables + RLS + triggers) to the active env
- `npm run db:extras` — grants + realtime publication + storage bucket & policies
- `npm run db:setup` — `db:apply-policies` + `db:extras` in one shot (idempotent)

Local Supabase stack lifecycle (Docker via the Supabase CLI — no cloud analog):

- `npm run stack:start` / `stack:stop` / `stack:status` — manage the local stack
- `npm run stack:reset` — wipe + restart with a fresh DB (re-run `db:setup` after)

Typical first-time local setup: `npm run stack:start` → `NEXT_PUBLIC_ENV=local npm run db:setup` → `npm run dev` (with `NEXT_PUBLIC_ENV=local` in `.env`). Cloud-targeting `db:*` commands prompt for confirmation (bypass with `--yes` / `CONFIRM_CLOUD=1`). See `docs/SUPABASE-SETUP.md`.

The TypeScript config is strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).

## Environment

Copy `.env.sample` → `.env` (gitignored) and fill values. Key vars:

- `NEXT_PUBLIC_ENV` — **the single backend switch**: `local` (local Supabase stack) or `prod` (cloud project). Drives both the app and the `db:*` CLI tooling. Resolved for the client in `src/lib/supabaseEnv.ts`, for server routes in `src/lib/supabase-server.ts`, and for scripts in `scripts/env.ts`. For `local`, the URL + demo keys are built in — no other Supabase vars needed. Unset → cloud.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — cloud Supabase client config (used when `NEXT_PUBLIC_ENV=prod`).
- `NEXT_PUBLIC_SUPABASE_URL_LOCAL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL` / `SUPABASE_SERVICE_ROLE_KEY_LOCAL` — optional overrides for the local stack if your CLI mints non-default keys.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; for routes that bypass RLS (cloud).
- `DATABASE_URL` — cloud Postgres connection string for the policy/setup scripts (used when `NEXT_PUBLIC_ENV=prod`). The local stack uses `postgresql://postgres:postgres@127.0.0.1:54322/postgres` automatically.
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — transactional email (invitations).
- `NEXT_PUBLIC_SITE_URL` — canonical site origin used to build invite-acceptance URLs in outbound email. Defaults to request origin when unset.
- `NEXT_PUBLIC_SITE_ADMIN_UIDS` — comma-separated allowlist for the global suggestions inbox.

Backend resolution: the app always uses the Supabase providers (`ProviderFactory`); `NEXT_PUBLIC_ENV` only chooses which Supabase they point at (local stack vs cloud), via `src/lib/supabaseEnv.ts`. The file-backed JSON mock under `src/services/local/` was retired as a runtime mode and is kept only as the unit-test double.

## Architecture

### Provider abstraction (the central pattern)

All backend access (auth, data, storage) goes through interfaces in `src/services/types.ts`. `DataProvider` is split per ISP into focused sub-interfaces — `UserProvider`, `TreeMetaProvider`, `TreeDataProvider`, `MembershipProvider`, `InvitationProvider`, `SuggestionProvider`. Consumers should type their dependencies against the narrowest one they need. Two implementations:

- `src/services/supabase/` — the real implementation, used at runtime for both `local` and `prod` (same code, different target URL/keys). Backs onto the schema + RLS policies in `db/migrations/*.sql`.
- `src/services/local/` — `LocalDataProvider`, a file-backed provider that talked to (since-deleted) local API routes (`.local_data/db/…json`). **Retired as a runtime mode** — no longer wired by `ProviderFactory`. Kept only as the unit-test double (`LocalDataProvider.test.ts` stubs `fetch` against it), so the interface has a fast in-memory implementation to test contract behavior without a live backend.

`ProviderFactory.getProviders()` (`src/services/ProviderFactory.ts`) always returns the Supabase providers and memoizes them. **Any new backend operation must be added to the interface and implemented in _both_ the Supabase provider and the local (test-double) provider** — otherwise the unit tests and the real backend drift.

Supabase subscriptions use Realtime channels (`src/services/supabase/realtime.ts`): an initial fetch, then live `postgres_changes` events. The retained test double's subscriptions are 5s-polled (`LOCAL_DATA_CONFIG.POLLING_INTERVAL`) and dedupe via JSON string comparison so the callback only fires when content actually changes.

### App bootstrap, tenancy, and auth gating

`src/app/layout.tsx` wraps everything in `AppProvider` (`src/providers/AppProvider.tsx`), which calls `useAuthAndData()`. That hook composes:

- `useProviders()` — memoized `{ auth, data, storage }` from the factory.
- `useAuthUser(authProvider)` — subscribes to auth state; returns `{ user, isLoaded }`.
- `useUserProfile(user, userProvider)` — fetches / creates the user's global profile (just name/email/photo — roles live on memberships).
- `useMyTrees(uid, provider)` — subscribes to the user's list of owned + invited trees.
- `useTreeMembership(treeId, uid, provider)` — subscribes to the user's role + linked person in the active tree.
- `useTreeSubscription(treeId, provider)` — subscribes to people / families of the active tree.

First-sign-in auto-provisions a tree for the user as owner, seeded with one root Person representing them. `currentTreeId` defaults to the user's first owned tree; on `/tree/[id]` routes the layout binds it from the URL param.

`AppProvider` renders one of `Loading`, `LoginScreen`, or `children`. The pending/denied screens are gone — under multi-tenancy a new user goes straight to their own tree, and access to other trees is gated per-membership.

Role gating uses the predicates in `src/lib/access.ts`: `canViewTree(role)`, `canEdit(role)`, `isOwner(role)`, `canInvite(role)`. Don't inline role string comparisons; use the helpers. Roles are `owner | editor | viewer` (defined in `TREE_ROLES`).

### Data model

Domain types in `src/types/`:

- `Person` — `id`, `name.official_name`, `sex: 'M'|'F'`, optional `events`, `custom_fields`, `image_url`, `userId` (link to the auth user that represents this person _in this tree_), `root: true` on exactly one person _per tree_.
- `Family` — `husband?`, `wife?`, `children: string[]`. The legacy `partners` field is fully removed; `familyPartners(family)` remains the canonical helper for `[husband, wife]`.
- `Tree`, `TreeMeta`, `TreeMembership`, `TreeInvite` types in `src/types/tree.ts`.

Per-tree uniqueness:

- One root Person per tree (enforced by `ConsistencyValidator` and a partial unique index in Postgres).
- One linked Person per (tree, uid) pair — i.e. a single auth user maps to at most one Person within a tree, but can be linked across multiple trees.

### Database (multi-tenant target)

The schema lives entirely in SQL migrations under `db/migrations/` — there's no ORM. `0001_initial.sql` is the single source of truth: it defines all tables (`users`, `trees`, `tree_members`, `people`, `families`, `tree_invites`, `suggestions`), indexes, RLS policies, triggers, and the SECURITY DEFINER helper functions. Later files (`0003`–`0005`) are follow-up fixes; `0002` is the storage policies. See `docs/ARCHITECTURE.md` §4 for the full shape.

Apply with `npm run db:setup` (migrations + grants/realtime/storage extras) or `npm run db:apply-policies` (migrations only). RLS is what actually enforces per-tree access; the client uses the anon key. **Schema changes = add a new `db/migrations/000N_*.sql` file** (same workflow as the RLS changes), then re-run `db:setup`.

`scripts/env.ts` resolves which database the scripts target from `NEXT_PUBLIC_ENV`; `pg` (not an ORM) is the connection driver.

### Tree rendering and graph logic

`src/lib/graph/GraphManager.ts` is the pure-domain graph layer (no React, no provider awareness). It builds a D3-ready hierarchy from `(people, families)`:

- `buildHierarchy()` — produces a tree rooted at the person with `root: true`. Each family becomes a "partner group" node; a child who is themself a partner in another family gets _replaced_ by that family's node, with `lineageMemberId` marking which side of the couple continues the line.
- `getAncestors` / `getDescendants` — BFS over family memberships.
- `findPath(a, b)` — BFS shortest path producing `{personId, relation}` steps (Spouse / Parent / Child / Sibling).

`ConsistencyValidator.validate(graphManager)` (`src/lib/graph/ConsistencyValidator.ts`) reports phantom IDs, missing `sex`, self-as-parent cycles, and multiple-root violations.

The D3 visualization is decomposed in `src/components/tree/`: `useTreeLayout` (pure math), `useTreeZoom` (d3-zoom wired to refs), `<PersonNode>` / `<PartnerNode>` / `<TreeLink>` / `<DetailsCard>` (React components inside `<foreignObject>`). `src/components/Tree.tsx` is the composition. Details cards are React-rendered so user content is auto-escaped (no XSS surface).

### Routing

App router under `src/app/`. Tree-scoped pages live under `/tree/[id]/*`; the `[id]` layout binds `currentTreeId` in `AppContext` from the URL param.

- `/` — tree picker listing the user's owned + member trees; redirects straight into the tree when there's exactly one
- `/tree/[id]` — tree visualization (gated by membership)
- `/tree/[id]/people` — searchable list of people
- `/tree/[id]/family` — family editor
- `/tree/[id]/members` — members & invitations management (changes are owner-only)
- `/tree/[id]/settings` — owner-only: rename placeholder (name is read-only today) + delete tree
- `/about` — static info page
- `/user/profile` — global user profile (name/email/photo) + per-tree linked-person editor
- `/user/suggestions` — site-level feedback inbox; gated by the `NEXT_PUBLIC_SITE_ADMIN_UIDS` allowlist via `isSiteAdmin` (`src/lib/access.ts`)
- `/invite/[id]` — invite-acceptance landing; calls `/api/invite/accept` after the user is signed in
- `/auth/reset-password` — password-recovery landing
- `/api/tree/create` — server route; service-role creation of the tree + owner membership
- `/api/invite/send` — server route; sends the invitation email via Resend after the owner creates an invite
- `/api/invite/accept` — server route; uses the service-role client to atomically validate the invite + create the `tree_members` row + mark the invite accepted (RLS blocks the invitee from doing this client-side)

## Conventions

- Strict TypeScript everywhere. Imports must use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- `'use client'` is required at the top of any component that uses hooks or browser APIs.
- Constants and string literals for roles, suggestion statuses, and test-double config live in `src/constants/index.ts` — reuse `TREE_ROLES`, `SUGGESTION_STATUS`, `LOCAL_DATA_CONFIG.GLOBAL_COLLECTIONS` / `TREE_COLLECTIONS` instead of inlining strings.
- Styling: single global stylesheet at `src/app/globals.css` with the token system documented in `docs/DESIGN-LANGUAGE.md`; no CSS-in-JS or modules in new code.
- Tests live under `tests/`, mirroring `src/` (e.g. `tests/lib/access.test.ts` for `src/lib/access.ts`), and import via the `@/*` → `src/*` alias (`tsconfig.json` + `vitest.config.ts`). Vitest only picks up `tests/**/*.test.ts`. App code uses relative imports; the `@/` alias is for test imports.

## Deployment

Hosting is parked (Firebase App Hosting was the legacy target; not used anymore). Phase 15 picks a host before public launch — viable options include Vercel, Cloudflare Pages, Netlify, Railway, Fly.io, self-host.
