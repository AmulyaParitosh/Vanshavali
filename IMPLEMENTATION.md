# IMPLEMENTATION — Vanshavali spec-driven redesign

> This file is the durable receipt log for the redesign mandate in the design project's
> `CLAUDE-CODE-PROMPT.md`. It, plus `COMPONENTS.md`, `QUESTIONS.md`, `INTEGRATION.md`, and the
> `redesign-loop` memory, are what survive a compaction. The conversation does not. Keep them current.

---

## RESUME / ORIENTATION (read this first on any fresh or compacted turn)

**Mandate.** Implement the finished Vanshavali redesign exactly, in 7 waves, one unit at a time,
each unit's Playwright/Vitest test file green before moving on. Correctness matters, time does not.
Full mandate = `CLAUDE-CODE-PROMPT.md` in the design project (fetch it; see below). It is identical
to the build prompt that was pasted into this session.

**Where the specs live — THEY ARE NOT ON DISK.** The 16 design documents live in the Claude Design
project **"Family tree website redesign"**, projectId **`dd87d264-b5d2-4737-8e4c-9233afb2398d`**,
read via the `DesignSync` MCP tool (load its schema with ToolSearch `select:DesignSync` first):

```
DesignSync method=get_file  projectId=dd87d264-b5d2-4737-8e4c-9233afb2398d  path="Spec 00 - Foundations.dc.html"
DesignSync method=list_files projectId=dd87d264-b5d2-4737-8e4c-9233afb2398d
```

`get_file` returns the raw file content directly (HTML for `.dc.html`; `contentType`/`isBase64`
fields tell you the encoding). Content is capped at 256 KiB. This is the "read the spec" primitive —
re-fetch on demand, do not reason about measured values from memory.

Files in that project: `Spec 00 - Foundations` … `Spec 13 - Write states`, `Vanshavali Components`,
`Vanshavali Style Guide`, `Vanshavali App` (25 hi-fi screens), `Vanshavali Landing`,
`Vanshavali - Current App`, `Vanshavali Wireframes`, and `assets/{banner.jpg, node_border_320.png,
node_border.png, paper_texture.jpg, canvas_background.png, madhubani_banner.png}`.

**Codebase.** Next.js app router + Supabase (Postgres via `pg` + raw SQL, NOT Drizzle — the prompt
says "Drizzle" but that is wrong for this repo; follow the repo idiom per ground rule §2). Providers
abstraction, service-layer authz (no RLS). See `CLAUDE.md`. Branch: **`f/design-system`** — build ON
the existing redesign work (a prior, looser loop already redid most screens); bring it to spec, do
not rebuild from scratch.

**Tests.** Playwright for DOM/acceptance + the 12 integration contracts; Vitest for permission/merge/
logic. One test file per spec, one test per Acceptance checkbox, checkbox text as the test name.
`npm run test:e2e` (Playwright), `npm run test` (Vitest). See `QUESTIONS.md` Q1 for the CLAUDE.md
reconciliation.

**Local run harness.** Local Supabase stack must be up (`npm run stack:status`). Dev server:
`NEXT_PUBLIC_ENV=local npm run dev` on :3000. Never `next build` while `next dev` runs (corrupts
`.next`). Seeded test tree from the prior loop: **`tree_e9PAKZi8KB`** (Ishaan Verma family); auth as
**designreview2@local.test / password123**. DB: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`.

**Commits.** NO AI-agent trailer / no `Co-Authored-By` (established hard rule on this branch — all its
commits omit it; overrides the harness default). Descriptive messages. Husky runs eslint+prettier.

**Per-unit loop.** read spec → write tests → plan → implement (compose primitives in `globals.css`,
no raw hex) → verify against measured values → green tests → integration-check → record receipt here →
commit → compact → next unit. See prompt §5.

**Build order / current position.** See `## Progress` below. Waves: 0 Foundations → 1 Data+write infra
→ 2 Record panel → 3 (Tree/Members/Households) → 4 (Search/Settings/Account) → 5 (Sign in/My trees/
Invitation/Getting started) → 6 Landing → 7 Integration audit.

---

## Progress

**Wave 0 — Foundations** — COMPLETE (all sub-units DONE + green; component library = 44 tests).
Next: **Wave 1 — Data & write infrastructure** (Spec 00 §05 entities, §06 one-record rule, the
permission matrix server-side, and all of Spec 13: dirty tracking, explicit save, save toast + 12s
undo, itemised leaving guard, consequence dialog, conflict detection, offline). Then Wave 2 (record
panel, Spec 07). Fetch Spec 13 first (`DesignSync get_file … "Spec 13 - Write states.dc.html"`).

- Tooling setup — Playwright adopted, progress files created. **DONE**
- Spec mirror — `design-specs/` holds fetched specs + `extract-props.mjs`; distilled cited refs
  `_FOUNDATIONS.md` (Spec 00) + `_STYLE-GUIDE.md` (full token system). **DONE** (gitignored, on-disk durable)
- Tokens / Style Guide — **DONE** (see receipt below)
- Assets — `banner.jpg` / `node_border_320.png` / `paper_texture.jpg` in `public/`; paper wash wired.
  **DONE** (see receipt; note reconstructed 2/3 — QUESTIONS Q7)
- Auth fixture — Playwright `setup` project logs in via the UI and persists `storageState`; chromium
  reuses it (signed in as the seeded tree keeper). Seed constants in `tests/e2e/fixtures.ts`. **DONE**
- Shell (Spec 00 §02) — **DONE** (see receipt). Chrome + rail brought to spec; contract §1 green.
- Component library (`Vanshavali Components.dc.html`) — **IN PROGRESS** (mirror at
  `design-specs/Vanshavali-Components.html`; test `tests/e2e/components.spec.ts`). Sub-units by section:
  - Actions (buttons) — **DONE** (L275–343).
  - Inputs (L348–441) — **DONE** (search pill, data field, label/error/suggested, segmented, toggle,
    radio row, alias chip; components.spec.ts Inputs 8/8). Values (kept for reference): search pill
    (250×38, radius 999, 9/13, 14px, glyph 14) · data field
    (radius 12, 11/14, 15.5 value, label 12.5/600 #55504a, focus border #b22222 + halo, error msg 12.5
    #8b0000 at 6px) · suggested chip (10.5/600 #8a8377) · segmented switch (track #f8f2e4 border #e6ddc9
    radius 12 pad 3; segment radius 9 pad 7; selected bg #fffdf9 border #d8cdb4 600) · toggle (40×22,
    knob 18, off #d8cdb4 / on #b22222) · radio row (16px circle, 8px dot, selected bg #fff5f5 border
    #f0dcd8 radius 12, 2nd consequence line, "now" tag) · alias chip (5/11 radius 999 #f8f2e4 border
    #e6ddc9 13.5, ✕ 11 #8a8377) · place suggestion row (9/13, selected #fff5f5, reason 12.5 #8a8377,
    "new" tag 10.5 on #fdf1e2/#8a5300). Focus = border #b22222 + `0 0 0 3px rgba(178,34,34,.1)`;
    validate on blur/submit, never keystroke.
  - Status (chips/badges + absence/count/dirty/checklist markers) — **DONE** (components.spec.ts 9).
  - Containers & lists (card, shared row + header, preview block, panel footer) — **DONE**
    (components.spec.ts 7). Row h-padding/columns deferred to Spec 06/08 (QUESTIONS Q8).
  - Overlays (dialog, toast) — **DONE** (components.spec.ts 7); search palette = Spec 09.
  - Empty & loading (empty state, skeleton) — **DONE** (components.spec.ts 2).
  - A person (portrait 4 sizes + ring meaning) — **DONE** (components.spec.ts 6). Household node/pair
    glyph = Spec 05; panel/node name stacks = Spec 07/05.
    Component library **COMPLETE**: 44 tests. Page-owned pieces noted against their waves.
    Then generate/refresh COMPONENTS.md and run the whole components + integration suite.

### Shell audit (Spec 00 §02 vs current code) — architecture is sound, fidelity gaps remain

Composition today: `AppProvider` renders `<div class="App"><Header/> <main>{routed}</main> {user&&<CommandSearch/>}</div>`
(`src/providers/AppProvider.tsx:99`). `/tree/[id]/layout.tsx` adds `<div class="tree-shell"><TreeRail/>

<div class="tree-shell-content">{children}</div></div>`.
- **Contract §1 (no remount) already holds**: chrome bar is in AppProvider (never remounts); rail is in
  the tree layout (persists across `/tree/[id]/*` sub-routes — same `[id]` ⇒ no Loading/remount).
- Chrome bar (`src/components/Header.tsx`) gaps vs `_FOUNDATIONS.md` §Shell:
  1. **Missing the 260px search trigger** (spec chrome = wordmark · switcher · **search** · you). `CommandSearch`
     exists as the ⌘K palette in AppProvider — add a chrome-bar trigger button that opens it.
  2. **Avatar uses `stringToColor(...)` hash — spec is leaf-green `#2e8b57`**, 34px, border 1.5px
     rgba(255,255,255,.7), initial 14px/600 #fff. (Ground rule: green = "you" only.) Fix.
  3. Banner div `.chrome-bar-banner` — verify/rewire to `/banner.jpg` with gradient
     `linear-gradient(rgba(20,18,16,.76),rgba(20,18,16,.93))` + `background-position:0% 34%` (check globals.css).
  4. Verify geometry: 60px, padding 0 20px, gap 24px; wordmark Yatra 22px #fff + वंशावली 13px/500 #ff8c00.
- Rail (`src/components/TreeRail.tsx`) — not yet read; audit against §Shell (232px, #f8f2e4, 4 nav items
  Tree/Members/Households/Settings with active/hover states, tree identity, generation jump, attention block).
- After wiring: remove the heavy source PNGs (`madhubani_banner.png`, `node_border.png`, `canvas_background.png`)
  once nothing references them.

### PREREQUISITE for all in-tree tests — Playwright auth fixture (build first, next iteration)

The token/asset tests run unauthenticated on `/`. Every shell/panel/page test needs a logged-in session in
a seeded tree. Build a fixture that: seeds (or reuses) a user + tree via the local Supabase stack, logs in
(email/password), saves `storageState`, and exposes a seeded tree id. Prior loop used
`designreview2@local.test / password123` + tree `tree_e9PAKZi8KB`; confirm these still exist in the local DB
(`PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`) or re-seed. This is effectively the
first slice of Wave 1 infra and unblocks waves 2–6 testing.

Waves 1–7 — not started.

---

## Receipts

<!-- One block per completed unit, format:
## <unit name> — DONE | IN PROGRESS | BLOCKED
spec: <spec file>
files: <repo paths touched>
tests: <test file> — n/n passing
consumes: <shared components used>
decisions: <any spec ambiguity and how it was resolved>
deviations: <anything not matching the spec, and why — should be empty>
-->

## Tokens — the theme layer — DONE

spec: Vanshavali Style Guide.dc.html (§ colour/type/radius/shadow/heritage/motion), Spec 00 §08
files: src/app/globals.css (`:root`), tests/e2e/foundations.spec.ts
tests: tests/e2e/foundations.spec.ts — 7/7 passing
consumes: — (foundation)
decisions: The prior loop's colour/surface/line/text/tint/radius/shadow/shell-metric tokens were
already spec-exact — kept as-is. Added the full 26-rung px type ladder (`--fs-*`, job-commented;
legacy `--font-size-*` re-pointed onto it as aliases). Fixed heritage: paper wash `.05` page /
`.07` tree (was a single `.06`), added `--ornament-ring` / `--ornament-bar` / `--heritage-border`
with the restrained + plain overrides so one `data-heritage` value drives all four painted surfaces
(integration §4 groundwork). Added the product motion tokens `--ease cubic-bezier(.32,.72,0,1)`,
`--dur-panel 180ms` / `--dur-dialog 140ms` / `--dur-canvas 320ms`; kept legacy `--duration-*`.
deviations: `--ornament-ring` points at `/node_border_320.png`, and the paper wash still used the
prior loop's `/canvas_background.png` — both resolved in the Assets unit below.

## Assets — the three painted surfaces — DONE

spec: Vanshavali Style Guide.dc.html (§assets); Spec 00 §heritage
files: public/banner.jpg, public/node_border_320.png, public/paper_texture.jpg; src/app/globals.css
(body::before → paper_texture.jpg); tests/e2e/foundations.spec.ts
tests: tests/e2e/foundations.spec.ts — 9/9 passing (added: assets served; paper wash asset)
consumes: heritage tokens (`--heritage-paper`, `--ornament-ring`)
decisions: `paper_texture.jpg` is the real fetched file (151 KB, whole). `banner.jpg` (418 KB) and
`node_border_320.png` (236 KB) were reconstructed with `sips` from the design team's confirmed source
paintings (`madhubani_banner.png` 2.0 MB, `node_border.png` 1.9 MB) because `get_file` truncates at
256 KiB — same paintings, same optimization. Full rationale in QUESTIONS Q7.
deviations: banner/ring not byte-identical to the design originals (fetch cap). The heavy source PNGs
(`madhubani_banner.png`, `node_border.png`, `canvas_background.png`) remain in `public/` until the
shell + node components are rewired off them (Shell unit), then removed.

## Auth fixture — E2E infrastructure — DONE

spec: — (test infra; prerequisite for all in-tree specs)
files: tests/e2e/fixtures.ts, tests/e2e/auth.setup.ts, playwright.config.ts, tests/e2e/foundations.spec.ts
tests: runs as the `setup` project; foundations opted anonymous — full suite 10/10
consumes: local Supabase seed (designreview2@local.test owns tree_e9PAKZi8KB)
decisions: Log in through the real LoginScreen UI (not token injection) so the flow is exercised;
persist storageState to `.playwright/auth/user.json`; chromium project depends on `setup` and reuses it.
Seed password set deterministically via `crypt('password123', gen_salt('bf'))` on auth.users. Public
specs (landing/sign-in) opt out with `test.use({ storageState: { cookies:[], origins:[] } })`.
deviations: none.

## Shell — chrome bar + rail (Spec 00 §02) — DONE

spec: Spec 00 §02 (`_FOUNDATIONS.md` §Shell), integration contract §1
files: src/components/Header.tsx, src/components/TreeRail.tsx, src/components/CommandSearch.tsx,
src/providers/AppProvider.tsx, src/app/globals.css, src/app/tree/[id]/families/page.tsx,
tests/e2e/shell.spec.ts
tests: tests/e2e/shell.spec.ts — 8/8 (+ setup) passing; contract §1 (no-remount) green
consumes: tokens, heritage tokens, CommandSearch (⌘K palette)
decisions: Chrome bar now carries the 260px search trigger (opens CommandSearch via a
`vanshavali:open-search` event) and the leaf-green (#2e8b57) you-avatar; banner → `/banner.jpg`;
chrome gated on `user` so it's absent on Landing/Sign-in (Spec 00). Rail cut to the four spec
destinations Tree ❦ / Members ☰ / Households ❀ / Settings ✧ (dropped People/Family/About; Settings
shown to everyone), glyph column + count badges, name → 19px Yatra, and the active state fixed to a
SOLID red block with light text (was the red wash). Created `/tree/[id]/families` (re-exports the
family page until Wave 3's Households). No-remount already held architecturally (chrome in
AppProvider, rail in the persistent tree layout) — the test that first "failed" was capturing the
rail handle during the initial Loading tick; fixed the test, the app was correct.
Reconciliations (cross-referenced): rail bg stays `#fffdf9` (Style Guide "rail=Paper" + §01 screen;
§02 shellParts' `#f8f2e4` is the outlier). Chrome search trigger present per §02 + Style Guide m2,
though Spec 00 §01's tree screen shows a bottom canvas search pill instead — Spec 09/05 reconcile.
deviations: none for the shell itself. Follow-ups for later waves (not shell): the Members page still
shows a role `<select>` + "change a role from its dropdown" copy — a Spec-06 "Do not" violation to
fix in Wave 3; a stray fixed bottom-left "N" circle on tree/members pages to investigate in Wave 3;
`node_border.png` kept in `public/` until PersonAvatar is rewired to `--ornament-ring` (Wave 3).

---

## WAVE 1 — Data & write infrastructure (plan + receipts)

Spec 13 distilled at `design-specs/_SPEC-13.md`; permission matrix at `_FOUNDATIONS.md` §04.
Roles: repo `owner/editor/viewer` = spec `keeper/write/read`. Current write model is a bulk
`saveTreeData` (whole-tree diff, one `requireEdit`) — the spec's per-record patch + base-version
model is the rework below.

Units (each a commit; tests green before moving on):

1. **Permission-matrix rejection tests** — DONE. `tests/services/authz.test.ts` (26): 13/15 rows
   (view/edit/owner/invite guards). Rows 4 (see living dates) + 5 (edit own record) pend units 3–4.
2. **Entities + one-record rule** — Spec 00 §05/§06. Audit schema (Person.userId unique-where-not-null,
   one root/tree, one linked person/(tree,uid)) + ConsistencyValidator; encode the 5 consequences.
   Merge-on-join logic is unit-tested here (`tests/merge.test.ts`, integration §6); the Invite flow
   (Spec 04) and Account (Spec 12) consume it in Wave 5/4.
3. **Per-record patch model + conflict detection** — schema: add a version to people/families;
   patch endpoints (only changed fields); stale-base → 409 conflict (integration, Spec 13 flow 7).
   Replaces bulk `saveTreeData`.
4. **Self-edit exception + readers-see-dates filter** — the 2 remaining matrix rows: a reader may
   edit their OWN linked person (patch path); living relatives' exact dates redacted from readers
   unless `tree.readersSeeDates` (read projection). Adds their rejection tests here.
5. **Spec 13 client write-infra** — reusable: dirty-tracking/write-state hook (`.dirty-dot` labels,
   footer appears, Save disabled-until-dirty), save toast + 12s undo (onto `.toast`), itemised leaving
   guard (onto `.dialog`), deletion consequence dialog (type-to-confirm), offline/failed lines.
   Every later form/page consumes these; none hand-rolls its own. Retires `.confirm-dialog` +
   react-hot-toast legacy styling.

### Permission matrix — server-side enforcement — DONE

spec: Spec 00 §04 (`_FOUNDATIONS.md`)
files: tests/services/authz.test.ts (authz.ts already had the 4 guards)
tests: tests/services/authz.test.ts — 26/26 (13 of 15 matrix rows)
consumes: requireView/requireEdit/requireOwner/requireInvite
decisions: Roles owner/editor/viewer = keeper/write/read. Rows 4 (living-date projection) + 5
(self-edit) are enforced by the read filter + per-record patch path (units 3–4), which add their
own rejection tests — not skipped, deferred to the units that create the machinery.
deviations: none.

### Spec 13 dirty-tracking core — DONE

spec: Spec 13 (`_SPEC-13.md`) — flow 1/2/3, acceptance a2/a4/a6, edge 6
files: src/lib/writeState.ts, tests/lib/writeState.test.ts
tests: tests/lib/writeState.test.ts — 11/11
consumes: — (pure logic; every form's write-state hook builds on it)
decisions: Fields normalise to trimmed strings; "" = absent (whitespace-only diffs aren't dirty).
`diffFields` classifies Added/Changed/Removed with from→to; `isDirty` (a2), `toPatch` (only changed,
removal→null), `inversePatch` (Undo, a4), `summarizeChanges` (edge 6 first-6+more), `countInWords`.
deviations: none. The React hook + leaving-guard/consequence-dialog/save-toast UI that consume this
are built with the record panel (Wave 2) where there is a real form to attach them to.

### One-record rule — merge + propagation core — DONE

spec: Spec 00 §06 (QUESTIONS Q9, Option B); integration §6/§7
files: src/lib/onerecord.ts, tests/merge.test.ts
tests: tests/merge.test.ts — 7/7
consumes: — (pure logic; Invite §04 + Account §12 call it)
decisions: Own facts (name/sex/events/custom/photo) travel; tree-owned (id/userId/root) stay.
`mergePlaceholder` CLAIMS the placeholder (keeps its id + root → household/sibling/event refs intact,
one row, nothing re-pointed) and overlays the user's own facts + userId. `applyOwnFacts` propagates
own facts to every linked row keeping each row's id/userId/root; own facts are authoritative (a
cleared fact clears everywhere). Callers UPDATE the placeholder, never INSERT.
deviations: none. The service wiring (invite-accept merge, /user propagation) + API land with the
Invite (Wave 5) and Account (Wave 4) pages that own those seams.

### Spec 13 conflict detection — DONE

spec: Spec 13 flow 7 + a10 (`_SPEC-13.md`)
files: src/lib/writeState.ts (detectConflict/hasConflict), tests/lib/writeState.test.ts
tests: tests/lib/writeState.test.ts — 15/15 (4 new)
consumes: diffFields
decisions: Three-way merge (base / stored / mine): fields only I changed → safe write; fields both
changed to different values → conflict (Keep mine / See hers), never silent overwrite; converged
edits → no-op. Non-conflicting fields save even when another conflicts (flow 7).
deviations: none. Wiring to a real stale-detecting endpoint (base version on the record) lands with
the per-record patch model + record panel (Wave 2).

**Wave 1 logic core COMPLETE** — permission matrix (26), dirty-tracking (11), merge/propagation (7),
conflict (4 within the 15). Remaining Wave 1 = server patch/version wiring + Spec 13 UI, both built
with the **record panel (Wave 2)** where they are consumed and testable end-to-end. Vitest total: 134.

---

## WAVE 2 — Record panel (Spec 07) — plan + audit

Spec 07 distilled at `design-specs/_SPEC-07.md` (copy deck verbatim). The panel is the ONE shared
inspector for specs 05/06/08/09; it opens in place via `?person=` (integration §2), never a route.

### Current state — `src/components/tree/TreeInspector.tsx` (read-only) — audit vs Spec 07

Has: ornament bar, header (eyebrow "The record" + close ✕), identity (portrait + name + aliases +
b.date + "This is you" chip), Life (❀ events), Details (✧ custom), "In the family" relations as
clickable avatars, footer "Edit record" → **navigates to `/tree/[id]/people?id=`**.
Gaps vs Spec 07:

- **Edit-in-place MISSING** — "Edit record" navigates away; spec a2/a9 require editing IN the panel
  with the SAME form as Account. (Current editor = `src/app/tree/[id]/people/page.tsx` + `PersonForm.tsx`.)
- **Access block MISSING entirely** — no role display for readers, no keeper radio set, no Remove access
  (a3). The only write surface for roles is the panel (Members must not write roles from a table).
- **Prose lineage** — currently avatar chips, not the prose sentence with inline name links (a7).
- **Header** — eyebrow should be `Generation II · Mishra line`; add fact line `b. 1958, Madhubani ·
living`, relation-to-viewer `your father` (compute via GraphManager.findPath), 44px `.portrait--panel`.
- **Write infra** — no dirty footer / save toast+undo / leaving guard / consequence dialog (Spec 13).

### Sub-units (each a commit; build in focused context)

A. **Read mode to spec** — header (gen·line eyebrow, 44px portrait, fact line, relation-to-viewer),
prose lineage builder (pure fn: person+people+families+viewer → sentence with name links; edges
3/6: no-parents start, same-name gen disambiguation), Life, Details. Panel opens in place, Esc/close.
B. **Access block** — read (chip + stated line for everyone; own-record + no-account variants) and
keeper radio set (Read/Write/His-branch/Keeper with `now`) + Remove access. Role write is
keeper-only, server-enforced, panel-only. ("His branch only" = a 4th scope with no repo role yet —
log in QUESTIONS when built.)
C. **Edit-in-place + shared PersonForm** — fields replace values (a9: the SAME component Account uses);
`writeState` dirty tracking → `.dirty-dot` labels + `.panel-footer`; date precision `.segmented`.
D. **Write infrastructure wiring** — per-record patch endpoint (base version → 409; replaces bulk
`saveTreeData`), save toast + 12s undo (onto `.toast`), leaving guard (onto `.dialog` +
`summarizeChanges`), consequence dialog for Remove access (type-to-confirm). Consumes Wave 1 logic
(`writeState.ts`, `onerecord.ts`) + Wave 0 primitives. Retires `.confirm-dialog` + react-hot-toast.
E. **Tests** `tests/e2e/record-panel.spec.ts` — one per Spec 07 acceptance a1–a10 (+ integration §2).

The shared PersonForm (a9) is the hinge: build it once here, reuse on Account (Spec 12, Wave 4).
