# The Vanshavali System

This document is the **single source of truth** for Vanshavali's visual identity. It is the codebase mirror of the Claude Design style guide ("Vanshavali Style Guide"). Every value here was measured out of the built screens, not invented for the guide.

The tokens live in `:root` in `src/app/globals.css`; this document explains what each one is _for_. When code and this document disagree, this document wins — fix the code.

**The one idea to hold onto:** the heritage lives on **four surfaces** — the chrome banner, the portrait ring, a 3px bar at the top of the inspector, and a paper wash under everything — so that everything else can stay quiet and readable. Ornament is a setting, not a decision (see §04).

> **Redesign status (July 2026).** The design system foundation (tokens + primitives + this doc) is in place. Screens are being rebuilt on it one at a time; until a screen is rebuilt it runs on legacy CSS re-pointed to the new tokens, so it already carries the new palette/type but not yet the new layout. Legacy token aliases in `globals.css` are retired as each screen lands.

---

## 00 · How to use this system

1. **Tokens only** in component CSS — no raw hex, no magic px. If a value has no token, it needs a _job_ before it gets one.
2. **Compose the primitives**, don't re-invent them: `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-quiet` / `.btn-danger`, `.input`, `.chip` (`--keeper`/`--write`/`--read`/`--invited`), `.card`, `.eyebrow`.
3. **One primary action per screen.** Everything else is outlined or quiet.
4. Styling is one global stylesheet (`src/app/globals.css`). No CSS-in-JS or CSS modules in new code (styled-jsx in a few legacy screens is retired as they're rebuilt).

---

## 01 · Colour

Four groups, and they **do not mix roles**. Brand red carries action and lineage; marigold is ornament only; the cream ramp is every surface; the warm greys are every piece of text. Nothing is a gradient except one 3px ornament bar.

### Brand (5) — `--color-*`

| Token              | Hex       | Job                                                     |
| ------------------ | --------- | ------------------------------------------------------- |
| `--color-red`      | `#b22222` | Madhubani red — every action, every lineage ring, focus |
| `--color-red-deep` | `#8b0000` | Hover / pressed; the name of a selected person          |
| `--color-red-wash` | `#fff5f5` | Selected row, hover fill, keeper chip, destructive btn  |
| `--color-marigold` | `#ff8c00` | **Ornament only** — rings, glyphs, the wordmark         |
| `--color-green`    | `#2e8b57` | Your own avatar, and nothing else                       |

### Surfaces (6) — `--surface-*`

| Token                 | Hex       | Job                                            |
| --------------------- | --------- | ---------------------------------------------- |
| `--surface-desk`      | `#e6e0d2` | Behind the frames — never inside the product   |
| `--surface-canvas`    | `#fdf5e6` | The page under the tree and every content area |
| `--surface-paper`     | `#fffdf9` | Cards, rail, inspector, controls at rest       |
| `--surface-tablehead` | `#f8f2e4` | Column headers and quiet inset panels          |
| `--surface-quiet`     | `#f4ede0` | Read-access chip, disabled swatch, dividers    |
| `--surface-chrome`    | `#1a1a1a` | The top bar, under the banner gradient         |

### Lines (4) — `--line-*`

`--line-structure` `#e6ddc9` (card/rail/inspector edge) · `--line-control` `#d8cdb4` (button & input borders at rest) · `--line-inner` `#f0e9da` (dividers inside a card) · `--line-row` `#f4ede0` (between table rows).

### Text (6) — `--text-*`

`--text-primary` `#1a1a1a` (names, headings) · `--text-rail` `#33302b` (nav at rest) · `--text-strong` `#55504a` (body prose in a card, spec values) · `--text-prose` `#6b6455` (explanatory copy) · `--text-meta` `#8a8377` (eyebrows, secondary names, counts, placeholders) · `--text-absent` `#a89f8c` (**only** for data nobody has recorded yet).

### Portrait tints (8) — `--tint-1` … `--tint-8`

`#8a5b3c #7c9bb5 #c58fa5 #6f9a7b #c9885a #96849f #5f9295 #b58f5e`. Eight muted earths, **assigned per person and never re-picked**, so the same face keeps the same colour in the tree, the table and the inspector. All sit dark enough for white initials at 15px/600.

### Two rings, two meanings

- `--ring-born` (`--color-red`) — **born into this line**; the blood thread through the tree.
- `--ring-married` (`--color-marigold`) — **married in**; the one place ornament carries meaning.

> **Marigold never carries text on a cream surface — it fails contrast.** It is a ring, a border, a glyph, or a gradient stop. The one exception is the wordmark, where marigold sits on near-black and passes.

---

## 02 · Type

Three faces with hard boundaries.

- **Yatra One** (`--font-display`) — display only, one weight (400), Devanagari roots. It **names** things and never explains them: the wordmark, the one h1 per screen, generation numerals, dialog/onboarding titles.
- **Hind** (`--font-body`, 300/400/500/600/700) — all reading work; covers Devanagari and Latin in one family, so bilingual names sit on the same line without a jump.
- **Monospace** (`--font-mono`) — reserved for labels the eye should skip, and for data.

### Ladder (named rungs)

| Token                 | px  | Where                                                  |
| --------------------- | --- | ------------------------------------------------------ |
| `--font-size-display` | 42  | Document title only (Yatra One)                        |
| `--font-size-3xl`     | 30  | The one h1 per screen (Yatra One)                      |
| `--font-size-2xl`     | 27  | Dialog / guard / onboarding heading (Yatra One)        |
| `--font-size-xl`      | 20  | The record name at the top of the inspector (Hind 600) |
| `--font-size-lg`      | 18  | Settings card titles / lead paragraph                  |
| `--font-size-base`    | 16  | Reading base; the `em` anchor                          |
| `--font-size-sm`      | 14  | Button labels, table cells, subtitles                  |
| `--font-size-xs`      | 12  | Chips, badges, dense meta                              |

The full built ladder carries 25 sizes descending 42 → 9 (name in a list row is 15/600; the second name under it is 13/400; the year under a tree node is 9). The tokens above are the rungs used often enough to name; reach for an exact ladder value inline when a rung has a single job (e.g. the 9px year line).

### Every person is named twice

One name is the record, the other is how half the family reads it. Which sits on top is a **setting, not a design decision** — the pair travels together everywhere a person appears, and the second line is **never dropped to save space**.

### Eyebrow labels — the `.eyebrow` class

Every section header, column head and context line is the same object: **10px monospace, `letter-spacing:.14em`, uppercase, `--text-meta`**. It reads as furniture, which is the point. Never sentence-case an eyebrow, never make one a link, never put a number in it that is not a count.

---

## 03 · Shape, depth, space

### Radius — scales with the object

Two overrides beat the scale wherever they apply: **anything you press is a pill** (`--radius-pill`, 999px), **anything that is a person is a circle** (`--radius-circle`, 50%). Otherwise: `--radius-26` (side panels 460–500px + the couple pill) · `--radius-22` (dialogs ≥700px) · `--radius-18` (large inset panels) · `--radius-16` (cards — the default) · `--radius-14` (small containers, thumbnails) · `--radius-12` (controls & panels in a card) · `--radius-10` (rail items, glyph tiles) · `--radius-9` (switch segments) · `--radius-8` (micro tiles) · `--radius-4` (key caps, smallest badge).

### Elevation — seven shadows, each one job

`--shadow-frame` `0 24px 64px rgba(0,0,0,.16)` · `--shadow-primary` `0 2px 8px rgba(178,34,34,.22)` · `--shadow-node` `0 3px 12px rgba(178,34,34,.24)` · `--shadow-inspector` `-8px 0 24px rgba(0,0,0,.04)` · `--shadow-focus` `0 0 0 3px rgba(178,34,34,.1)` · `--shadow-pill` `0 2px 10px rgba(0,0,0,.07)` · `--shadow-dialog` `0 32px 80px rgba(0,0,0,.28)`.

> **Red-tinted shadows belong to red objects only** — a cream card never casts a red shadow.

### Spacing — 4px base

`--space-1` … `--space-16` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64). No `padding: 13px`. If a layout demands a non-scale value, fix the layout, not the value.

### Shell metrics — fixed

Screen `1440 × 900` (desktop-first by decision). Chrome bar `--shell-chrome-h` **60px**. Rail `--shell-rail-w` **232px**. Inspector `--shell-inspector-w` **384px**. Card padding 20–24px. That constancy is what makes the rail and the inspector feel like furniture rather than content.

---

## 04 · The heritage layer

Madhubani painting is why this product looks like itself, and why it could easily become unreadable. So ornament is confined to **four surfaces** and all four answer to one setting.

**The four surfaces:** (1) the chrome banner, (2) the portrait ring, (3) a 3px bar at the top of the inspector, (4) a paper wash under everything.

**The one setting** — `data-heritage` on `<html>`, read via `--heritage-paper`:

| Level            | Paper wash          | Ring art     | Ornament bar                |
| ---------------- | ------------------- | ------------ | --------------------------- |
| `full` (default) | `.05`/`.07` on tree | painted ring | red → marigold gradient     |
| `restrained`     | `.025`/`.035`       | painted ring | solid `--color-red`         |
| `plain`          | `0`                 | none         | hairline `--line-structure` |

The chrome bar is the **one loud surface**: 60px tall, the Madhubani banner darkened under `linear-gradient(rgba(20,18,16,.76),rgba(20,18,16,.93))` at `background-position:0% 34%`, closed with a 2px red rule. Because the painting is spent there, every surface below can be plain cream and the page still reads as Mithila.

### Ornament glyphs — two, each one meaning

- `❀` (U+2740), marigold — **life event**. Marks one dated moment in a person's life.
- `✧` (U+2727), red — **detail**. Marks a recorded fact or a rule; green when it confirms.

> **No emoji, anywhere.** The original app put a `✧` on every button; here it appears only against a life event or a detail row.

---

## 05 · Controls

One filled button per screen, and it is the thing the page exists to do. Everything else is outlined or quiet. **Four buttons, no star, no lift.**

| Class                     | Role        | Spec                                                                                                                             |
| ------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `.btn-primary`            | Primary     | pill · `11/20` · `14.5/600` · red bg, white · `--shadow-primary` · hover `--color-red-deep`. **Exactly one per screen.**         |
| `.btn` / `.btn-secondary` | Outline     | pill · `10/18` · `14.5/600` · paper bg, `--text-rail`, `--line-control` border · hover border+text red. Every other real action. |
| `.btn-quiet`              | Quiet       | pill · `10/18` · `14/500` · `--text-prose`. Guidance the reader can't act on. Never the loudest thing on a page.                 |
| `.btn-danger`             | Destructive | pill · `10/18` · `14.5/600` · red text on `--color-red-wash`. **Never a filled red button** — that's the primary.                |

### Text entry — the `.input` class

One focus treatment across the whole product: border to `--color-red` **plus a 3px halo at 10% red** (`--shadow-focus`). Never a browser default outline, never a colour change alone. Search fields are pills; inspector field rows are `--radius-12`.

### Access chips — the only place permission is expressed

The `.chip` variants are the states of the "May" column. Each is a bordered pill at 12px/600, so a row can be scanned for who can do what without reading a word.

| Chip             | Means                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `.chip--keeper`  | Holds the record. Can invite, grant, and remove.                                                                                           |
| `.chip--write`   | May add and correct anyone in the tree.                                                                                                    |
| `.chip--read`    | May look, and nothing more.                                                                                                                |
| `.chip--invited` | Asked, hasn't answered yet.                                                                                                                |
| _no account_     | Nobody to grant anything to — an absence, not a state. That row offers **Invite** instead. Someone no longer living offers nothing at all. |

These map to the app's tree roles `owner`/`editor`/`viewer` (keeper/write/read) plus pending invites; use the `src/lib/access.ts` predicates, not inline string checks.

---

## 06 · Data surfaces

**The list row:** header `padding 11px 18px · bg --surface-tablehead · .eyebrow` column heads; rows `padding 10px 18px · gap 14px · border-bottom 1px --line-row`; avatar 40px circle, 2px ring, initials 12px/600 on white; fixed columns (40 · flex · 46 · 100 · 112) on every table.

**Row states:** Rest (transparent) → Hover (`--color-red-wash`) → Open (`--color-red-wash` bg, name 700 `--color-red-deep`, border `#f0dcd8`) → Focus (border `--color-red` + `--shadow-focus`).

**Missing is not empty.** A date nobody recorded reads _no date recorded_ in `--text-absent` — not a blank cell, not an em dash. The gap is the point: someone in the family can fill it, and they will only do that if they can see it.

---

## 07 · The person node

A node on the tree is a **household**, not a person.

- A couple is **one pill** with the two portraits seated on its left and right curves — they **never overlap** (two overlapping circles read as one damaged object). Couple pill: 170px wide · `--radius-26` · padding 6px · 1.5px `#e0d3b8` border · `--shadow-pill`.
- A single person is a 90px node at `--radius-circle`, same padding and border.
- Portrait: 78px art box → 58px circle with a 3px ring; initials 15/600 white.
- Each portrait gets its **own 78px label column** directly beneath it; the second label drops 26px so two names of different lengths can't collide. Label 12.5/600, year line 10px `--text-meta`.
- Children hang from the **centre of the household**, not from one parent — because that is what the data means.
- Open node: name 13/700 `--color-red-deep` + `--shadow-node`.
- Generations sit at fixed y positions, so a generation is always a straight horizontal read.

---

## 08 · Rules that are not about pixels

These decide more of how the product feels than any colour does. Each exists because breaking it produced something worse in a screen we built.

1. **Never make someone read a name twice to be sure.** Both scripts, every time, in the same order across the whole product. Doubt is what stops people contributing.
2. **The record opens in place.** Clicking a person never navigates — the inspector slides into the same 384px column whether you came from the tree, the table, or search.
3. **Show the gaps.** _no date recorded_, _no photograph_, _no account_ — stated plainly and counted in the rail. A visible gap gets filled by the one relative who knows.
4. **One primary action per screen.** If two things look equally urgent, neither is. Anything a person isn't permitted to do is quiet, never the loudest button on their page.
5. **Permission lives in one column.** The "May" column is the only place access is shown or changed. No second source of truth to disagree with it.
6. **A household is the unit, not a person.** Couples render as one pill; children hang from its centre.
7. **Ornament is a setting, not a decision.** Every painted surface answers to `--heritage-paper` / `data-heritage`, so the whole product can be turned down for a projector or a print without editing a single screen.
8. **Nothing gendered unless the record says so.** Copy names the person or says nothing. A pronoun hard-coded into a button is a bug waiting for the next record to open in that panel.

---

## Assets

Optimized in the design project; import into `public/` as each surface is rebuilt.

| File                         | Size   | Use                                                                        |
| ---------------------------- | ------ | -------------------------------------------------------------------------- |
| `assets/banner.jpg`          | 377 KB | Madhubani banner behind the chrome bar, darkened by gradient. (was 2.0 MB) |
| `assets/node_border_320.png` | 243 KB | The painted ring around every portrait — one cached request. (was 1.9 MB)  |
| `assets/paper_texture.jpg`   | 151 KB | Handmade-paper wash under every canvas at 5–7% opacity. (was 8.3 MB)       |

---

## Token quick-reference

All in `src/app/globals.css` `:root`. Legacy aliases (`--color-primary*`, `--color-neutral-*`, `--color-surface`, `--color-text*`, `--shadow-strong`, `--border-radius-*`, `--font-heading`, `--header-height`) map onto the system above and are retired screen-by-screen.

- **Colour:** `--color-red|red-deep|red-wash|marigold|green`, `--surface-*`, `--line-*`, `--text-*`, `--tint-1..8`, `--ring-born|married`, `--color-danger|success|warning`.
- **Type:** `--font-display|body|mono`, `--font-size-xs..display`, `--eyebrow-size|tracking`.
- **Shape:** `--radius-pill|circle|26|22|18|16|14|12|10|9|8|4`, `--shadow-frame|primary|node|inspector|focus|pill|dialog`.
- **Space & shell:** `--space-1..16`, `--shell-chrome-h|rail-w|inspector-w`.
- **Motion:** `--duration-fast|base|slow`, `--ease-standard|emphasis`.
- **Heritage:** `--heritage-paper`; `data-heritage="full|restrained|plain"` on `<html>`.

_Last revised: July 2026 — rewritten as the mirror of the Claude Design "Vanshavali Style Guide"._
