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

**Wave 0 — Foundations** — IN PROGRESS

- Tooling setup — Playwright adopted, progress files created. **DONE**
- Spec mirror — `design-specs/` holds fetched specs + `extract-props.mjs`; distilled cited refs
  `_FOUNDATIONS.md` (Spec 00) + `_STYLE-GUIDE.md` (full token system). **DONE** (gitignored, on-disk durable)
- Tokens / Style Guide — **DONE** (see receipt below)
- Assets — `banner.jpg` / `node_border_320.png` / `paper_texture.jpg` in `public/`; paper wash wired.
  **DONE** (see receipt; note reconstructed 2/3 — QUESTIONS Q7)
- Shell (Spec 00 §02) — prior loop built a shell; needs audit vs spec. **NEXT** (also rewire chrome
  banner → `/banner.jpg` and portrait ring → `--ornament-ring`, then remove the heavy source PNGs)
- Component library (`Vanshavali Components.dc.html`) — not started (fetch that spec next)

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
