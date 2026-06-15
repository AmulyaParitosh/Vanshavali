# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Direction (June 2026)

This project is being **migrated to multi-tenancy and off Firebase entirely** for public release. See `docs/ARCHITECTURE.md` for the target architecture, data model, and phased migration plan. See `docs/DESIGN-LANGUAGE.md` for the visual identity. See `CONTRIBUTING.md` for dev workflow.

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

- `NEXT_PUBLIC_APP_ENV` — `local` (file-backed, default for dev), `supabase`, or `firebase` (legacy).
- `NEXT_PUBLIC_LOCAL_USER_UID` — mock UID used in local mode.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client config.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; for routes that bypass RLS.
- `DATABASE_URL` — Postgres connection string used by Drizzle Kit migrations.
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — transactional email (lands in Phase 10).

If `NEXT_PUBLIC_APP_ENV` is unset, the factory defaults to `supabase` when Supabase env vars are present, else `firebase`.

## Architecture

### Provider abstraction (the central pattern)

All backend access (auth, data, storage) goes through interfaces in `src/services/types.ts`. `DataProvider` is split per ISP into four sub-interfaces (`UserProvider`, `TreeDataProvider`, `AdminProvider`, `SuggestionProvider`) — consumers should type their dependencies against the narrowest one they need. Three implementations exist:

- `src/services/firebase/` — Firebase Realtime Database, Firebase Auth (Google), Firebase Storage. Legacy; being removed.
- `src/services/local/` — file-backed providers hitting Next.js API routes under `src/app/api/local/` (which read/write `.local_data/db/*.json` and `.local_data/storage/`). Retained as the dev/test double.
- `src/services/supabase/` — Phase 1 scaffold; methods throw `NotImplementedError` until Phase 5/6/7 land the real implementations.

`ProviderFactory.getProviders()` (`src/services/ProviderFactory.ts`) chooses one set based on `NEXT_PUBLIC_APP_ENV` and memoizes it. **Any new backend operation must be added to the interface and implemented in _both_ the active (supabase) and local providers** — otherwise local mode silently breaks.

Subscriptions: Firebase uses `onValue` listeners; local providers simulate realtime with `setInterval` polling (`LOCAL_DATA_CONFIG.POLLING_INTERVAL = 5000ms`) and only invoke callbacks when serialized data changes.

### App bootstrap and auth gating

`src/app/layout.tsx` wraps everything in `AppProvider` (`src/providers/AppProvider.tsx`), which calls `useAuthAndData()` (`src/hooks/useAuthAndData.ts`). That hook composes four single-responsibility hooks:

- `useProviders()` — memoized `{ auth, data, storage }` from the factory.
- `useAuthUser(authProvider)` — subscribes to auth state; returns `{ user, isLoaded }`.
- `useUserProfile(user, userProvider)` — fetches/creates profile, auto-creates with `role: "pending"` on first sign-in; returns `{ role, personId, isLoaded, refresh }`.
- `useTreeSubscription(role, treeProvider)` — subscribes to tree data when `canViewTree(role)`; returns `{ treeData, isLoaded }`.

`AppProvider` renders one of `Loading`, `LoginScreen`, `PendingApprovalScreen`, `AccessDeniedScreen`, or `children` based on role. Inner pages use `useAppContext()` (`src/context/AppContext.tsx`) for `treeData`, `dataProvider`, `onSave`, etc. — the context value is memoized so consumers don't cascade-rerender.

Role gating uses the predicates in `src/lib/access.ts`: `canViewTree(role)` (viewer/editor/admin) and `canEdit(role)` (editor/admin). Don't inline role string comparisons; use the helpers.

### Data model

Two top-level collections drive the tree:

- `Person` (`src/types/person.ts`) — `id`, `name.official_name`, `sex: 'M'|'F'`, optional `events`, `custom_fields`, `image_url`, `userId` (link to auth user), `root: true` on exactly one person.
- `Family` (`src/types/family.ts`) — `husband?`, `wife?`, `children: string[]`, plus a legacy `partners?: string[]` used as a fallback.

Schema is in transition. The legacy `partners?: string[]` field is read with a fallback via the `familyPartners(family)` helper in `src/lib/family.ts` — use that helper, don't reinvent the idiom. The new Postgres schema (`db/schema.ts`) drops `partners[]` entirely; it survives only in legacy Firebase data which we're archiving.

Per-user linkage lives on `Person.userId` (canonical). Under multi-tenancy this narrows to per-tree semantic (one auth user can be linked to one person _per tree_; the same uid can appear in multiple trees).

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

App router under `src/app/`:

- `/` — landing / login (rendered by `AppProvider` based on auth state)
- `/family` — main tree view
- `/people` — searchable list of people
- `/about` — static info page
- `/user/profile`, `/user/access_requests`, `/user/management`, `/user/suggestions` — user/admin areas
- `/api/local/db`, `/api/local/storage` — local-mode backends (file I/O against `.local_data/`)
- `/api/send-access-request.ts` — nodemailer-based notification

## Conventions

- Strict TypeScript everywhere. Imports must use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- `'use client'` is required at the top of any component that uses hooks or browser APIs.
- Constants and string literals for roles, suggestion statuses, and local-mode config live in `src/constants/index.ts` — reuse `USER_ROLES`, `SUGGESTION_STATUS`, `LOCAL_DATA_CONFIG.COLLECTIONS` instead of inlining strings.
- Styling: a single global stylesheet at `src/app/globals.css` with CSS custom properties (`--color-primary`, etc.); no CSS-in-JS or modules.

## Deployment

Pushes to `main` trigger an automatic deploy via Firebase App Hosting's GitHub integration. There is no separate CI configuration in the repo.
