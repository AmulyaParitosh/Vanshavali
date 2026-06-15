# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server at `http://localhost:3000`
- `npm run build` — production build
- `npm run start` — run the production build
- `npx tsx scripts/sync-firebase.ts` — download Firebase Realtime DB collections to `.local_data/db/` and Storage assets to `.local_data/storage/` (primes local mode with real data)
- `npx tsx scripts/migrate-user-person-relation.ts` — one-off local-data migration; moves `users[uid].personId` into `people[].userId`. Edit the hardcoded absolute paths at the top before running on another machine

No test, lint, or typecheck scripts are wired into `package.json`. The TypeScript config is strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) — verify types with `npx tsc --noEmit` when needed.

## Environment

Create `.env` (gitignored) with:

```
NEXT_PUBLIC_APP_ENV=production   # or "local" for mock data
NEXT_PUBLIC_LOCAL_USER_UID=local-admin-uid
```

`NEXT_PUBLIC_APP_ENV=local` switches to file-backed mock providers and a mock Google sign-in that resolves to `NEXT_PUBLIC_LOCAL_USER_UID`. Firebase project credentials are currently hardcoded in `src/lib/firebase.ts` and `scripts/sync-firebase.ts`.

## Architecture

### Provider abstraction (the central pattern)

All backend access (auth, data, storage) goes through interfaces in `src/services/types.ts` (`AuthProvider`, `DataProvider`, `StorageProvider`). Two implementations exist side by side:

- `src/services/firebase/` — Firebase Realtime Database, Firebase Auth (Google), Firebase Storage
- `src/services/local/` — file-backed providers that hit Next.js API routes under `src/app/api/local/` (which read/write `.local_data/db/*.json` and `.local_data/storage/`)

`ProviderFactory.getProviders()` (`src/services/ProviderFactory.ts`) chooses one set based on `NEXT_PUBLIC_APP_ENV` and memoizes it. **Any new backend operation must be added to the `DataProvider`/`AuthProvider`/`StorageProvider` interface and implemented in *both* the firebase and local providers** — otherwise local mode silently breaks.

Subscriptions: Firebase uses `onValue` listeners; local providers simulate realtime with `setInterval` polling (`LOCAL_DATA_CONFIG.POLLING_INTERVAL = 5000ms`) and only invoke callbacks when serialized data changes.

### App bootstrap and auth gating

`src/app/layout.tsx` wraps everything in `AppProvider` (`src/providers/AppProvider.tsx`), which calls `useAuthAndData()` (`src/hooks/useAuthAndData.ts`). That hook is the single source of truth for:

- Current Firebase/local `AuthUser`
- The user's role (`pending`, `denied`, `viewer`, `editor`, `admin`)
- `personId` linking the auth user to a `Person` row
- The live `TreeData` ({people, families}) subscription

`AppProvider` renders one of `Loading`, `LoginScreen`, `PendingApprovalScreen`, `AccessDeniedScreen`, or `children` based on role. Pages further inside the app can rely on `useAppContext()` (`src/context/AppContext.tsx`) to get `treeData`, `dataProvider`, `onSave`, etc.

When a user signs in for the first time, `useAuthAndData` auto-creates their profile with `role: "pending"`. Role gating: `viewer | editor | admin` see the tree; only `editor | admin` may call `onSave`.

### Data model

Two top-level collections drive the tree:

- `Person` (`src/types/person.ts`) — `id`, `name.official_name`, `sex: 'M'|'F'`, optional `events`, `custom_fields`, `image_url`, `userId` (link to auth user), `root: true` on exactly one person.
- `Family` (`src/types/family.ts`) — `husband?`, `wife?`, `children: string[]`, plus a legacy `partners?: string[]` used as a fallback.

The schema is currently in transition: prefer `husband`/`wife`; `partners` is deprecated but still read everywhere as a fallback. `GraphManager` and `ConsistencyValidator` always merge `[husband, wife, ...partners].filter(Boolean)` — preserve this pattern when touching family-walking code.

Per-user linkage lives on `Person.userId` (canonical) — older data had it on `users[uid].personId`; `migrate-user-person-relation.ts` is the migration to move it.

### Tree rendering and graph logic

`src/lib/graph/GraphManager.ts` is the pure-domain graph layer (no React, no Firebase). It builds a D3-ready hierarchy from `(people, families)`:

- `buildHierarchy()` — produces a tree rooted at the person with `root: true`. Each family becomes a "partner group" node containing the husband/wife pair plus child nodes. A child that is itself a partner in another family gets *replaced* by that family's node, with `lineageMemberId` marking which side of the couple continues the line.
- `getAncestors` / `getDescendants` — BFS over family memberships.
- `findPath(a, b)` — BFS shortest path producing `{personId, relation}` steps (Spouse / Parent / Child / Sibling).

`ConsistencyValidator.validate(graphManager)` (`src/lib/graph/ConsistencyValidator.ts`) reports phantom IDs, missing `sex`, and self-as-parent cycles.

`src/components/Tree.tsx` is the D3 visualization layer — owns the SVG, zoom/pan, and renders nodes from the hierarchy.

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
