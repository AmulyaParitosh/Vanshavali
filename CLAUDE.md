# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Direction (June 2026)

This project was **migrated to multi-tenancy and off Firebase entirely** for public release. See `docs/ARCHITECTURE.md` for the target architecture, data model, and phased migration plan. See `docs/SUPABASE-SETUP.md` for the end-to-end provisioning checklist (manual steps the migrations can't do — the storage bucket, OAuth config). See `docs/DESIGN-LANGUAGE.md` for the visual identity. See `docs/BACKLOG.md` for deferred design / refactor work that's been scoped but not picked up. See `CONTRIBUTING.md` for dev workflow.

Locked-in decisions (do not re-litigate without a strong reason):

- **Backend**: Supabase Postgres + Auth + Storage. No Firebase / GCP anywhere.
- **No RLS**: the backend owns the tables completely — the app connects as the Postgres owner through the repository layer and enforces access in the **service layer** (`src/services/authz.ts`). RLS is not used at all.
- **No Realtime**: there are no live subscriptions; the client fetches through the API and re-fetches after its own mutations (a refresh nonce in `AppContext`).
- **Schema management**: declarative schemas in `supabase/schemas/*.sql` are the source of truth; migrations in `supabase/migrations/` are generated via `supabase db diff` and applied by the Supabase CLI.
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

The **app** and `db:extras` follow **`NEXT_PUBLIC_ENV`** (`local` | `prod`). The **migration** commands (`db:diff`/`db:reset`/`db:push`) use the Supabase CLI, which targets the local stack or the linked cloud project (`supabase link`), not `NEXT_PUBLIC_ENV`.

- `npm run dev` — start Next.js dev server at `http://localhost:3000` (against the active env)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:diff -- <name>` — generate a migration in `supabase/migrations/` from edits to the declarative schema (`supabase/schemas/*.sql`), via `supabase db diff`
- `npm run db:migrate` — apply **pending** migrations to the local DB **without wiping data** (`supabase migration up`); the everyday "apply the migration I just generated" command
- `npm run db:reset` — drop + recreate the local DB (**wipes data**), re-applying all migrations (+ seed); use for a clean slate or after editing an already-applied migration
- `npm run db:push` — apply pending migrations to the linked cloud project (`supabase link` first) — the deliberate deploy-to-cloud step
- `npm run db:extras` — ensure the `images` storage bucket exists on the active env (the one setup step migrations can't express — buckets are created through the Storage API)

Local Supabase stack lifecycle (Docker via the Supabase CLI — no cloud analog):

- `npm run stack:start` / `stack:stop` / `stack:status` — manage the local stack (`stack:start` auto-applies migrations)
- `npm run stack:reset` — nuke + restart the containers with a fresh DB

Typical first-time local setup: `npm run stack:start` (applies migrations) → `NEXT_PUBLIC_ENV=local npm run db:extras` (bucket) → `npm run dev` (with `NEXT_PUBLIC_ENV=local` in `.env`). **Schema change workflow**: edit `supabase/schemas/*.sql` → `npm run db:diff -- <name>` → review the generated migration → `npm run db:migrate` to apply locally (data-preserving; use `db:reset` instead if you edited an already-applied migration and need a clean rebuild). See `docs/SUPABASE-SETUP.md`.

The TypeScript config is strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).

## Environment

Copy `.env.sample` → `.env` (gitignored) and fill values. Key vars:

- `NEXT_PUBLIC_ENV` — **the single backend switch**: `local` (local Supabase stack) or `prod` (cloud project). Drives both the app and the `db:*` CLI tooling. Resolved for the client in `src/lib/supabaseEnv.ts`, for server routes in `src/lib/supabase-server.ts`, and for scripts in `scripts/env.ts`. For `local`, the URL + demo keys are built in — no other Supabase vars needed. Unset → cloud.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — cloud Supabase client config (used when `NEXT_PUBLIC_ENV=prod`).
- `NEXT_PUBLIC_SUPABASE_URL_LOCAL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL` / `SUPABASE_SERVICE_ROLE_KEY_LOCAL` — optional overrides for the local stack if your CLI mints non-default keys.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; used by `/api/upload` (the service-role storage client) and the `db:extras` bucket step. The data path uses `pg` + service-layer authz, not this.
- `DATABASE_URL` — cloud Postgres connection string (used when `NEXT_PUBLIC_ENV=prod`) for **both** the setup scripts and the app's server-side repository layer (`src/repositories/db.ts`). The local stack uses `postgresql://postgres:postgres@127.0.0.1:54322/postgres` automatically.
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — transactional email (invitations).
- `NEXT_PUBLIC_SITE_URL` — canonical site origin used to build invite-acceptance URLs in outbound email. Defaults to request origin when unset.
- `NEXT_PUBLIC_SITE_ADMIN_UIDS` — comma-separated allowlist for the global suggestions inbox.

Backend resolution: `NEXT_PUBLIC_ENV` chooses which backend everything points at (local stack vs cloud) — for the client via `src/lib/supabaseEnv.ts` and for the server-side repository connection via `src/repositories/db.ts`.

## Architecture

### Provider abstraction (the central pattern)

All backend access (auth, data, storage) goes through interfaces in `src/services/types.ts`. `DataProvider` is split per ISP into focused sub-interfaces — `UserProvider`, `TreeMetaProvider`, `TreeDataProvider`, `MembershipProvider`, `InvitationProvider`, `SuggestionProvider`. Consumers should type their dependencies against the narrowest one they need. The runtime implementation:

- `src/services/ApiDataProvider.ts` — the `DataProvider`. A **thin HTTP client**: every read/write calls a `/api/*` route (via `authedFetch`, attaching the user's Supabase access token as a bearer). It holds a supabase-js client only for that token. It contains **no SQL and no row-shape knowledge**. `src/services/ApiStorageProvider.ts` is the same idea for images (posts multipart to `/api/upload`).

`ProviderFactory.getProviders()` (`src/services/ProviderFactory.ts`) returns `{ auth, data, storage }` and memoizes them: **auth** goes through supabase-js (`SupabaseAuthProvider`); **data** and **storage** go through `ApiDataProvider` / `ApiStorageProvider`, which hit the `/api/*` routes.

**Never import `supabase-js` for data in a component or hook — go through the providers.** And the real data logic never lives in the provider: it lives server-side. See the next section.

No live updates: the tables have no RLS and no anon grants, so the browser can't subscribe to Postgres changes. Each `subscribe*` method does a single fetch and returns a no-op unsubscribe; the UI re-fetches after the user's own mutations via a **refresh nonce** in `AppContext`. `withRefresh` (`src/services/withRefresh.ts`) wraps the provider so every mutating method bumps the nonce, and each subscribe hook includes the nonce in its effect deps.

### Server data layer: routes → services → repositories (raw SQL)

All data reads/writes happen server-side, in three layers under `src/`:

- **`app/api/*` route handlers** — thin HTTP glue. Each verifies the caller (`requireCaller` in `src/lib/api.ts` → bearer token → uid), parses/validates the body, calls a service, and maps thrown `HttpError`s to status codes via `handle`. No business logic.
- **`services/*-service.ts`** — business logic + **authorization** (`src/services/authz.ts`: `requireView` / `requireEdit` / `requireOwner` / `requireInvite`). Services own transaction boundaries (`transaction()` in `db.ts`) so multi-statement writes are atomic.
- **`repositories/*Repository.ts`** — data access only. Each method loads a raw `.sql` file via `sql("name.sql")` (`src/repositories/sql.ts`), runs it through `query(db, text, params)` over a `pg` pool (`src/repositories/db.ts`), and maps rows to domain types via `src/repositories/mappers.ts`. **No ORM, no query builder** — queries are plain SQL in `src/repositories/sql/<entity>/*.sql`. No authorization here.

The `pg` connection uses the Postgres owner role, so it **bypasses RLS** — which is why authorization is the service layer's job, not RLS's (see the Database section). Adding a data operation = add the interface method (`types.ts`) + the `ApiDataProvider` HTTP call + the route + the service + the repository method (+ its `.sql`).

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

### Database (declarative schema + CLI migrations, no RLS)

There's no ORM. The schema is managed the Supabase declarative way:

- **`supabase/schemas/*.sql`** — the declared source of truth (all 7 tables: `users`, `trees`, `tree_members`, `people`, `families`, `tree_invites`, `suggestions`; indexes; the `updated_at` trigger). Edit these to change the schema.
- **`supabase/migrations/*.sql`** — generated by `supabase db diff` (`npm run db:diff -- <name>`) from changes to the declared schema, and applied by the Supabase CLI (`supabase start` / `db reset` locally, `db push` to cloud). Never hand-edit the DB; edit the schema and diff.

There is **no RLS, no policies, no SECURITY DEFINER helpers, and no `auth.users` trigger** (services create the `users` row on every write path). Config: `auto_expose_new_tables = false` in `supabase/config.toml` — the Data API roles (anon/authenticated) get no access, so the auto-generated REST API is permission-denied for our tables by design.

**Access control lives in the service layer.** The app connects as the Postgres owner (`src/repositories/db.ts`) and authorizes in `src/services/authz.ts`. `src/repositories/db.ts` resolves the target from `NEXT_PUBLIC_ENV`; the CLI migration commands target the local stack or the linked cloud project instead. `pg` (not an ORM) is the app's connection driver.

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
- `/api/*` — all data reads/writes, per the "Server data layer" section above (route → service → repository). Notable routes: `POST /api/tree/create`, `GET/PUT /api/tree/[id]/data`, `/api/tree/[id]/members` + `/api/tree/[id]/invites` (create also sends the Resend email), `POST /api/invite/accept`, `POST /api/upload`, `/api/suggestions`, `/api/user/profile`. Each verifies the bearer token and authorizes in the service layer.

## Conventions

- Strict TypeScript everywhere. Imports must use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- `'use client'` is required at the top of any component that uses hooks or browser APIs.
- Constants and string literals for roles and suggestion statuses live in `src/constants/index.ts` — reuse `TREE_ROLES`, `SUGGESTION_STATUS` instead of inlining strings.
- Styling: single global stylesheet at `src/app/globals.css` with the token system documented in `docs/DESIGN-LANGUAGE.md`; no CSS-in-JS or modules in new code.
- Tests live under `tests/`, mirroring `src/` (e.g. `tests/lib/access.test.ts` for `src/lib/access.ts`), and import via the `@/*` → `src/*` alias (`tsconfig.json` + `vitest.config.ts`). Vitest only picks up `tests/**/*.test.ts`. App code uses relative imports; the `@/` alias is for test imports.

## Deployment

Hosting is parked (Firebase App Hosting was the legacy target; not used anymore). Phase 15 picks a host before public launch — viable options include Vercel, Cloudflare Pages, Netlify, Railway, Fly.io, self-host.
