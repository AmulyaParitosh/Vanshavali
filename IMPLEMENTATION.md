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

### Wave 2 sub-unit A (part 1) — read-mode logic core — DONE

spec: Spec 07 (`_SPEC-07.md`) — header relation, prose lineage; edges 3/6
files: src/lib/lineage.ts, tests/lib/lineage.test.ts
tests: tests/lib/lineage.test.ts — 9/9
consumes: GraphManager.findPath / getAllFamilies
decisions: `describeRelation` walks the shortest kinship path → phrase (one-step by sex; grandparent

- first-cousin collapses; else a possessive chain "father's brother's wife"), null for self/unrelated.
  `buildLineage` gathers childOf (parents + birth ordinal) + unions (spouse + children) for the prose.
  Gender from person.sex, never hard-coded (a10). Divergences found: Q10 two-script names (§3 deferred),
  Q11 marriage date/place not on Family (deferred; prose reads "Married X" without place/year for now).
  deviations: none in the logic. Wiring into TreeInspector (header + prose render + CSS), the access
  block, edit-in-place, and write infra are the remaining Wave 2 sub-units (A part 2, B, C, D).

### Wave 2 sub-unit A (part 2) — record panel READ MODE to spec — DONE

spec: Spec 07 (`_SPEC-07.md`); acceptance a2, a7, a10 (read-mode-verifiable)
files: src/components/tree/TreeInspector.tsx (rewritten read mode), src/components/Tree.tsx
(passes viewerPersonId), src/app/globals.css (name 20px, secondary meta, +fact/relation/prose/link,
portrait→.portrait--panel, close→.icon-close), tests/e2e/record-panel.spec.ts
tests: tests/e2e/record-panel.spec.ts — 5/5 (a2 no route change, a7 prose links swap in place, a10
relation from sex, header eyebrow/name/prose)
consumes: lineage.ts (describeRelation/buildLineage/ordinalWord), generations (generationMap/roman/
bornInLine), .portrait--panel, .icon-close, .eyebrow
decisions: Header = "Generation {roman} · {line} line" (line = root person's surname), 44px panel
portrait with born(red)/married(marigold) ring via bornInLine, fact line from the birth event,
relation "your {kin}"/"this is you". Prose lineage rendered from buildLineage with every name an
inline `.prose-link` that swaps the panel in place. Verified via screenshots on the Ishaan tree.
deviations: "Edit record" is still a footer link to the legacy `/people?id=` editor — replaced by the
header outlined button + edit-in-place in sub-unit C. No "· living" in the fact line (no `living`
field; Q-note). Two-script name (§3) shows official_name only (Q10). Access block = sub-unit B.

### Wave 2 sub-unit B — access block (read display) — DONE

spec: Spec 07 access block (read half of a3, a10)
files: src/components/tree/AccessBlock.tsx, src/components/tree/TreeInspector.tsx (renders it first),
src/components/Tree.tsx (subscribes to members → membershipByPerson, passes personMembership +
viewerIsKeeper), src/app/globals.css (.access-_), tests/e2e/record-panel.spec.ts
tests: tests/e2e/record-panel.spec.ts — 9/9 (4 new: role chip + since; gendered eyebrow a10; own-record
note; no-account + Invite)
consumes: .chip_, .btn-quiet, .eyebrow; subscribeToMembers
decisions: Access stated to EVERY viewer (chip + "…· since {Mon YYYY}"); own record → "This is your
access. Only a keeper can change it."; no account → "Not on Vanshavali yet" + "Invite {him/her}"
(keeper) linking to Members. Eyebrow "What {he/she} may do" gendered from person.sex (a10).
Members plumbed via a Tree-local subscription (other surfaces already have it / add later).
deviations: keeper radio set + role Save + Remove access = sub-unit D (footer + consequence dialog).
"His branch only" 4th role deferred (QUESTIONS Q12). Deceased-hides-block edge n/a (no living field).

### Wave 2 sub-unit C — edit affordance to spec + FINDING — PARTIAL

spec: Spec 07 edit mode; a9
files: src/components/tree/TreeInspector.tsx (header outlined "Edit record"; removed read-mode footer),
src/app/globals.css (.inspector-actions)
tests: tests/e2e/record-panel.spec.ts — still 9/9
decisions: Read mode now has NO footer (spec); "Edit record" is an outlined header button, shown to a
writer/keeper or anyone on their own record. It opens the legacy editor for now.
**FINDING (reshapes C):** `PersonForm.tsx` is the LEGACY full-page editor (section-cards, its own
Save/Delete, a `toast.confirm` delete) — it does NOT match Spec 07's panel-fit edit mode. So a9
("same form as Account") means BUILDING a spec-faithful shared edit form (fields in place; sections
name+photo / facts / life / details; date-precision `.segmented`; `writeState` dirty `.dirty-dot`
labels; the `.panel-footer` Discard/Save) used by BOTH the panel and Account (Spec 12), replacing the
legacy PersonForm. That is the real C build — a substantial shared component, best built cohesively
with Account in view, then D layers the write path (patch endpoint, toast+undo, leaving guard,
consequence dialog, keeper role radio) on top.
deviations: "Edit record" still navigates to the legacy editor (in-place edit = C proper).

### Wave 2 sub-unit C — edit-in-place shared form — DONE

spec: Spec 07 edit mode; a2, a4, a9
files: src/components/tree/RecordEditor.tsx (new shared form), src/components/tree/TreeInspector.tsx
(edit/read branch; "Edit record" → setEditing), src/components/Tree.tsx (onSaveRecord via onSave/
saveTreeData + savingRecord), src/app/globals.css (.record-editor\*), tests/e2e/record-panel.spec.ts
tests: tests/e2e/record-panel.spec.ts — 12/12 (added: fields in place, no route change, footer only
when dirty, Save enabled when dirty, Discard returns to read)
consumes: writeState.isDirty; reuses ImageUpload/AliasesInput/EventsEditor/CustomFieldsEditor;
.input/.segmented/.field-label/.dirty-dot/.panel-footer
decisions: RecordEditor is THE person form (a9) — used in the panel now, and on Account in Wave 4.
Fields in place (photo, name, sex segmented, aliases, life, details); overall dirty via deep-compare
drives the footer (disabled-until-dirty, a4); changed identity labels get a `.dirty-dot`. Save
persists via the existing bulk `onSave`/`saveTreeData` for now.
deviations: Save uses bulk saveTreeData (per-record patch + base-version = sub-unit D). No save
toast/undo, no leaving guard on dirty-close, keeper role radio + Remove-access consequence dialog,
date-precision segmented per event — all sub-unit D. Photo upload + legacy sub-editor styling are a
touch oversized for 384px — cosmetic polish noted.

### Wave 2 sub-unit D (part 1) — the leaving guard — DONE

spec: Spec 13 flow 4, a6; Spec 07 a6; integration §10
files: src/components/tree/LeavingGuard.tsx, src/lib/personChanges.ts, src/components/tree/RecordEditor.tsx
(reports changes/draft up), src/components/tree/TreeInspector.tsx (gates ✕/Esc close, renders guard),
src/app/globals.css (.leave-\*, .verb-chip), tests/e2e/record-panel.spec.ts
tests: tests/e2e/record-panel.spec.ts — 15/15 (added: dirty close → itemised guard; clean close → none)
consumes: .dialog/.dialog-scrim/.dialog-eyebrow/.dialog-heading/.dialog-actions, summarizeChanges,
countInWords, .btn-danger-text
decisions: Closing (✕ or Esc) a dirty edit shows the guard — eyebrow "Not saved yet", heading "Leave
without saving?", body with the count in words + name, an itemised change list (verb chip + old→new),
and Save-and-leave / Keep editing / Throw-them-away. Never a browser confirm. `personChanges` itemises
name/sex/photo/aliases/life/details; arrays collapse to one entry each. Scrim-click = Keep editing.
deviations: change list is per-field (arrays as one entry), not per-event as the spec sample; enough
for a6. Save toast + 12s undo, keeper role radio + Save, Remove-access consequence dialog, and the
per-record patch endpoint + conflict remain (D parts 2–4).

### Wave 2 sub-unit D (part 2) — save toast + 12s undo — DONE

spec: Spec 13 flow 2/3, a4; Spec 07 (Save → toast, returns to read)
files: src/components/ToastSystem.tsx (SaveToastHost + showSaveToast), src/components/Tree.tsx (fires
it on save, with the inverse restore as Undo), src/app/globals.css (.toast-viewport), src/app/layout.tsx
(ToastSystem moved OUTSIDE AppProvider — bug fix), tests/e2e/record-panel.spec.ts
tests: tests/e2e/record-panel.spec.ts — 13/13 (added: Save → toast names tree + "everyone sees it now"

- Undo; Undo → "Put back the way it was")
  consumes: .toast/.toast-glyph/.toast-body/.toast-primary/.toast-consequence/.toast-action
  decisions: A dedicated bottom-centre SaveToastHost (react-hot-toast is top-right) renders the spec
  toast — "Saved to {tree}" + "{summary} · everyone sees it now" + Undo — for 12s (3.5s plain), one at
  a time. Undo re-saves the previous people array and confirms with "Put back the way it was".
  **Bug fixed:** ToastSystem was inside AppProvider, so the transient Loading during the post-save
  re-fetch unmounted the open toast; moved it outside AppProvider (it uses no context).
  deviations: the consequence summary is the changed field labels ("Name" / "Name and 2 more"), not the
  spec's exact "2 life events and the gotra" phrasing. Undo restores via bulk save (per-record patch =
  D part 4). Keeper role radio + Remove-access consequence dialog = D part 3.

### Wave 2 sub-unit D (part 3a) — keeper access write (role radio + Save) — DONE

spec: Spec 07 access-block keeper; a3 (editable only by keeper), a5 (no confirm before role change)
files: src/components/tree/AccessBlock.tsx (keeper radio set + Save), src/components/tree/TreeInspector.tsx

- src/components/Tree.tsx (onChangeRole via updateMemberRole + role toast + undo), src/app/globals.css
  (.access-preface/.access-roles/.access-role-\*/.access-controls), tests/e2e/record-panel.spec.ts
  tests: tests/e2e/record-panel.spec.ts — 16/16 (added: keeper sees radio + `now`; role change saves with
  NO confirm dialog + Undo restores; own record shows no radio)
  consumes: .radio-row/.radio-dot/.radio-now, updateMemberRole, showSaveToast
  decisions: A keeper viewing another MEMBER sees the Read/Write/Keeper radio (stored role marked `now`,
  spec role copy verbatim); a Save appears only when the selection differs and writes via
  updateMemberRole with NO confirmation (a5). Toast "{name} may now …" carries Undo (restores prev
  role). Own record → no radio, "Only a keeper can change it" (a3/edge). Renders only 3 repo roles
  (QUESTIONS Q12: "His branch only" 4th scope deferred). Seed gained a 2nd member (Meera→designreview3,
  editor) — documented in fixtures.ts for re-seed.
  deviations: role Save is an inline access-block button, not the shared panel footer (the footer is
  edit-mode's). Remove-access consequence dialog (a8) = part 3b; per-record patch endpoint = part 4.

### Wave 2 sub-unit D (part 3b) — Remove access via consequence dialog — DONE

spec: Spec 07 flow 7, a8; Spec 13 consequence dialog
files: src/components/tree/ConsequenceDialog.tsx (reusable), src/components/tree/TreeInspector.tsx +
src/components/tree/AccessBlock.tsx (Remove access → dialog), src/components/Tree.tsx (removeMember +
toast), src/app/globals.css (.consequence-line/.consequence-softer), tests/e2e/record-panel.spec.ts
tests: tests/e2e/record-panel.spec.ts — 17/17 (added: Remove access → consequence dialog names what
stays, action is the quiet destructive pill not filled red, Cancel is non-destructive). a8
(person record survives an access removal) verified one-off + seed restored.
consumes: .dialog/.consequence/.dialog-actions, .btn-danger, removeMember
decisions: Built a reusable ConsequenceDialog (eyebrow, heading, consequence block, optional
type-to-confirm for irreversible deletions, Cancel + quiet-red destructive action; scrim/Esc cancel
only when not name-gated). Remove access uses it WITHOUT type-to-confirm (reversible — re-invitable):
"keeps their record … can no longer open or change anything until re-invited." Person record is never
touched (a8). ConsequenceDialog is ready for person/tree deletion (Spec 08/11) with confirmName set.
deviations: none for the dialog. Q13: removeMember appears to also clear the global public.users
profile — investigate at Members (Spec 06). Per-record patch endpoint + conflict = D part 4.

### Wave 2 sub-unit D (part 4) — per-record patch + base-version conflict — DONE

spec: Spec 13 flow 7 + a10 (`_SPEC-13.md`); Spec 00 §04 matrix row 5 (self-edit)
files:

- schema: supabase/schemas/10_tables.sql (people.version) + migration
  20260729071315_add_people_version.sql; person/{patch,find}.sql + list-by-tree/upsert
  (select/bump version); PersonRepository.{find,patch}; mappers (Person.version, row col, never in data)
- service/route: tree-data-service.patchPerson (optimistic lock → 409 with fresh record);
  authz.requireEditOrSelf (self-edit exception); lib/api HttpError payload; PATCH
  /api/tree/[id]/person/[personId]
- provider: types PatchPersonResult + TreeDataProvider.patchPerson; ApiDataProvider.patchPerson
  (raw fetch, 409→conflict result); withRefresh MUTATIONS += patchPerson
- client: lib/personMerge (overlayPersonFields/changedFieldKeys) + personChanges.personFieldMap
  (shared keyspace); TreeInspector commitSave/resolveConflict (three-way merge orchestration);
  tree/ConflictDialog; Tree.savePerson (network + toast + 12s undo, replaces bulk onSaveRecord);
  globals.css .conflict-\*
  tests:
- tests/services/authz.test.ts — 32 (added 6: self-edit row 5 — editor/keeper edit anyone,
  reader edits ONLY own linked record, reader rejected on another's/unlinked, non-member rejected)
- tests/lib/personMerge.test.ts — 6 (changedFieldKeys; overlay keeps id/userId/root from stored,
  takes only chosen groups from mine, clears a blanked field)
- tests/e2e/record-conflict.spec.ts — 2 (a10: same-field edit on both sides → conflict dialog,
  my choice saves; flow 7: different-field edit → silent field-group merge, no dialog). Simulates
  the concurrent write via pg (bumps version); snapshots + restores Arjun each test.
  Vitest 155 · record-panel 17 · shell 9 · record-conflict 2 — all green.
  consumes: writeState.detectConflict (Wave 1), the record panel (sub-units A–D3b)
  decisions:
- Storage stays whole-`data` jsonb; `version` is the optimistic lock. Field-level conflict logic
  lives client-side on the flat personFieldMap keyspace (Name/Sex/Photograph/Also-known-as/Life/
  Details) — the same keys the leaving guard uses. A stale save → 409(stored); client runs
  detectConflict: no contested field → merge my groups onto the fresh record + re-save silently;
  contested → ConflictDialog (per-field Keep mine / Use theirs, never a silent overwrite).
  overlayPersonFields always keeps id/userId/root from the STORED record (a draft can't move them).
- Kept bulk saveTreeData for the family editor + legacy paths (they migrate to per-record in their
  own waves). Record panel now saves via patchPerson only.
- Self-edit exception (matrix row 5) enforced in requireEditOrSelf: editor/keeper edit anyone; a
  reader edits only the record whose user_id is their own. Row 4 (readers-see-dates projection)
  still pends its own unit (needs a tree setting — build with Settings/Spec 11).
  deviations / findings:
- FINDING (cross-cutting, FIXED): every mutation bumps the refresh nonce, and the three tree-scoped
  subscribe hooks (useTreeSubscription/useTreeMembership/useMyTrees) reset isLoaded=false on EVERY
  effect run — so each save flashed a full-page <Loading/> and UNMOUNTED the page, discarding
  in-place state. Harmless for navigation-based flows but fatal for the conflict dialog (and the
  reason ToastSystem had to live outside AppProvider). Fixed at the source: the hooks now gate the
  Loading state only on a real key change (tree/uid), and keep stale data on screen during a
  background nonce re-fetch — which is what CLAUDE.md's "re-fetch after its own mutations" intends.
- The a5 role-Undo e2e test could end before its fire-and-forget restore write landed (the radio
  reads "now" off stale state); with the faster no-remount path this left the seed dirty. Hardened
  it to wait for the Undo's post-write confirmation toast (no product bug — the write completes in a
  real browser; only Playwright's context-close aborted it).

### Wave 2 sub-unit E — Spec 07 acceptance coverage map — DONE

spec: Spec 07 acceptance a1..a10 (`_SPEC-07.md`)
files: tests/e2e/record-panel.spec.ts (+a1 search test); src/components/Tree.tsx (open the panel on
any ?person= change, not just on mount — see below)
Coverage of a1..a10 (repo roles owner/editor/viewer = keeper/write/read):

- a1 one panel serves canvas/members/household/search — TESTED for canvas (?person=) + SEARCH (⌘K
  hit opens the same inspector in place). Members-table + household-editor surfaces reuse the same
  component and get their opening tests when those pages are built (Wave 3).
- a2 opening never changes the route — TESTED (mount + edit-in-place + search all stay on the tree route).
- a3 access shown to every role, editable only by a keeper — TESTED: keeper sees the radio set; self
  sees the stated access + "only a keeper can change it" (no radio). The non-keeper-viewing-another
  read-only case needs a second (write/read) auth session — built with Members (Spec 06, Wave 3),
  which owns multi-role permission e2e.
- a4 Save disabled until dirty — TESTED (footer/Save appear only when dirty) + writeState unit tests.
- a5 no confirmation before a role save — TESTED.
- a6 dirty close routes through the unsaved-changes dialog — TESTED.
- a7 prose lineage names are working links that swap the panel — TESTED.
- a8 removing access never deletes the record — the dialog + Cancel non-destructive is TESTED; the
  destructive "remove → person survives" e2e defers to Wave 3 Members alongside the Q13 fix
  (removeMember currently also clears the global profile). Verified once by hand meanwhile.
- a9 the edit form is the SAME component as Account — RecordEditor is that one component (exercised
  in the panel). The "same on Account" reuse is proven when Account is built (Spec 12, Wave 4).
- a10 no copy assumes an unrecorded gender — TESTED (relation line + access eyebrow both gendered
  from person.sex).
  decisions: Added an a1 test for the search surface, which surfaced a real gap — Tree read ?person=
  only as initial state, so a same-page ⌘K search (router.push ?person=) didn't open the panel. Fixed:
  Tree now opens + pans to whatever ?person= names whenever it changes (a node click still sets the
  selection without touching the URL, so it doesn't re-trigger and the clicked node stays put).
  deviations: a3 non-keeper-view, a8 destructive, a9 Account-reuse are each deferred to the wave that
  builds the surface they need (Members W3 / Account W4) — not skipped; noted with a concrete home.

**WAVE 2 (record panel, Spec 07) COMPLETE** — read (A), access (B), edit-in-place (C), write infra
(D1 guard, D2 toast+undo, D3a role, D3b remove, D4 patch+conflict), acceptance map (E). One shared
inspector + RecordEditor; per-record optimistic-locked writes with three-way conflict resolution.

---

## WAVE 3 — Tree / Members / Households (plan + receipts)

Specs: Spec 05 Tree, Spec 06 Members (distilled `design-specs/_SPEC-06.md`), Spec 08 Households.
Members sub-units: M-A table · M-B invite panel · M-C add-person + duplicate guard · M-D in-place
inspector host + Q13 removeMember fix · M-E acceptance a1–a10.

### Wave 3 Members M-A — the list/table to Spec 06 — DONE

spec: `_SPEC-06.md` — columns, ordering, May column, search; a3/a9/a10
files: src/app/tree/[id]/members/page.tsx (rewrite); src/types/person.ts + src/repositories/mappers.ts
(Person.updatedAt, mapped from row, stripped from stored data like version); src/app/globals.css
(.records-col-portrait/-name/-relation[.you/.none]/-updated/-overflow; born 112, may 112; row-as-link
reset; .records-reader-note)
tests: tests/e2e/members.spec.ts — 6 (column set; generation-not-alphabetical a10; May display + no
inline <select> a3; row links to ?person= + opens the record a1; search by name/alias, stable, empty
state a9). Vitest mappers 15 (updatedAt round-trip).
decisions:

- Columns to spec: portrait(40) · Name(flex, official + aliases) · Gen(46 roman) · Born(112, "no date
  recorded" faint when absent) · Relation to you(150 — "you" red / describeRelation phrase / "not
  connected yet" faint, edge e5) · Updated(82 relative) · May(112) · ⋯(22). Whole row is the link to
  the record; only interactive May controls (M-B) will stop propagation.
- Ordering: generation, then birth instant (Date.parse of the birth event; undated sort last within
  the generation), then a stable original index — never alphabetical (a10). Search filters the same
  list without re-sorting and matches official name + every alias (a9); empty = "Nobody here by that
  name".
- a3: the inline role <select> + inline Remove are GONE. The May column only DISPLAYS the chip
  (Keeper/Write/Read) or lowercase "no account"; roles change only in the record panel. Row click
  opens that panel via ?person= (in-place hosting on the Members route = M-D).
  deviations / interim (documented, with a home):
- The per-row keeper "Invite" pill + the "Invited" chip are NOT here yet: the repo's TreeInvite is
  email-based with no personId, so an invite can't be tied to a row. Both land in M-B (invite panel),
  which also moves invites off the temporary bottom form now kept for function.
- "+ Add person" still links to the legacy /people editor; the relationship-first add panel +
  duplicate guard is M-C. Readers correctly see "Ask a keeper to add someone" (a5) already.
- In-place inspector on the Members route (a1/a2 "never changes the route") = M-D; today a row
  navigates to the canvas ?person=. The record panel it lands on already carries the keeper role
  radio + Remove access (Wave 2 D3), so a3's write path is live.

### Wave 3 Members M-B — the invite panel (row-fired) — DONE

spec: `_SPEC-06.md` — invite panel + May "Invite"/"Invited"; a4 (+ edge e2), a8
files:

- schema: tree_invites.person_id (nullable FK → people, on delete cascade) + migration
  20260729114150_add_invite_person_id.sql; invite/{insert,find,list-by-tree}.sql (+person_id);
  TreeInvite.personId (type + mapper); InviteRepository.insert(personId); invite-service.createInvite
  (personId param); POST /api/tree/[id]/invites (personId); DataProvider.createInvite(…, personId?)
  - ApiDataProvider
- UI: src/components/tree/InvitePanel.tsx (384px right drawer: eyebrow/heading, note, 3 steps —
  who-you-picked confirmation / email / role radio [May read · May write, write default] — heritage
  message preview [a8], Cancel/Send-the-invitation disabled until a valid email); Members page (per-row
  keeper Invite pill on account-less non-deceased rows [a4], Invited chip via personId match, opens the
  panel, retires the bottom invite form); globals.css .records-invite + .invite-panel/-heading/-note/
  -step/-who/-roles/-role-card/-preview
  tests: tests/e2e/members.spec.ts — 5 invite (a4 pill only on account-less; edge e2 never on the
  deceased [death event via pg]; panel opens in place with the person fixed + steps + Send-disabled
  validation; sending ties the invite to the person in the DB + the row then reads Invited). Vitest 155
  (mappers/PersonRepository updated for version+updatedAt+person_id). All verified in small batches; the
  full 5-test describe flakes on the dev server (Q14), each passes clean alone.
  decisions:
- Invites are now person-tied (Spec 06: fired from a row, invitee lands on their own branch). person_id
  nullable for the legacy email-only path. The Invited chip matches invites to rows by personId.
- Pronouns in the panel derive from person.sex (he/she/his/her), never hard-coded (a10). Two role
  cards (repo viewer/editor = read/write); the "branch only" 3rd scope stays unmodelled (Q12).
- Send writes the invite row THEN emails; the outbound email is env-gated (RESEND_FROM_EMAIL), so a
  test env still creates the row — the test asserts the DB write + the Invited chip, not the email.
  deviations / interim: Resend/Revoke move to the record panel (edge e6) — not built here; the bottom
  form (with its revoke) is gone, so revoke has no UI until that lands (note for M-D/later). Add-person
  panel + duplicate guard = M-C; in-place inspector on the Members route = M-D.

### Wave 3 Members M-D — inspector hosted in place (a1/a2) — DONE

spec: `_SPEC-06.md` — every row opens the shared Spec 07 inspector in place, no route change; a1/a2
files: src/components/tree/RecordInspectorDock.tsx (NEW — the one wiring for the shared inspector:
per-record patch save + toast/undo, keeper role change, remove-access; `inline` for the canvas,
`drawer` for a fixed right dock); src/components/Tree.tsx (refactored to render the dock — its ~70
lines of inline inspector wiring + savingRecord/savingRole/membershipByPerson moved into the dock,
behaviour identical); src/app/tree/[id]/members/page.tsx (row is now a role="button" that opens the
dock in place — no navigation; table narrows via .inspector-open); globals.css (.record-dock fixed
drawer + .records-page.inspector-open padding)
tests: record-panel 18/18 + record-conflict 2/2 (the Tree refactor is regression-free — same panel,
same save/conflict/undo); members.spec.ts a1 rewritten to "opens in place, no route change (a1/a2)"
— list 5/5; invite + a8 still green. Vitest 155.
decisions:

- a1's "one panel" is now literal: RecordInspectorDock owns the single wiring, TreeInspector is the
  single component, and both the canvas and the Members list drive it. The only difference is
  placement — a fixed right drawer on pages without an inspector column.
- Members rows became role="button" (Enter/Space + click) rather than links, so opening a record
  never changes the route (a2). The Invite pill stops propagation so it doesn't also open the record.
- No behaviour change to the canvas: Tree passes the same values it used to compute inline.
  deviations: the drawer overlays rather than reflowing into a true flex column; the list gives up its
  right padding when open (spec "narrows to 824px") — close enough without a shell-layout refactor.
  Revoke/Resend still owe a home in the panel (edge e6, from M-B). Add-person + duplicate guard = M-C.

### Wave 3 Members M-C — add-person panel + duplicate guard — DONE

spec: `_SPEC-06.md` — add panel (relationship-first), duplicate guard; a5/a6/a7/a8
files: src/lib/addPerson.ts (NEW, pure: findDuplicate, personIdFromName, wireRelationship, placePerson);
src/components/tree/AddPersonPanel.tsx (drawer: 1 where-they-belong [5 relationship chips + anchor
picker] · 2 name · 3 sex/born/living · "This will change" preview [a8]); src/components/tree/
DuplicateGuard.tsx (existing vs typed, Connect / add-anyway / Back); src/app/tree/[id]/members/page.tsx
(+ Add person opens the panel; handleAdd → findDuplicate → guard-or-write; connect/add-anyway via
saveTreeData); globals.css (.add-panel, .rel-chip*, .add-field/-preview, .dialog--wide, .dup-*)
tests: tests/lib/addPerson.test.ts — 15 (findDuplicate; personIdFromName uniqueness; every
relationship — child/sibling/spouse/parent — both join-existing and create-new; none/no-anchor
no-op; placePerson connect-vs-add). tests/e2e/members.spec.ts +3 (a6 guard opens before any write +
Back writes nothing; a7 connect reuses the record, no duplicate row; add-new creates + wires into the
household). Vitest 170; add e2e 3/3 with pg snapshot/restore of people+families.
decisions:

- The family wiring (riskiest write) is a pure, exhaustively-tested function: each relationship joins
  an existing household where a slot fits, else creates the single household it implies. UI just calls
  placePerson + saveTreeData (bulk is right for a structural multi-row add; per-record patch is for edits).
- a6: findDuplicate (official name + aliases, case-insensitive) always runs before a write; a match
  opens the guard. a7: "Connect" reuses the existing Person id (no new row) so their facts travel;
  "add anyway" writes a second person (outlined, not quiet-red — a legitimate choice, edge e4).
  deviations:
- Single "Name" field (official_name), not the spec's देवनागरी+Latin two-script with live
  transliteration — the repo Person has official_name + aliases and no transliteration service.
- "Living" toggle records a bare death event when off (the repo has no living flag; keeps the Members
  deceased/Invite logic consistent). Anchor is a <select>, not the pre-chosen household card + Change.
- Same-sex couples are limited by the husband/wife Family model (a spouse of the same sex would
  overwrite the slot) — a data-model question, unchanged here. "+ Add person" no longer routes to the
  legacy /people editor.

### Wave 3 Members M-E — acceptance sweep a1–a10 — DONE

spec: `_SPEC-06.md` acceptance a1..a10
Coverage (repo owner/editor/viewer = keeper/write/read):

- a1 one list + opens in place + search surface — TESTED (list column set; row opens the inspector
  in place, no route change; ⌘K search opens the same panel [Wave 2E]).
- a2 May renders for every role, interactive only for a keeper — keeper side TESTED (Invite pill +
  the panel's role radio). The non-keeper VIEW e2e is written + `test.fixme` (blocked by Q15); the
  gating logic is unit-tested (authz/access).
- a3 no role written from the table — TESTED (no inline <select>; roles change only in the panel).
- a4 Invite only on account-less, never the deceased — TESTED (+ edge e2 via a death event).
- a5 reader sees "Ask a keeper to add someone" — writer/keeper "+ Add person" TESTED; the reader
  e2e is `test.fixme` (Q15); gating unit-tested.
- a6 existing name opens the duplicate guard before any write — TESTED.
- a7 connecting an existing person reuses their record (facts preserved) — TESTED + unit-tested.
- a8 removing access never deletes the person — TESTED (person survives; membership gone).
- a9 search matches name/alias, order never changes — TESTED.
- a10 generation then birth order, never alphabetical — TESTED.
  files: tests/e2e/members.spec.ts (list 5 · invite 5 · add 3 · a8 1 — a8 beforeAll now self-heals a
  removed membership via the WRITER fixture); tests/e2e/members-roles.spec.ts (a2/a5 non-keeper,
  test.fixme pending Q15); tests/e2e/fixtures.ts (WRITER fixture — designreview3, bcrypt password set
  via pgcrypto). Vitest 170 (incl. addPerson 15).
  decisions: all keeper-side acceptances are e2e-green in isolation/batches; the full 14-test members
  run flakes on the Next dev server under load (Q14 — verified harmless earlier via a prod-build run).
  deviations: a2/a5 non-keeper VIEW e2e deferred to Q15 (member deep-link to another owner's tree sits
  on Loading — a cross-user boot issue, not a Members bug); their gating is unit-tested.

**WAVE 3 MEMBERS (Spec 06) COMPLETE** — one sorted list (A) · row-fired invite panel (B) · add-person

- duplicate guard (C) · shared inspector hosted in place (D) · acceptance sweep (E). Remaining Wave 3:
  Spec 05 Tree canvas + Spec 08 Households.

---

## WAVE 3 — Tree canvas (Spec 05) — plan + receipts

Spec 05 distilled at `design-specs/_SPEC-05.md` (10 acceptances; 6 major divergences from the current
D3+React canvas). Sub-units: T-A geometry · T-B node redesign (couple pill, lineage ring, labels,
hover/open) · T-C orthogonal links · T-D centering + zoom clamp/Fit/LOD · T-E navigation layer
(generation rail + keyboard a7, legend, attention filter a8, controls) · T-F acceptance a1–a10.

### Wave 3 Tree T-A — geometry / generation rhythm — DONE

spec: `_SPEC-05.md` a6/g6 — rows at 24 + n × 222
files: src/constants (TREE_CONFIG NODE_HEIGHT 240→222, + GEN_TOP 24); src/components/tree/
useTreeLayout.ts (extracted pure computeTreeLayout — offsets every node.y by GEN_TOP so generations
land at 24 / 246 / 468 / 690)
tests: tests/components/tree/useTreeLayout.test.ts — 2 (generation pitch = 24 + n×222; siblings share
a row, spread horizontally). record-panel read-mode 6/6 still green (canvas navigation unaffected).
decisions: kept d3.tree nodeSize for the horizontal packing; the fixed generation pitch (a6) is the
height + a whole-tree +24 shift, both pure + unit-tested. Node dimensions (couple 170×90, single 90px,
portrait 58/ring 3px) were already in TREE_CONFIG from earlier work — T-B renders them to spec.
deviations: links still bezier (T-C), centering still on root not the viewer's household (T-D), no nav
layer yet (T-E). Node visuals (ring colour by lineageSide, label offset, "· you", hover-no-scale) = T-B.

### Wave 3 Tree T-C — orthogonal lineage links — DONE

spec: `_SPEC-05.md` g7 / a1 — orthogonal, never bezier; children connect to the pill centre
files: src/components/tree/orthogonalLink.ts (NEW pure generator: drop 40 from the parent centre →
across → down, 6px quadratic arc corners; straight vertical when in-column); useTreeLayout.linkPath
now uses it (dropped d3.linkVertical bezier); TreeLink comment; globals.css .link → stroke
var(--line-control) #d8cdb4 1.5px, round joins
tests: tests/components/tree/orthogonalLink.test.ts — 4 (no cubic-bezier command; starts at parent
centre + ends at child; vertical→horizontal→vertical with two arc corners at the bus; straight
vertical in-column). record-panel canvas 6/6 still green.
decisions: corners use a small quadratic (Q) rounding — reads as the spec's "6px arc corner" and is
not the forbidden sweeping cubic (the test asserts no `C`). The parent endpoint is the pill centre
(a1); the node drawn on top covers the join.
deviations: node visuals (ring colour, labels, hover) = T-B; centering/zoom = T-D; nav layer = T-E.

### Wave 3 Tree T-B — node redesign (ring / labels / you / hover) — DONE

spec: `_SPEC-05.md` a2/a3 + c1 states + "you" node
files: src/components/tree/PersonNode.tsx (name + birth-year label in a 78px column; "· you" year
line; single-name 13.5px); PartnerNode.tsx (ring = born-in via `born` set; right label +26px a2;
isSelf per partner; dropped dead `depth`); PersonAvatar.tsx (ring circle gets .person-ring);
Tree.tsx (compute `bornInLine` once, pass `born` + viewerUid to nodes); globals.css (hover/open touch
the pill BORDER only — no scale/lift c1-s2; .node-year + .node-year--you red; .node-label--single)
tests: tests/e2e/tree-canvas.spec.ts — 3 (ring red born-in / marigold married-in a3; "· you" marker in
red; right-hand couple label offset +26 a2). record-panel canvas 5/5 still green.
decisions:

- Ring meaning (a3) is unified through `bornInLine(people, families)` — the SAME set the Members ring
  uses — so every node (single or partner) rings red when born into the line, marigold when married in.
  Replaces the old `depth`-based guess (which mis-ringed the root couple).
- Removed the 1.1× hover portrait scale (spec c1-s2 forbids scale/lift); hover + open now only change
  the household pill's border colour (+ a red shadow when open), via `.partner-group:has(.node.selected)`
  for couples and `.node` for singles.
- The "· you" marker lives on the node's year line in red (#b22222) per Spec 05 c1-s4 — distinct from
  the chrome banner's leaf-green "you" avatar (a different surface).
  deviations: centering-on-you + zoom clamp/Fit/LOD = T-D; generation rail + legend + attention filter +
  controls = T-E. Couple pill still a rounded rect (the mock's stadium 999px was superseded by g-table 26px).

### Wave 3 Tree T-D — centering, zoom clamp, Fit, LOD — DONE

spec: `_SPEC-05.md` a4/a9/f7/g8
files: src/constants (TREE_CONFIG.ZOOM — MIN 0.35 / MAX 2.4 / STEP 1.25 / FIT_PAD 40 / LOD 0.6,0.45);
src/components/tree/useTreeZoom.ts (rewrite: scaleExtent 0.35–2.4; first-data frames the viewer's
own household at 1× via `initialCenter`; on-zoom sets .lod-name-only/.lod-no-labels on the svg;
exposes fitToView + zoomBy for the controls); src/components/Tree.tsx (compute the viewer's household
centre → initialCenter, falling back to root); globals.css (.tree-canvas.lod-\* hide year/all labels)
tests: tree-canvas 3 + record-panel read-mode 5 still green (open/pan unaffected). Zoom internals
(transforms) aren't e2e-asserted — d3-zoom transforms are flaky to pin in-browser; correct by construction.
decisions: framing centres the viewer's OWN household at 1× (a4), not the tree root; clamp is exactly
0.35–2.4× (a9); labels drop to name-only below 0.6× and vanish below 0.45× (f7) via a class the zoom
handler toggles. fitToView/zoomBy are ready for the T-E controls (the Fit button + −/+).
deviations: the Fit BUTTON, −/+ controls, generation rail + keyboard, legend, attention filter are the
navigation layer (T-E). Centering assumes the viewer has a linked person; else it frames the root.
