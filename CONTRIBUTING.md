# Contributing to Vanshavali

Thanks for working on Vanshavali. This guide covers everything you need to know to land a change cleanly.

If you're an AI agent reading this: also read `CLAUDE.md` (project-wide context), `docs/ARCHITECTURE.md` (current + target architecture), and `docs/DESIGN-LANGUAGE.md` (visual identity).

---

## 1. Dev setup

### Prerequisites

- **Node.js**: v20 or later.
- **npm**: bundled with Node. (We don't use Yarn or pnpm.)
- A code editor with TypeScript support — VS Code is what most of us use.

### First-time install

```bash
git clone https://github.com/amulyaparitosh/Vanshavali.git
cd Vanshavali
npm install
cp .env.sample .env       # then edit .env — see below
npm run dev               # → http://localhost:3000
```

### Environment variables

`.env` is gitignored. A single switch — `NEXT_PUBLIC_ENV` — picks the backend for both the app and the `db:*` tooling:

```env
# "local" → local Supabase stack (Docker). URL + keys are built in, nothing else needed.
# "prod"  → your cloud project (fill the vars below).
NEXT_PUBLIC_ENV=local
```

For `prod` (cloud), also set:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Server-only (NOT prefixed with NEXT_PUBLIC_) — used by API routes / scripts only
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

Never commit `.env`. Never put secrets in `NEXT_PUBLIC_*` variables — those are shipped to the client.

### Local mode (recommended for most dev work)

`NEXT_PUBLIC_ENV=local` runs the app against a full **local Supabase stack** (real Postgres + Auth + Storage + Realtime in Docker) — the same provider code as prod, so RLS/auth/storage behave identically. One-time setup:

```bash
npm run stack:start   # boot the Docker stack (pulls images on first run)
npm run db:setup      # schema + RLS + realtime + storage bucket & policies (targets local)
npm run dev           # with NEXT_PUBLIC_ENV=local in .env
```

Sign up with any email/password — email confirmation is off locally, so you get a session immediately. Browse local data at Supabase Studio (`http://127.0.0.1:54323`). Full details + troubleshooting in `docs/SUPABASE-SETUP.md`.

> The old file-backed JSON mock (`NEXT_PUBLIC_APP_ENV=local`, `.local_data/`) was retired as a runtime mode once the local stack landed. Its `LocalDataProvider` survives only as the unit-test double.

### Tests, lint, types

```bash
npm run typecheck         # tsc --noEmit
npm run lint              # ESLint
npm run format            # Prettier write
npm run format:check      # Prettier check (a good pre-PR check; no CI is wired up yet)
npm test                  # Vitest (run once)
npm run test:watch        # Vitest in watch mode
```

Tests live under `tests/`, mirroring the `src/` layout (e.g. `src/lib/access.ts` → `tests/lib/access.test.ts`). Import the code under test through the `@/*` → `src/*` alias (declared in `tsconfig.json` + `vitest.config.ts`), e.g. `import { canEdit } from "@/lib/access"` — so an import doesn't depend on how deeply the test is nested.

---

## 2. Project layout

```
src/
  app/                    Next.js App Router pages + API routes
  components/             React components
  context/                React context providers (AppContext)
  hooks/                  Custom React hooks (useAuthAndData, composed of useAuthUser /
                          useUserProfile / useMyTrees / useTreeMembership /
                          useTreeSubscription / useProviders)
  lib/                    Pure-domain logic (graph manager, validators, helpers)
  providers/              Composing context providers for the app root
  services/               Backend provider abstractions
    supabase/             Supabase implementations (the runtime backend)
    local/                File-backed LocalDataProvider (the unit-test double)
  constants/              Project-wide constants — TREE_ROLES, etc.
  types/                  Shared TypeScript types
  utils/                  Pure utility functions

scripts/                  DB setup tooling (env.ts, apply-rls-policies.ts,
                          setup-extras.ts, db-setup.ts) — env-aware via NEXT_PUBLIC_ENV
docs/                     Architecture, design language, decision records
public/                   Static assets (images, icons)
.local_data/              Scratch data for the retained test double (gitignored)
```

When adding new domain logic, put it in `src/lib/` (pure, no React, no provider awareness). When adding new components, default to `src/components/`. Page-only logic stays inside the `src/app/` page file unless it grows past ~150 lines.

---

## 3. Code style

### TypeScript

- **Strict mode is on** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). Don't disable.
- **`import type`** for type-only imports. Required by `verbatimModuleSyntax`.
- **No `any`**. If a third-party library has bad types, write a local wrapper that narrows to the real shape.
- **No `as` assertions** except for genuine narrowing (e.g., `JSON.parse(x) as MyType` at a parse boundary). Don't use `as` to silence the compiler.
- **No `// @ts-ignore` or `// @ts-expect-error`** unless paired with a specific compiler bug reference. The audit found multiple uses that masked real bugs.
- **Discriminated unions** beat optional fields when the shape genuinely varies (e.g., `GraphNode` is either a partner group or a single person — make it a union, not a Person with optional `isPartnerGroup`).
- **Type union for roles, statuses, etc.** — don't use `string` when `'owner' | 'editor' | 'viewer'` is the actual contract.

### React

- **`'use client'`** at the top of any component that uses hooks or browser APIs. Required by the App Router.
- **Prefer composition over context** for one-off prop passing. Reach for context only when 3+ levels of drilling, OR when the same value is needed in distant subtrees.
- **Memoize context values** (`useMemo`) so consumers don't cascade-rerender. The audit caught the existing `AppProvider` failing to do this.
- **Server components by default**, client components when interactive. For now most pages are client-side because of the auth flow — this is migration debt.

### Naming

- **Files**: `PascalCase.tsx` for components, `camelCase.ts` for hooks (`useFoo.ts`), modules, and utilities. `kebab-case.ts` is fine for scripts.
- **Components**: `PascalCase`.
- **Hooks**: `useXxx`.
- **Constants**: `UPPER_SNAKE_CASE` inside `src/constants/index.ts`.
- **CSS classes**: BEM-ish (`block__element--modifier`) for new components. Existing classes are inconsistent and will be migrated.

### CSS

- Tokens for everything. **No raw hex values, no magic `px` outside the spacing scale**. See `docs/DESIGN-LANGUAGE.md` for the token list.
- **One stylesheet**: `src/app/globals.css`. No CSS modules, no CSS-in-JS in new code. Inline `style={}` props are migration debt and should not grow.
- **Mobile-first**: write base styles for phone width, override upward via media queries.
- **`:focus-visible` outline on every interactive element.** Browser defaults are not enough.

### Comments

- **Default to no comments.** Well-named identifiers are the documentation.
- Comments are for the _why_, not the _what_: a hidden constraint, a workaround for a specific bug (with a link), a surprising invariant.
- **Don't write comments referencing tasks, PRs, callers, or current refactor state** — those belong in the PR description and rot fast.
- Don't write multi-paragraph docstrings. If a function needs that much explanation, it probably needs to be smaller.

---

## 4. Provider abstraction — the central rule

> **Any new backend operation must be added to the interface in `src/services/types.ts` and implemented in _both_ the Supabase and local providers.**

If you only add one implementation, the unit tests and the real backend drift apart. Both must land in the same PR.

The pure-domain layer (`src/lib/graph/`, `src/utils/`) must remain **provider-unaware** — no Firebase, no Supabase, no React imports. Domain code is the easiest to test and the slowest to rot. Keep it clean.

---

## 5. Multi-tenancy invariants

The single-tenant → multi-tenant migration has landed. These invariants still hold:

- New tree-scoped methods on the data provider **must** take a `treeId` parameter.
- New components consuming tree data **must** read `currentTreeId` from `useAppContext()` — don't assume a global tree.
- `Person.userId` and `Person.root` are **tree-scoped semantics** (per-tree uniqueness). Don't write code that scans all people globally for a `userId` match.
- Image storage paths **must** be tree-scoped: `images/trees/{treeId}/people/{personId}/...`.

`docs/ARCHITECTURE.md` §9 records the (completed) migration plan.

---

## 6. Git workflow

### Branches

- `main` — protected. Tested code that's safe to deploy.
- Feature branches: `feat/<short-description>` (e.g., `feat/tree-picker`).
- Fixes: `fix/<short-description>`.
- Refactors: `refactor/<area>` (e.g., `refactor/dry-family-partners`).
- Docs: `docs/<area>`.

Keep branches short-lived. Long branches conflict and rot.

### Commits

Conventional Commits style. Type prefix + concise subject:

```
feat: add tree picker to header
fix: prevent stale closure in useAuthAndData
refactor: extract familyPartners helper
docs: add architecture document
test: cover GraphManager findPath edge cases
chore: bump next to 15.5.5
style: format with prettier
```

Subject line:

- Imperative mood ("add", not "added" or "adds").
- ≤ 70 characters.
- No trailing period.
- Lowercase after the prefix.

Body (optional, for non-trivial commits):

- Wrap at 72 chars.
- Explain _why_, not _what_ — the diff shows what.
- Reference issues / decisions: `Closes #123`, `See docs/ARCHITECTURE.md §9`.

Never rewrite published history without coordination. Don't `--force` push to `main` ever.

### Pull requests

Use the PR template (see below). Keep PRs focused:

- **One concern per PR.** Don't bundle a refactor with a feature. Reviewers and `git bisect` will thank you.
- **< 400 lines of diff** is the target. Bigger PRs get bigger bugs.
- **Self-review first.** Open your PR, read the diff like a reviewer, fix what jumps out before pinging anyone.
- **Tests for new logic.** New helpers in `src/lib/` and `src/utils/` need unit tests. UI components don't (yet — until we wire up RTL coverage).

### PR template

```markdown
## What

One-paragraph summary of what this PR changes.

## Why

The motivation. What problem does it solve? Link the issue / audit finding.

## How

Brief explanation of the approach if non-obvious. Note any tradeoffs.

## Test plan

- [ ] Unit tests for new logic
- [ ] Manual verification: <specific steps>
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes

## Screenshots / before-after

For UI changes.

## Notes for reviewers

Anything you want a second opinion on.
```

---

## 7. Code review checklist

A reviewer should check (and an author should self-check before requesting review):

### Correctness

- [ ] Does the code do what the PR description says?
- [ ] Edge cases handled (empty arrays, null/undefined inputs, error paths)?
- [ ] No new TODO / FIXME left unaddressed without an issue link.

### Safety

- [ ] No user input rendered as HTML without escaping.
- [ ] No new client-side trust assumptions (e.g., role checks that only exist in the client).
- [ ] No secrets, API keys, or production URLs in source.

### Types

- [ ] No `any`. No `as` assertions outside parse boundaries. No `@ts-ignore`.
- [ ] Tree-scoped methods take `treeId`.
- [ ] Discriminated unions instead of optional-field-everywhere.

### Architecture

- [ ] New backend ops added to `src/services/types.ts` and implemented in **both** providers.
- [ ] Pure-domain code (`src/lib/`) stayed pure (no React, no provider imports).
- [ ] Constants from `src/constants/index.ts` used instead of inline string literals.

### Style

- [ ] Tokens used (no raw hex / magic px).
- [ ] No inline `style={}` for new components.
- [ ] `:focus-visible` on new interactive elements.
- [ ] `aria-label` on icon-only buttons.
- [ ] No dead code (orphan exports, unused imports, commented-out blocks).

### Tests

- [ ] Unit tests for new domain logic.
- [ ] Provider implementations: both Supabase and local exercise the new method.
- [ ] Tests describe behavior, not implementation (no testing private internals).

---

## 8. Where to find things

| Question                                                    | File                      |
| ----------------------------------------------------------- | ------------------------- |
| Project goals, locked-in decisions, contributor onboarding  | `CLAUDE.md`, this file    |
| Current architecture + target architecture + migration plan | `docs/ARCHITECTURE.md`    |
| Visual identity, tokens, component spec                     | `docs/DESIGN-LANGUAGE.md` |
| What every backend op contractually does                    | `src/services/types.ts`   |
| Domain logic that has no provider awareness                 | `src/lib/`                |
| Project-wide constants (roles, statuses, etc.)              | `src/constants/index.ts`  |
| Unit-test double for the provider interfaces                | `src/services/local/`     |

---

## 9. Asking for help

- Stuck on a design decision? Open a draft PR with a question in the description. Better than a Slack message that decays.
- Found a bug not mentioned in the audit? File an issue with reproduction steps + expected vs actual.
- AI agent unsure how to proceed? Re-read `CLAUDE.md` and `docs/ARCHITECTURE.md`. If those are insufficient, ask the user (don't guess in load-bearing places).

---

## 10. License & credits

This project is MIT licensed. By contributing you agree your contributions are licensed under the same terms.

Visual identity inspired by the Madhubani / Mithila painting tradition of Bihar, India.

---

_Last revised: 2026-06._
