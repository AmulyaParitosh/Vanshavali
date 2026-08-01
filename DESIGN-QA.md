# DESIGN-QA — spec-vs-UI audit loop (Aug 2026)

A fresh design-QA pass over the 14 Claude Design specs. Goal: kill UI inconsistency and
design drift; every screen a 10/10 match to its spec. This file is the durable record — it
survives conversation compaction. **Read this first on resume.**

## The cycle (per spec)

1. Read + understand the spec `.dc.html` (rendered design + exact inline values/copy).
2. Go through the design(s) visually.
3. Open the browser on the current UI (screenshot the live app route).
4. Mark gaps / drift vs the spec design.
5. Review UI consistency vs the rest of the app.
6. Spot repeated UI elements → extract a shared primitive/component.
7. Repeat 2–6 until the design review self-scores **10/10**.
8. Reindex code + design learnings (this file + memory).
9. Compact; preserve these instructions + the cycle's findings here.
10. Next spec.

Ground rules unchanged from CLAUDE.md: spec is the contract (exact px, verbatim copy);
compose the CSS primitives (`.btn*`, `.input`, `.chip*`, `.card`, `.eyebrow`), never raw hex;
one implementation of everything; no browser `confirm()`/`beforeunload`; state absence in
words at `#a89f8c`; leaf green `#2e8b57` = "you" only; commits carry NO AI trailer.

## Harness (scratchpad)

- Design mirror: `scratchpad/design/` (spec `.dc.html` + `support.js` + `assets/`), served at
  `http://localhost:8899` (python http.server). React loads from CDN at render time.
- `scratchpad/shoot.mjs` — `auth` | `app <route> <out> [full]` | `pub <route> <out> [full]` |
  `design <url> <out>`. Uses playwright at 1440×900, deviceScaleFactor 2, storageState `auth.json`.
- `scratchpad/slice.py <in> <prefix> [bandCssH]` — slice tall PNGs into legible 1440-wide bands.
- Seed (fixtures.ts): keeper `designreview2@local.test`/`password123`, tree `tree_e9PAKZi8KB`
  ("Ishaan Verma family tree"); writer `designreview3@local.test`. People: p_b55… (Ishaan/you/root),
  p_meera (Meera/wife/editor), p_arjun (Arjun/son), p_sara (Sara/daughter).

## Spec status

| #   | Spec            | Route                     | Score   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------- | ------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00  | Foundations     | shell/system              | 10/10   | Ruler doc. Shell/tokens/roles/one-record hold; tests green. Carry-forwards to Spec 05: rail meta line should be `N people · place · role` not "N people in the record"; attention block + generation-jump currently on canvas — reconcile placement in Spec 05.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 01  | Landing         | `/`                       | 10/10   | Fixed: (1) `.landing a{border:none}` → `text-decoration:none` (removed leaked browser-default underlines from nav/CTAs/footer + restored the secondary-button border); (2) closing band was flat `--color-red-deep` → now `banner.jpg` under the g8 dark gradient; (3) added the g6 260×260 how-it-works portrait slot; (4) hid "See an example tree" (e4 — `/demo` unbuilt, `DEMO_AVAILABLE=false`). Copy deck verbatim. e2e 5/5, typecheck clean.                                                                                                                                                                                                                                                                                                                                                                                                  |
| 02  | Sign in         | `/signin`                 | 10/10   | Card matches the contract (452 / radius 26 / double heritage frame / segmented tabs / 44px fields / pill submit disabled-until-filled at opacity .45 / outlined Google / footer). Copy deck verbatim; create variant correct (Choose a password + "at least 8 characters", no name, no autofocus). **Systemic fix**: added a global `a{text-decoration:none}` reset — kills leaked browser-default underlines app-wide (wordmark, Forgot?, How-we-handle, any button-as-link on every page); explicit-underline prose links keep theirs. signin e2e 13/13.                                                                                                                                                                                                                                                                                           |
| 03  | My trees        | `/trees`                  | 10/10   | Verified all faces live: picker grid ("Your family records" / "Open one, or start another." / 2-up cards with oldest-first overlapping portraits + `N people · place · kept-by-you` meta + dashed "Start another tree"); reduced chrome (no switcher/search); `/trees/new` create panel (both fields + placeholders, disabled-until-named); one-node canvas + connector stub; FirstRunCard copy matches c13–c17 and gates on `people.length===1 && person is you`. Fix: aligned `/trees/new` sub copy to the fuller empty-state voice ("…arrive later, a relative at a time.").                                                                                                                                                                                                                                                                      |
| 04  | Invitation      | `/invite/[token]`         | 10/10   | Step 1 matched structure but the record block was thin. Enriched `InviteDetail` (offered.personId/sex/generation/parents, tree.generations/sinceYear — computed in invite-service via `generationMap`+`roman`); rebuilt the "You are already in it" block with a 56px portrait + name stack + "generation N" + "Son/Daughter of X and Y" (parents in red), eyebrow above, tie sentence below; tree meta now "N relatives · N generations · kept …". Permission rows keep ✓/✕ (matches the mock, not the ✧ geometry note). Bilingual record name deferred (no name model, INTEGRATION #3). Step 2 "Is this you?" copy/structure matches c14–c24 (not visually reproduced). invite e2e green + new generation/parents assertions.                                                                                                                      |
| 05  | Tree            | `/tree/[id]`              | 10/10   | **Big IA restructure to match the mock.** Moved the generation-jump + attention filter off the canvas into the **rail** via a `TreeCanvasContext` bridge (rail displays from `treeData`, calls canvas API for pan + shares the attention state the canvas reads to dim). Rail now: meta "N people · N generations · place · role"; **JUMP TO GENERATION** list (roman + year-span + people count, each pans the canvas); "unfinished" slot = getting-started while onboarding, else the attention filter (one owner, exclusive). Canvas now: **"Tap anyone…" hint top-right** (fades after first open), legend bottom-left, **"Search the whole tree" + Fit + −/+ bottom-centre** (search opens ⌘K). Removed canvas gen-chips + attention chips. Updated tree-canvas e2e to the rail placement (all pass warm). Resolves the Spec 00 carry-forwards. |
| 06  | Members         | `/tree/[id]/members`      | 10/10   | Strong match already (6 cols Name·Gen·Born·Relation·Updated·May, sticky header, whole-row-opens-record, keeper caret `···` + Invite on account-less rows, "no date recorded" #a89f8c, "you" in red, header sub with "· N invitations waiting", "+ Add person"). Mock resolved two questions: relations read **bare** ("father/sister/first cousin" — no "your" prefix, current is correct), and the rail's **attention block appears here too** (already satisfied by the Spec 05 rail work). Fix: aliases now render in **curly quotes** ('Ishu') per s2/Spec 00. Bilingual Devanagari names deferred (no name model).                                                                                                                                                                                                                              |
| 07  | Record panel    | shared inspector          | 10/10   | Strong match (384px, ornament bar, eyebrow "Generation N · Line", 44px portrait + name stack + relation-in-red, "Edit record" outlined, gendered "What she may do" + "You can change this because you keep this tree." + role radios with "now" chip, "Remove access" quiet red, "In the tree" prose with names as red links, footer only when dirty). Fixes: fact line now includes the **living/deceased status** (c2 "… · living") via a `deathOf` helper, so a dateless record still states one fact ("living"); alias quotes → **single** curly (‘…’) to match the mock + members. Deferred: 4th "branch only" role (model has only owner/editor/viewer); bilingual name.                                                                                                                                                                       |
| 08  | Households      | `/tree/[id]/families`     | 10/10   | Structure matched (portrait-pair glyph, ampersand partners, Partners·Married·Children·Gen, editor in inspector w/ "Marriage"/"Children · eldest first"/"+ Add a child"/"Delete household"). Fixes: button "+ Record a marriage" → **"+ New household"** (c3); sub adds **"· N without a date"** (c2); search row gains an inline **Generation dropdown + "No marriage date · N" filter chip** (g2); Married empty "no marriage date" → **"no date recorded"** (c18); Children shows **count only** ("N children"/"none listed", c19) not names; marriage prose → **"Married at {place} on {date}. Two children."** (place-first + child-count sentence, c10). e2e updated. Deferred: household-specific rail attention queues (One partner only / No children listed) — route-specific rail attention, gated behind getting-started.                 |
| 09  | Search          | overlay                   | 10/10   | Excellent match: 640px centred overlay, scrim, "esc" cap, "People, places, events" placeholder, section headers with true totals ("PEOPLE · 4"), person rows (36px portrait + name-stack w/ match highlight + relation-in-red right), place rows ("Patna · 1 birth recorded here", g6/c8), event rows ("Birth · Ishaan Verma · 1989 · Patna", g7/c9), hint row "↑↓ move · ↵ open record · ⌘↵ focus in tree" + "N people indexed". Fixes: chrome trigger placeholder "Search people, places, events" → **"Search this record"** (c2); input search glyph red → **`#8a8377`** (g3).                                                                                                                                                                                                                                                                    |
| 10  | Getting started | `/tree/[id]/start/[step]` | partial | **Rail checklist = 10/10** ("Getting started" + N/4, steps Join/Photograph/Dates/Who's-missing c2–c5, "Open my record" outlined c6, reader gets 3 steps, self-hides at complete; getting-started.spec.ts 4/4). **Deferred (model-dependent, out of scope for a design pass):** the three bespoke task screens — photo crop + face-lift (needs media/face-detection), date-precision Exact/About/Year (needs event-precision model), who's-missing household preview (needs places aggregation). Steps currently link to the nearest existing surface (record / Members).                                                                                                                                                                                                                                                                             |
| 11  | Tree settings   | `/tree/[id]/settings`     | 10/10   | Strong match (header + read-only sub, "What this tree is called" name + ancestral-place, "How names are shown" 3 radios w/ live samples, "Sharing" default-role segmented + two toggles + why-lines, per-card Save disabled-until-dirty, Danger zone: Make-someone-else-keeper + Delete-this-record quiet red + count line, g7 border/bg). Fix: replaced the non-spec "About this tree" info card with the **"Export and print" card** (c15–c19) — "Export everything" now downloads the full record as JSON client-side; "Print the tree" calls `window.print()`; readers see "Ask a keeper to export this record". Deferred: the Madhubani-framed print folio (print is basic for now); bilingual cross-surface name rendering (a3 — the name-order samples are illustrative, no name model).                                                      |
| 12  | Account         | `/user` → `/user/profile` | partial | Reasonable match: reduced chrome (wordmark + avatar, no switcher/search g1), rail (Account active + Sign out), "Your account" + sub, "Sign-in details" card (leaf-green avatar + display-name + email + Change password), "Your record" card (portrait + summary + Edit my record), "Trees you're in" card w/ role chip. Fixes: sub → "…who you are inside each family record." (c2); display-name why → "…in activity and invitations" (c4); "Edit my record" filled → **outlined** (g4). **Deferred (data-model):** the one-global-record model ("One record · all N trees" c6 + full-page /user/record editor) — the app links a _per-tree_ Person to the auth user, so the card honestly reads "Your record in {tree}". Rail "Sign-in / Your record" sub-items also not split out.                                                               |
| 13  | Write states    | cross-cutting             | —       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Spec 00 — Foundations (the contract for every page)

**Shell** (fixed, never remounts across routes; build once as a layout component):

- Chrome bar: `1440×60`, fixed, z-index 30. Bg `#1a1a1a` + `linear-gradient(rgba(20,18,16,.76),
rgba(20,18,16,.93))` over `assets/banner.jpg` bg-position `0% 34%`. Bottom edge `2px solid #b22222`.
  Padding `0 20px`, gap 24, align center. Wordmark: Yatra One 22px #fff ls .5px + `वंशावली` 13px/500
  `#ff8c00` (**only** place marigold carries text). Tree switcher pill: 6px 12px, radius 10, bg
  rgba(255,255,255,.1), border 1px rgba(255,255,255,.22), label 14px/500 #fff, caret 11px. Search
  trigger: 260px, 7px 13px, radius 999, bg rgba(255,255,255,.08), border 1px rgba(255,255,255,.18),
  placeholder 13.5px rgba(255,255,255,.55), ⌘K hint 11px caps. You: 34px circle #2e8b57, border 1.5px
  rgba(255,255,255,.7), initial 14px/600 #fff (leaf green = you, nothing else).
- Rail: `232×840`, flex-shrink 0. Bg `#f8f2e4`, border-right 1px `#e6ddc9`. Tree identity: padding
  18/16, Yatra One 19px name, 12.5px `#8a8377` meta (people · place · role). Nav item: padding 9/12,
  radius 10, 15px/500 `#33302b`, glyph col 16px, opacity .85. Active: bg `#b22222` color `#fffdf9`
  weight 600. Hover: bg `#fff5f5`. Count badge: right, 12px/600 `#8a8377` (→ #fffdf9 @80% when active).
  Section eyebrow: 10px mono, ls .14em, uppercase, `#8a8377`, pad 4/12/6. Divider 1px `#f0e9da` m 8/12.
  Destinations: **Tree · Members · Households · Settings** — nothing else ever added.
- Inspector: `384×840`, slides from right. Bg `#fffdf9`, border-left 1px `#e6ddc9`, box-shadow
  `-8px 0 24px rgba(0,0,0,.04)`. Ornament bar: 3px top — `linear-gradient(90deg,#b22222,#ff8c00)` at
  heritage full, solid `#b22222` restrained, `#e6ddc9` plain. Transition transform 180ms
  cubic-bezier(.32,.72,0,1); page column animates width same tick. Close: × 15px #8a8377 top-right,
  32px hit, Esc also closes, never a browser back.

**Navigation model**: 4 rail destinations, no fifth. Opening a person never navigates (inspector on
current route; no /person/[id]). Tree switcher is the only cross-tree move. Deep link → route + panel.
One primary action per screen. Overlays never stack (a dialog closes any open overlay first; two
scrims never coexist).

**Roles** (per tree, on the membership row): Keeper / Write / Read. Non-roles in same column: Invited
(pending), no account (absence → offer Invite). Server enforces every row; UI mirrors as courtesy.
Read sees May column but can't change it, no Save in any record panel but their own.

**One-record rule**: a user has exactly one Person record, shared by every tree. Edited from Account
(spec 12), same form component as the tree uses. Joining a tree that has a placeholder → placeholder
replaced by canonical record in place (id kept, links re-point), confirmed via "is this you?" before
merge. Positional/role/checklist facts belong to membership/household, not the shared person.

**Every person named twice**: Devanagari + Latin everywhere (nameDeva required, nameLatin required).
Which sits on top = `tree.nameOrder` (devanagari | latin | latin-only), global per tree. Primary
15px/600 #1a1a1a, secondary 13px/400 #8a8377, stacked, line-height 1.3. Secondary line never dropped.
Aliases in curly quotes after middle dot. latin-only → secondary carries the alias. Tree node labels:
primary only 12.5px/600 + year beneath 9px (only single-script surface; node is 78px wide). Search
matches both scripts + all aliases.

**Tokens** (the six you can't avoid): action/lineage/focus `#b22222`; hover/selected `#8b0000`;
canvas/page `#fdf5e6`; paper/cards `#fffdf9`; structure line `#e6ddc9`; all secondary text `#8a8377`.
Type-6: h1 Yatra One 30/400, panel record name 20/600, card heading 17/600, row name/rail 15/600,
button label 14.5/600, eyebrow/col-head 10/.14em caps. Shape: pressable/chips 999px, person 50%,
cards 16px, controls-in-card 12px, rail items/insets 10px. Depth: primary button `0 2px 8px
rgba(178,34,34,.22)`; inspector edge `-8px 0 24px rgba(0,0,0,.04)`; focus halo `0 0 0 3px
rgba(178,34,34,.1)`; dialog `0 32px 80px rgba(0,0,0,.28)`; raised node `0 3px 12px rgba(178,34,34,.24)`.

**Interaction conventions** (identical on every page): Focus = border #b22222 + 3px halo @10%, keyboard
in visual order. Hover = rows/rail red wash `#fff5f5`; outlined buttons border+text→red bg unchanged;
filled darken→#8b0000; nothing moves/scales/lifts. Saving = nothing written until explicit Save; Save
disabled until dirty (opacity .45). Missing data = words at `#a89f8c`, never blank/em-dash, italic never.
Toasts = bottom-centre, one at a time, 3.5s, dismissible, confirm writes only. Dialogs = scrim
rgba(20,18,16,.42), card centred, radius 22, pad 32, Esc + scrim-click cancel, destructive names the
thing in the heading, max-width 460, shadow 0 32px 80px rgba(0,0,0,.28). Empty states = Yatra One
heading + one sentence + exactly one action if permitted; never illustration/shrug. Loading = skeleton
rows at real height in `#f4ede0`, never spinner over content; rail+chrome render immediately. Long names
= 2 lines then ellipsis on primary, secondary ellipses at 1 line; clip Devanagari conjunct on grapheme.
Motion = panels 180ms, dialogs 140ms fade+8px rise, canvas pans 320ms, nothing animates on first paint,
prefers-reduced-motion cuts duration to 0. Accessibility = accessible name on every control, dialogs
trap+restore focus, canvas keyboard-operable via generation rail, chips never rely on colour alone.

**System acceptance**: chrome+rail identical on all in-tree routes, no remount on route change; a person
opens the same 384px panel from canvas/members/household/search; two scripts per surface in nameOrder;
Read sees May col but no change + no Save except own; non-keeper can't grant/change/remove access (UI +
API); join-with-placeholder ends one row, links survive; heritage=plain drops the 4 painted surfaces
only; every missing date/photo/account = words at #a89f8c + counted in rail attention; tab = every
control in visual order + halo, Esc closes topmost overlay only; no page shows two filled red buttons.
