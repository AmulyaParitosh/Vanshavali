# Vanshavali Backlog

Work that's been identified and scoped but deferred from its parent phase. When picking up an item: read `docs/ARCHITECTURE.md` for current architecture, `docs/DESIGN-LANGUAGE.md` for the token/component spec, and the audit references below for the specific problem. Mark items "Resolved in:" with a one-line summary when shipped.

---

## Still open

### Asset optimization (needs external tooling)

- **Status**: not started — needs image-processing tooling (`sharp`, `imagemin`, or a hand pass through Squoosh / SVG-converter).
- **Audit ref**: §14 perf — `canvas_background.png` 8.3 MB, `madhubani_banner.png` 2 MB, `node_border.png` 1.9 MB. Target: ≤500 KB total decorative payload per page.
- **Scope**: Madhubani banner → optimized WebP @ 2x or hand-authored SVG (≤200 KB); canvas wash → CSS-generated tile pattern or small repeating SVG (≤50 KB); node border → hand-authored SVG (≤30 KB, single cached request). Use Next.js `<Image>` for all non-decorative photography.

### Component tests with React Testing Library

- **Status**: not started — domain/helper tests are in place; component tests aren't.
- **Audit ref**: explicitly deferred from Phase 14 by user choice.
- **Scope**: smoke tests for `Tree.tsx` (renders a hierarchy without crashing), `<MembersPage>` (lists members, role dropdown updates), `<LoginScreen>` (form switches between modes). Vitest + RTL infrastructure is already configured under `vitest.config.ts` — the components are still excluded.

### Playwright e2e

- **Status**: not started — explicitly deferred from Phase 14 by user choice.
- **Scope**: critical-flow smoke tests against a running Supabase or local-mode env — sign-up + auto-provision, invite-send + accept, create person, delete tree. Worth picking up before public launch.

### Heritage motif: error & 404 pages

- **Status**: partial — sign-in card, welcome modal, confirm dialog, and details card use the double-Madhubani-border treatment. Standalone 404 / 500 pages don't exist yet (Next.js defaults).
- **Scope**: `src/app/not-found.tsx` + `src/app/error.tsx` rendered with the same heritage shell.

### Tree visualization performance (large data)

- **Status**: not started — works fine for ≤200 person trees; D3 selectAll rebuilds on every data change.
- **Scope**: switch the React tree decomposition to use proper `key`-based reconciliation so only changed nodes re-render. Add virtualization (windowing) for trees > 500 people. Both useful when public users start importing large GEDCOM files.

### CLAUDE.md / docs maintenance

- **Status**: ARCHITECTURE.md §10 effort estimates predate Phase 3 — still mildly stale; DESIGN-LANGUAGE.md Part 1 (descriptive snapshot) is pre-Phase-11.
- **Scope**: when there's a natural editing pass on either doc, refresh the stale sections. Not urgent — the new sections are accurate; the stale sections just describe a less-evolved state for historical context.

---

## Resolved

| Item                                                                          | Resolved in   | Notes                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage bucket RLS policies                                                   | Phase 10      | `db/migrations/0002_storage_policies.sql` — bucket policies gated on `tree_members`.                                                                                                                                                                                    |
| `acceptInvite` server flow                                                    | Phase 10      | `/api/invite/accept` route + Resend wiring.                                                                                                                                                                                                                             |
| Firebase `subscribeToTreeData` dedupe                                         | Phase 8       | Firebase deleted entirely; moot.                                                                                                                                                                                                                                        |
| Atomic save in `LocalDataProvider.saveTreeData`                               | Backlog sweep | `/api/local/db` accepts `{ writes: [...] }`; the route writes temp files then renames so all-or-nothing.                                                                                                                                                                |
| `TreeSearch` glassmorphic dropdown unification                                | Backlog sweep | Migrated to shared `.search-dropdown` styling; backdrop-filter dropped.                                                                                                                                                                                                 |
| Three sidebar implementations                                                 | Backlog sweep | `TextListSidebar` now uses the shared `<Sidebar>` primitive — same active-item styling everywhere.                                                                                                                                                                      |
| Mobile responsive (header + sidebar collapse + forms stack)                   | Backlog sweep | Breakpoint tokens added; layouts collapse at `<=1024px` and `<=768px`; sidebars become full-width with max-height. Pinch-to-zoom via `touch-action: none` on the tree canvas.                                                                                           |
| Real `<dialog>` for ConfirmToast                                              | Backlog sweep | `ConfirmDialog` component (native `<dialog>`) with focus trap, Escape to cancel, async confirm state. `useToast().confirm()` drives it via a global pub/sub.                                                                                                            |
| D3 tree keyboard navigation                                                   | Backlog sweep | `<PersonNode>` gets `tabIndex={0}`, `role="button"`, Enter/Space to toggle lock, `:focus-visible` outline, focus-raises-node-to-front for the details card to clear siblings.                                                                                           |
| Heritage motif on sign-in card                                                | Backlog sweep | Double Madhubani border + inner secondary ring on `.login-content` via `::after`.                                                                                                                                                                                       |
| Empty-state CTAs (tree, people, family)                                       | Phase 12      | `EmptyTreeBanner` + welcome modal + first-person/first-family CTAs on the editor pages.                                                                                                                                                                                 |
| Button base modifiers (`btn-block`, `btn-sm`, `btn-outline-danger`, `btn-lg`) | Phase 11      | Added in the design-tokens pass. Note: full button-variant consolidation (single `.btn` base + `--primary/--secondary/--danger/--ghost/--icon` modifiers, dropping `.btn-approve`/`.btn-deny`/etc.) **was not done** — see "Still open" below if you want to finish it. |
| Orphan `screenshot.jpeg`                                                      | Backlog sweep | Deleted from `public/`.                                                                                                                                                                                                                                                 |

---

## Explicit non-goals (decided)

These were considered and intentionally **not** pursued, captured here so future Claudes don't reopen the debate:

- **Full button/input variant consolidation across all call sites** — Phase 11 added the missing CSS modifiers (`.btn-block`, `.btn-sm`, `.btn-outline-danger`); Phase 11 cleanup pass standardized inputs against design tokens. The remaining ~12 button class names (`.btn-approve`, `.btn-deny`, `.btn-icon-*`, etc.) still exist and could be collapsed to one `.btn` base + modifiers — but the cost is touching every JSX call site (~30), and the visual outcome is the same. Deferred indefinitely; if it gets done it'll be a focused refactor PR of its own.
- **Self-service account deletion / data export** — was earmarked for Phase 15. Phase 15 is postponed indefinitely; revisit when a user actually asks.

---

_Last revised: 2026-06. Add a "Resolved in" row when a backlog item ships._
