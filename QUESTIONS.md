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
