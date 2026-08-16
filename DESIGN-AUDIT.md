# Design audit — the contract

The checkable distillation of `docs/DESIGN-LANGUAGE.md` (the source of truth) plus
what actually exists in `src/app/globals.css`. Reviewers audit UI files against
**this**; the orchestrator decides and applies the fixes.

## R1 · Tokens only — no raw values

No raw hex, rgb(), or magic px in component CSS or inline styles. Every hex below
has an exact token; using the literal is a violation:

| hex       | token                                              |     | hex       | token                            |
| --------- | -------------------------------------------------- | --- | --------- | -------------------------------- |
| `#1a1a1a` | `--text-primary` (text) / `--surface-chrome` (bar) |     | `#8a8377` | `--text-meta`                    |
| `#b22222` | `--color-red`                                      |     | `#a89f8c` | `--text-absent`                  |
| `#8b0000` | `--color-red-deep`                                 |     | `#33302b` | `--text-rail`                    |
| `#fff5f5` | `--color-red-wash`                                 |     | `#55504a` | `--text-strong`                  |
| `#ff8c00` | `--color-marigold`                                 |     | `#6b6455` | `--text-prose`                   |
| `#2e8b57` | `--color-green`                                    |     | `#e6ddc9` | `--line-structure`               |
| `#fffdf9` | `--surface-paper`                                  |     | `#d8cdb4` | `--line-control`                 |
| `#fdf5e6` | `--surface-canvas`                                 |     | `#f0e9da` | `--line-inner`                   |
| `#f8f2e4` | `--surface-tablehead`                              |     | `#f4ede0` | `--line-row` / `--surface-quiet` |
| `#e6e0d2` | `--surface-desk`                                   |     | `#fff`    | `--surface-paper` (usually)      |

A value with **no** token isn't automatically fine: per §00, "if a value has no
token, it needs a _job_ before it gets one". Flag repeated untokenised values
(e.g. the canvas joinery sepias `#8b6a4a` / `#b39a72`, the open-row border
`#f0dcd8`) as **needs-a-token**, naming how many places use them.

**Spacing** is the 4px scale `--space-1..16` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64).
`padding: 13px` is a violation — fix the layout, not the value.

## R2 · Legacy aliases are retired screen-by-screen

These still resolve but are legacy; using them in code that has been rebuilt is a
violation. Map them onto the system: `--color-primary*` → `--color-red*`,
`--color-neutral-*` → the surface/line/text token that fits the _job_,
`--color-surface` → `--surface-paper`, `--color-text*` → `--text-*`,
`--font-heading` → `--font-display`, `--header-height` → `--shell-chrome-h`,
`--shadow-strong` → the named shadow for that job, `--border-radius-*` → `--radius-*`.

## R3 · Compose the primitives, don't re-invent

`.btn` / `.btn-primary` / `.btn-secondary` / `.btn-quiet` / `.btn-danger`,
`.input`, `.chip` (`--keeper`/`--write`/`--read`/`--invited`), `.card`,
`.eyebrow`, `SegmentedControl` (the one "select 1 of N"), `RecordsScreen` +
`RecordsTable` (the one table page shell). A hand-rolled button/input/chip/toggle
that duplicates one of these is a violation — say which primitive it should use.

## R4 · One primary action per screen

Exactly one `.btn-primary` per screen; everything else outlined or quiet. Anything
the viewer isn't permitted to do is quiet, never the loudest thing on their page.
`.btn-danger` is red text on `--color-red-wash` — **never a filled red button**.

## R5 · Type

- **Yatra One** (`--font-display`) names things, never explains: wordmark, the one
  h1 per screen, generation numerals, dialog/onboarding titles. Never body copy.
- **Hind** (`--font-body`) all reading work. **Mono** (`--font-mono`) labels the eye
  should skip, and data.
- `.eyebrow` = 10px mono, `letter-spacing:.14em`, uppercase, `--text-meta`. Every
  section header / column head / context line is this same object. Never
  sentence-case it, never make it a link.
- Ladder: `--font-size-xs|sm|base|lg|xl|2xl|3xl|display`. Off-ladder sizes need a job.

## R6 · Shape & depth

Radius scales with the object: pressable → `--radius-pill`; a person → `--radius-circle`;
otherwise `--radius-26|22|18|16|14|12|10|9|8|4`. Shadows are the seven named ones,
each with one job. **Red-tinted shadows belong to red objects only** — a cream card
never casts a red shadow.

## R7 · Colour roles do not mix

Red = action + lineage + focus. **Marigold = ornament only** (rings, glyphs, the
wordmark) and **never carries text on cream** — it fails contrast. Green =
the viewer's own avatar and nothing else. Ornament stays on the four heritage
surfaces (chrome banner, portrait ring, 3px inspector bar, paper wash), all driven
by `--heritage-paper`/`data-heritage`.

## R8 · Content rules (these matter more than pixels)

1. **Missing is not empty** — _no date recorded_ / _no photograph_ / _no account_ in
   `--text-absent`. Never a blank cell or an em dash.
2. **The record opens in place** — clicking a person never navigates; it opens the
   same 384px inspector column.
3. **Permission lives in one column** — the "May" column is the only place access is
   shown or changed. Use `src/lib/access.ts` predicates, never inline role strings.
4. **Nothing gendered unless the record says so** — no pronoun hard-coded into a
   button or a label.
5. **No emoji anywhere.** The only glyphs are `❀` (marigold, life event) and `✧`
   (red, detail).
6. Roles/statuses come from `src/constants/index.ts` (`TREE_ROLES`,
   `SUGGESTION_STATUS`), never inlined strings.

## R9 · Accessibility & semantics

Every control has an accessible name. Dialogs trap and restore focus. Focus is the
one treatment: border `--color-red` + `--shadow-focus` (never a bare browser
outline, never colour alone). Chips never rely on colour alone. `'use client'` on
any component using hooks/browser APIs.

## Shell metrics (fixed furniture)

Chrome `--shell-chrome-h` 60px · rail `--shell-rail-w` 232px · inspector
`--shell-inspector-w` 384px · card padding 20–24px.

---

## Severity

- **P1** — breaks a rule the user sees: wrong role colour, filled red destructive,
  two primaries, emoji, gendered copy, missing-state shown as blank/em-dash,
  inaccessible control, permission logic outside the May column.
- **P2** — drift a designer would catch: raw hex with an existing token, legacy
  alias in rebuilt code, off-ladder type, off-scale spacing, wrong radius/shadow,
  re-invented primitive.
- **P3** — tidy: dead CSS, redundant class, comment/reality drift.

## Reviewer report format

Per finding: `file:line` · rule (R#) · severity · what's wrong (one line) · the
exact fix (token/primitive to use). No prose essays; no speculative redesign.
Report only what you can point at in the code you were given.

---

## Progress

Reviewers are **read-only** and run without worktree isolation on purpose: agent
worktrees branch from stale `main`, which would audit code that no longer exists.

| Batch | Surface                      | Files                                                                                                                                               | Status  |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| A     | Tree canvas + inspector      | Tree, HouseholdCard, TreeInspector, RecordInspectorDock, RecordEditor, AccessBlock, TreeLink                                                        | round 1 |
| B     | Records tables + pages       | RecordsScreen, RecordsTable, members, family, people, families                                                                                      | round 1 |
| C     | Panels, dialogs, guards      | AddPersonPanel, InvitePanel, Conflict/Consequence dialogs, Duplicate/Leaving guards, ToastSystem, GenerationRail                                    | round 1 |
| D     | The stylesheet               | globals.css (~6.7k lines)                                                                                                                           | round 1 |
| E     | Chrome, rails, onboarding    | Header, TreeRail, UserSidebar, Sidebar, TextListSidebar, GettingStarted, FirstRunCard, Loading                                                      | round 1 |
| F     | Auth, landing, account pages | LoginScreen, Landing, signin, reset-password, reset, invite/[id], about, trees, trees/new, user/\*                                                  | round 2 |
| G     | Shared inputs + search       | AliasesInput, CustomFieldsEditor, EventsEditor, ImageUpload, PersonForm, SegmentedControl, SearchItem, UnifiedSearch, CommandSearch, CreateTreeForm | round 2 |

### Round 1 outcome

Fixed (commits `785db4a`, `e43e745`): Households row states (an inline style beat
every selector), six buttons missing their `.btn` base, marigold text on cream,
the people-list's red structural border + filled-red active row with a lift,
gendered partner-picker titles, two blank/em-dash absences, the toast's emoji and
marigold gradient, green outside its one role — and **"ornament is a setting" made
real**: `data-heritage` now exists on `<html>` and all four surfaces answer to it
(it previously drove only the paper wash).

Measured: raw hex outside `:root` **92 → 44**; undefined-token fallbacks (which
always rendered a literal) **3 → 0**; `--color-node-border` (a red alias used for
structure) **4 → 0**. New tokens: `--line-open`, `--joinery-trunk`,
`--joinery-branch`, `--ornament-banner`.

**One finding rejected on review:** the access eyebrow's "What he/she may do" is
_required_ by Spec 07 a10 (gendered **by the record**), which §08.8 permits
because sex is recorded. The reviewer read §08.8 as banning it; the e2e test
encoding a10 is the tiebreaker. Reverted.

**Deferred (large, tracked):** the People page still runs the legacy `.edit-screen`
shell instead of `RecordsScreen`; ~830 lines of dead CSS to sweep; `ToastSystem`'s
CSS-in-JS and its duplicate `.confirm-dialog`; the landing page's off-grid spacing;
the four dialogs' missing focus trap.

### Baseline (measured before round 1)

- 92 raw-hex occurrences outside `:root` in `globals.css`; top: `#fffdf9` ×17,
  `#fff` ×16, `#f0dcd8` ×10, `#e6ddc9` ×6, `#f8f2e4` ×5.
- Legacy alias usage: `--color-primary*` ×17, `--color-text*` ×15,
  `--color-surface` ×12, `--color-neutral-*` ×11, `--border-radius-*` ×4,
  `--font-heading` ×4, `--header-height` ×3, `--shadow-strong` ×1.
- Raw hex in TSX: `LoginScreen.tsx`, `user/suggestions/page.tsx`.
