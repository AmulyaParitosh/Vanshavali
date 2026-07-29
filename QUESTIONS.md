# QUESTIONS — spec ambiguities & conflicts

Each entry: the conflict, the reading chosen, and why. "Never let a question block progress; record
it and continue." Items needing the human are marked **NEEDS HUMAN**; resolved-by-me items are logged
for the record.

---

## Q1 — Playwright vs CLAUDE.md "No Playwright in v1" — RESOLVED (human answered)

The build prompt (§3, §10) mandates Playwright for DOM/acceptance tests and the 12 integration
contracts. `CLAUDE.md` says "Vitest + React Testing Library. No Playwright in v1", and the harness
treats CLAUDE.md as overriding.

**Human decision (this session): adopt Playwright.** Playwright drives DOM/Acceptance + the 12
integration contracts in a real browser; Vitest keeps permission/merge/logic unit tests. `CLAUDE.md`
updated to record that this branch adopts Playwright for acceptance tests. React Testing Library is
not added unless a component-level unit test genuinely needs it (Playwright covers DOM behaviour).

## Q2 — Prompt says "Drizzle"; repo uses raw SQL + `pg` — RESOLVED (self)

Ground rule §2: "Implement in the existing codebase's idiom." This repo has no ORM — data access is
raw `.sql` files run through `pg` in `src/repositories/*`, authorized in `src/services/*`. "Drizzle"
in the prompt is a generic-template inaccuracy. **Follow the repo: raw SQL + service-layer authz.**

## Q3 — Commit trailer — RESOLVED (self)

The harness default appends a `Co-Authored-By` trailer, but this branch's established hard rule (and
every commit on it) omits any AI attribution. **Follow the branch: no AI trailer.**

## Q4 — Specs are remote (DesignSync), not local files — RESOLVED (self)

The prompt says "read them as text … it is a file." In this repo the specs are not on disk; they live
in the Claude Design project `dd87d264-b5d2-4737-8e4c-9233afb2398d`, read via `DesignSync get_file`.
That is the "file read" primitive. Not mirrored to disk (get_file cannot be piped to disk without
re-emitting content). Re-fetch per unit. Mechanism recorded in `IMPLEMENTATION.md`.

## Q15 — a member deep-linking to a tree they do not OWN sits on "Loading…" — RESOLVED (fixed)

**RESOLVED (commit 7b9c287).** Root cause: `useAuthAndData`'s active-tree auto-select treated only
`myTrees.owned` as accessible. When a member deep-linked to a tree they don't own, the `[id]` layout
bound `currentTreeId` from the URL, this effect immediately reset it to the member's own tree (the URL
tree wasn't in `owned`), the layout re-bound it, and the two thrashed forever behind the loading gate.
Fix: the accessibility check now spans `owned + member`, so a member tree bound from the URL is left in
place; re-selection still fires for a genuinely gone tree (deleted / role revoked), preferring an owned
tree then any membership. Unblocked the reader-session e2e (`test.fixme` → real): members-roles a2/a5
(writer/reader views) and settings a1 (read-only cards for a non-keeper), all green through a real
cross-tree session.

## Q14 — e2e full-suite runs degrade the Next dev server (run per-suite, or against a prod build)

The canonical Playwright webServer is `npm run dev`. A single long run of the whole suite (~79
tests, 5+ min) degrades the unoptimised Next **dev** server (on-demand route compilation + GC),
producing run-to-run cascading timeouts in whatever runs in the degraded window — NOT test bugs
(every suite passes green in isolation: record-panel 17, shell 9, record-conflict 2, Vitest 155).
Confirmed by running the full suite against a **production build** (`next build` + `next start`):
77/79 pass, and the only 2 failures are `foundations.spec.ts` shadow/motion assertions that expect
**unminified** CSS (`"178, 34, 34"`, `cubic-bezier(0.32, 0.72, 0, 1)`) — prod minifies the spaces
out. So: verify units per-suite against dev; if a whole-suite green is needed, run against a prod
build and treat those 2 CSS-format assertions as dev-only. Not fixing them (they hold in the
configured dev environment). **Deferred**: pick a v1 CI e2e strategy (prod-build server + make the 2
format assertions minification-agnostic) at the hosting decision (Phase 15).

## Q13 — removeMember scope — RESOLVED (no bug)

During a8 verification, removing a member (designreview3) appeared to also drop their row from
`public.users` (had to re-insert it to restore the seed). Removing tree ACCESS must not delete the
GLOBAL user or their person record (a8 holds for the person; the profile is the concern). This is
pre-existing membership-service behaviour (the Members page uses the same removeMember). **Investigate**
when Members (Spec 06, Wave 3) is built — removeMember should delete only the tree_members row.

**RESOLVED (Members M-A investigation):** removeMember is correct — the service (`membership-service.removeMember`) only runs `sql/membership/delete.sql`, a single `delete from tree_members where tree_id=when Members (Spec 06, Wave 3) is built — removeMember should delete only the tree_members row.
 and uid=$2`. It never touches `public.users` or `people`, so the person record survives (a8) and the global account is untouched. The earlier "designreview3 missing from public.users" was a seed/transient artifact from manual DB edits, not a code path. No fix needed; the a8 destructive-removal e2e can be written directly (M-E).

## Q12 — Access "His branch only" — a 4th scope with no repo role — DEFERRED

Spec 07 access radio offers Read / Write / **His branch only** / Keeper. The repo has three roles
(viewer/editor/owner = read/write/keeper); "branch-only" (edit own household + descendants, read the
rest) is a scoped role with no model. **Render the 3 repo roles** (Read/Write/Keeper) in the keeper
radio set (sub-unit D); revisit branch-scope as a role-model addition if prioritised (Members Spec 06
owns role writes; the panel is the only write surface). Recorded so the 4th option is not silently dropped.

## Q10 — Two-script names (integration §3) vs the repo's single `official_name` — DEFERRED

Spec: every person has `nameDeva` + `nameLatin`, shown both, in `tree.nameOrder` order (integration
§3). The repo's `Person.name` is a single `official_name` (+ aliases). Satisfying §3 needs a data-model
change (add both name fields) + the person form + every display. **Deferred to a dedicated cross-cutting
unit** (like one-record); until then surfaces show `official_name` as primary and no second script.
Flagged so §3 isn't silently dropped. Best sequenced with the shared PersonForm (Wave 2/4).

## Q11 — marriage date/place on Family — RESOLVED (Households H-A)

**RESOLVED (Spec 08 H-A):** added `families.marriage_date` + `marriage_place` (nullable, migration 20260729142336) → `Family.marriage {date?, place?}` (free-form date string; precision deferred like the person date-precision). Mapper round-trips it; the household editor (H-C) reads it back as prose (a5).

Spec Household has `marriage {value, precision, place}`; the repo's `Family` has only husband/wife/
children. The record-panel prose ("Married X of Place in Year") and Households (Spec 08) need it.
**Additive migration** (add marriage fields to families) done with Households (Spec 08, Wave 3); until
then the prose reads "Married X" without place/year. (Was a deferral in the prior loop too.)

## Q9 — One-record rule: shared canonical person vs per-tree persons — RESOLVED (self, §2)

Spec 00 §06: "a user has exactly ONE person record, shared by every tree." The repo's schema is
per-tree (`people(tree_id, data, user_id)`) — a user links to one person PER tree. A true shared
canonical `persons` table is a large schema overhaul. Ground rule §2 (implement in the repo's idiom)

- the fact that §06's consequences are OBSERVABLE behaviours (integration §6 "join → one row, links
  intact"; §7 "edit own record on /user → changes in every tree") let me satisfy the rule WITHOUT the
  overhaul: keep per-tree persons, and implement one-record BEHAVIOUR at the seams —
  (a) editing your own record on `/user` **propagates** the person's own facts (name/dates/photo/
  aliases/events) to every person row that person is linked to across the user's trees;
  (b) accepting an invite **merges** — the tree's placeholder is replaced by the user's identity and
  its household/child/sibling/event links re-point, ending with one row.
  Tree-owned fields (role, positional, getting-started) never travel. **Decision: Option B (per-tree +
  propagate/merge).** Merge + propagation LOGIC is unit-tested in Wave 1 (`tests/merge.test.ts`); the
  UI seams are built with Account (Spec 12, Wave 4) and Invite (Spec 04, Wave 5).

## Q8 — Shared list row: horizontal padding + column widths differ across sources — DEFERRED to Spec 06

Style Guide rowSpecs says row padding `10px 18px` and columns `40 · flex · 46 · 100 · 112` (5);
Components §Containers says row padding `10px 32px` and columns `40 · flex · 46 · 100 · 150 · 100 · 112`
(7). Vertical rhythm agrees (row 60px, header 42px). **Kept the current `10px 18px` + existing column
widths for now** (no churn); the authoritative per-surface geometry is in the page specs — reconcile
when building **Members (Spec 06)** and **Households (Spec 08)**, which own the row's real columns.

## Q7 — Optimized assets exceed the DesignSync 256 KiB fetch cap — RESOLVED (self)

`DesignSync get_file` caps content at 256 KiB, so `assets/banner.jpg` (377 KB) and
`assets/node_border_320.png` (243 KB) come back truncated/corrupt; only `paper_texture.jpg` (151 KB)
fetches whole. The repo already carries the design team's ORIGINAL source paintings from the prior
loop, and the Style Guide's "Was X MB" notes confirm them exactly: `madhubani_banner.png` = 2.0 MB
(banner source), `node_border.png` = 1.9 MB (ring source), `canvas_background.png` = 8.3 MB (paper
source). **Resolution:** wrote the real fetched `paper_texture.jpg`; reconstructed the other two from
their confirmed sources with `sips` (banner 1024² JPEG q68 → 418 KB; node ring downscaled 2048²→320²
PNG → 236 KB) — same paintings, same optimization the design team did, sizes within ~10% of spec. Not
byte-identical to the design originals; if exact bytes matter, drop `banner.jpg` + `node_border_320.png`
into `public/` manually. The heavy source PNGs stay in `public/` until the shell + node components are
rewired off them, then they get removed.

## Q6 — Missing-data colour: #a89f8c vs #b22222 — RESOLVED (self)

Spec 00 convention c4, system-acceptance a8, and integration contract §8 all say missing data renders
as words at **`#a89f8c`**. But Spec 00's own §01 Members sample (`people[]`, L608) renders a missing
`born` at `#b22222` (`bornFg: p.born ? "#33302b" : "#b22222"`). The rule/acceptance is the authority;
the sample is illustrative. **Use `#a89f8c` for missing-data words everywhere.**

## Q5 — Routes: prompt vs current app — RESOLVED (self, provisional)

The prompt's route table uses `/signin`, `/trees`, `/tree/[id]/members`, `/tree/[id]/families`,
`/tree/[id]/start/[step]`, `/user`. The current app uses `/` (picker), `/tree/[id]/members`,
`/tree/[id]/family`, `/user/profile`, no `/signin` (login is a screen, not a route), no `/trees`.
**Reconcile toward the spec's routes** as each page unit is built (Spec 00 §Routes is the authority —
re-read it before touching routing). Individual mismatches get logged per-unit as they're resolved.
