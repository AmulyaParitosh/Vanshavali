# Vanshavali Backlog

Work that's been identified and scoped but deferred from its parent phase. Each entry references the audit finding(s) that surfaced it, so the rationale stays attached.

When picking up an item: read `docs/ARCHITECTURE.md` for current architecture, `docs/DESIGN-LANGUAGE.md` for the token / component spec, and the audit references below for the specific problem statement. Then split the item into focused PRs.

---

## Phase 11 follow-up — design polish

Phase 11 landed the foundation (token system, semantic colors, dead-CSS cleanup, focus-visible, aria-labels on icon buttons, six-reds → `--color-danger`, broken-CSS fixes). The items below were scoped during that pass but deferred because each is a session-sized chunk on its own.

### Mobile responsive

- **Status**: not started.
- **Audit ref**: §11 (4 CRITICAL findings) — one media query in 1640 lines of CSS; 300px sidebars + 3em headers break on phones; no pinch-to-zoom on the D3 tree.
- **Scope**: add breakpoint tokens (`--breakpoint-sm/md/lg/xl`), collapse header to title + hamburger drawer at `< 768px`, convert both sidebars to slide-in drawers or top tab strips at narrow widths, bind pinch-to-zoom to D3-zoom on the tree, stack form rows below `--breakpoint-md`, audit every page for narrow-viewport layout breakage.
- **Why deferred**: significant per-component layout work; needs design judgment, not just CSS.

### Button base + variants consolidation

- **Status**: partial — Phase 11 added missing `.btn-block`, `.btn-sm`, `.btn-lg`, `.btn-outline-danger` and collapsed the danger reds. The 12-variant zoo still exists.
- **Audit ref**: §5 buttons — `.btn-approve`/`.btn-deny` don't extend `.btn`, `.btn-icon-add` uses bootstrap green semantics rather than `.btn-icon` base, `Tree.tsx` EDIT INFO button bypasses `.btn` entirely.
- **Scope**: define single `.btn` base + modifiers (`--primary`, `--secondary`, `--danger`, `--ghost`, `--icon`, `--icon-sm`). Migrate every `.btn-*` custom class + every JSX caller. Drop the `::before \2727` star from generic `.btn` (Phase 11 design rule) — reapply only on milestone toasts.
- **Why deferred**: larger refactor; touches ~30 JSX call sites + CSS rewrite.

### Input / select / textarea unification

- **Status**: not started.
- **Audit ref**: §5 inputs — 4 distinct select treatments (`form-group select`, `add-child-container select`, `role-select`, `status-select` — three of which duplicate the embedded chevron SVG), 3+ input treatments (form input, unified-search-input, aliases-container), unique inline-override for the Person name field, About page textarea doesn't match form inputs.
- **Scope**: define `.input` base + `--search` variant + `--inline` (transparent-underline) variant. Single chevron SVG via CSS custom property. Migrate every form across `/family`, `/people`, `/user/*`, and search components.
- **Why deferred**: same as button consolidation.

### Heritage motif consolidation

- **Status**: not started.
- **Audit ref**: §7 identity drift — Madhubani aesthetic stops at the tree + About page. The `corners` array in old `Tree.tsx` was "commented-in but never rendered" (now in new code via `<BackgroundOrnaments/>`); `links.each(... leavesGroup)` motif was wired but never drawn.
- **Scope**: per `DESIGN-LANGUAGE.md` §2.4 surface accents — Madhubani border on the sign-in / sign-up cards; empty-state illustrations with heritage SVGs; error-page (404/500) heritage flavor; invitation accept page (`/invite/[id]`); milestone toasts on first-tree-created / first-invite-accepted; decorative dividers on key page headers.
- **Why deferred**: needs design exploration + new SVG assets.

### Asset optimization

- **Status**: not started.
- **Audit ref**: §14 perf — ~14 MB decorative payload per page (`canvas_background.png` 8.3 MB, `madhubani_banner.png` 2 MB, `node_border.png` 1.9 MB × ~50 nodes). `public/screenshot.jpeg` (1.7 MB) is orphan.
- **Scope**: Madhubani banner → optimized WebP @ 2x or hand-authored SVG (target ≤200 KB); canvas wash → CSS-generated tile pattern or small repeating SVG (target ≤50 KB); node border → hand-authored SVG (target ≤30 KB, single network request cached). Delete `screenshot.jpeg`. Use Next.js `<Image>` for all non-decorative photography. Target: ≤500 KB total decorative payload per page.
- **Why deferred**: image processing pass; design judgment on what SVG-ization looks like for each motif.

### D3 tree keyboard navigation

- **Status**: not started.
- **Audit ref**: §10 CRITICAL — tree is entirely mouse-driven; no `tabindex` on nodes, no `Enter`-to-open, no arrow-key sibling traversal.
- **Scope**: extend `<PersonNode>` with `tabIndex={0}`, `role="button"`, `aria-label="View details for {name}"`. Bind `Enter` / `Space` to toggle lock. Bind arrow keys at the `<TreeCanvas>` level to navigate between siblings → parents → children using the laid-out positions. Update `:focus-visible` styling specifically for foreignObject node focus.
- **Why deferred**: real implementation work — keyboard nav model needs design + the new Tree decomposition makes this tractable but still ~1 session.

### Real `<dialog>` for ConfirmToast

- **Status**: not started.
- **Audit ref**: §5 modals — `ConfirmToast` is a `toast.custom` with no overlay scrim, no focus trap, no `aria-modal`, no escape-to-close. Two simultaneous confirms collide on the hardcoded `'confirm-toast'` id.
- **Scope**: replace `toast.confirm()` call sites with a new `<ConfirmDialog>` component that uses the native `<dialog>` element (or a stack-aware portal if `<dialog>` polyfilling becomes a pain). Add `role="alertdialog"`, `aria-labelledby`, focus-trap on open, escape-to-cancel, return-focus-on-close. Update callers in `family/page.tsx`, `people/page.tsx`, `user/profile/page.tsx`.
- **Why deferred**: focused refactor; need to verify behavior matches existing confirm flows.

### Empty / loading / error state design language

- **Status**: not started.
- **Audit ref**: §9 — three distinct empty-state patterns (`.welcome-message`, `.no-data` plain `<p>`, inline "No results found" in dropdowns). Loading variants: `<Loading>` component, `toast.loading`, inline "Sending..." text. No unified error-page design.
- **Scope**: single `<EmptyState illustration={...} title cta />` component used across all routes. Single `<Loading>` spinner used everywhere (deprecate `toast.loading` for full-page loads). Design 404 / 500 / access-denied pages with heritage illustrations.
- **Why deferred**: needs illustrative SVG work tied to heritage motif consolidation above.

---

## Other deferred items

These were identified by the audits but live outside Phase 11.

### Audit follow-up (mostly Phase 2 territory)

- **Firebase `subscribeToTreeData` dedupe** — `LocalDataProvider` has `lastDataString` dedupe; `FirebaseDataProvider` doesn't, so every poll tick rebuilds the tree. Moot once Firebase is removed in Phase 5, but a quick win if Firebase stays around longer.
- **Atomic save in `LocalDataProvider.saveTreeData`** — sequential `await saveDb(people)` then `await saveDb(families)`; if second fails, half-committed. Extend `/api/local/db` to accept a multi-collection batch, or write to temp files + atomic rename. Same pattern Supabase already gets for free via transactions.
- **`TreeSearch` glassmorphic dropdown** — re-implements the dropdown inline with `backdrop-filter: blur(4px)` that appears nowhere else. Migrate to the shared `.search-dropdown` styling from `PersonSearch`.
- **Three sidebar implementations** — `UserSidebar`, `TextListSidebar`, raw `.sidebar` markup. Audit §6 documents the divergence. Worth unifying when mobile responsive lands.

### CLAUDE.md / docs maintenance

- `docs/ARCHITECTURE.md` §10 effort estimates are pre-Phase-3 and overshoot reality now. Worth a quick edit when one of the remaining phases (5/6/7/8) ships.
- `docs/DESIGN-LANGUAGE.md` Part 1 (descriptive) is now stale — Phase 11 fixed many of the issues it documents. Either rewrite Part 1 to reflect post-Phase-11 state or note that Part 1 is the pre-Phase-11 baseline (which is useful for context but should not be read as current).

### Tests

- Component tests with React Testing Library — currently we only have logic / helper tests. The audit didn't ask for component tests in v1, but as Tree, AppProvider, and the hooks settle they're worth adding.
- E2E with Playwright — explicitly deferred from Phase 14 by the user's choice. Reconsider before public launch.

---

_Last revised: 2026-06. Add a section per item picked up; mark resolved with "Resolved in: <commit / PR>" and a one-line "what shipped"._
