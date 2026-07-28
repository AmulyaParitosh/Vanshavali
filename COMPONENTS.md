# COMPONENTS — the library

Generated at the end of Wave 0 from `Vanshavali Components.dc.html`, maintained after. Every
component's name, file path, props, states, and the spec it came from. A compacted agent reads this
to keep building consistently instead of re-deriving the library.

Wave 0 not yet started — this file is populated as each component in `Vanshavali Components.dc.html`
is built (one at a time, each with its states: rest, hover, focus, active, disabled, error, open).

<!-- Format per component:
### <ComponentName>
- **file**: <repo path>
- **spec**: Vanshavali Components.dc.html §<n> / Spec <nn>
- **props**: <list>
- **states**: <which of rest/hover/focus/active/disabled/error/open apply>
- **consumed by**: <specs/pages>
- **notes**: <measured values worth pinning>
-->

Built against `design-specs/Vanshavali-Components.html` (mirror of `Vanshavali Components.dc.html`).
Tests: `tests/e2e/components.spec.ts` (isolated computed-style assertions per primitive).

## Actions — button family (Components §Actions)

All in `src/app/globals.css`. The rule: exactly one filled (Primary) button per screen.

### `.btn` (base = Outline) / `.btn-primary` / `.btn-quiet` / `.btn-danger`

- **file**: src/app/globals.css
- **`.btn` (Outline)**: radius 999px · padding 10px 18px · 14.5/600 · color `#33302b` · bg `#fffdf9` · border 1px `#d8cdb4`. Hover → border+text `#b22222`, bg unchanged. Every non-primary action.
- **`.btn-primary`**: padding 11px 20px · #fff · bg `#b22222` · shadow `0 2px 8px rgba(178,34,34,.22)` · hover bg `#8b0000`. One per screen.
- **`.btn-quiet`**: padding 10px 18px · 14/500 · `#6b6455` · border 1px `#d8cdb4`. Guidance the viewer can't act on / escape hatch beside a destructive choice. A control that would fail is REPLACED by this, never disabled.
- **`.btn-danger` / `.btn-outline-danger`** (destructive pill): padding 10px 18px · 14.5/600 `#b22222` · bg `#fff5f5` · border 1px `#f0dcd8`. Never a filled red button.
- **states**: rest, hover, disabled (`:disabled`/`[aria-disabled]` → opacity .45, cursor default, pointer-events none), focus (global `:focus-visible` halo).
- **modifiers**: `.btn-block` (full width), `.btn-sm` (8px 14px / 14px).

### `.btn-danger-text` — destructive text form

- 13.5/600 `#b22222`, no border, no fill; sits far left of a footer, opposite the primary. Hover `#8b0000`.

### `.cell-btn` — the only control allowed inside a table row (keepers only)

- padding 4px 11px · 12.5/600 · `#b22222` on `#fff5f5`, border 1px `#f0dcd8`. Consumers must `stopPropagation` so the row doesn't also open.

### `.icon-close` — the one close treatment (inspector, dialogs)

- ✕ 15px `#8a8377` in a 32px hit area; hover → `#b22222` on `#fff5f5`.

### `.key-cap` — a label, never a button

- 11px mono · radius 4px · bg `#f4ede0` · border 1px `#e2d7bf` · text `#55504a`.

## Inputs (Components §Inputs)

All in `src/app/globals.css`. Focus product-wide = border `#b22222` + `0 0 0 3px rgba(178,34,34,.1)`.
Validation on blur/submit, never keystroke. Shape signals intent: pill = filter, rectangle = write.

- **`.input`** — data field: radius 12 · padding 11/14 · 15.5px · bg `#fffdf9` · border 1px `#d8cdb4`;
  focus red border + halo; `.is-error`/`[aria-invalid]` → red border.
- **`.field-label`** — 12.5/600 `#55504a`, 6px above the field.
- **`.field-error`** — 12.5px `#8b0000`, 6px below the field.
- **`.suggested`** — 10.5/600 `#8a8377`; marks a guessed value; the consumer removes it on first edit.
- **`.search-pill`** (wrapper + `input`) — radius 999 · padding 9/13 · 14px · leading glyph `#8a8377`;
  `:focus-within` red border + halo. Typing filters.
- **`.segmented`** + **`.segmented-option`** (`.selected`/`[aria-selected]`) — track `#f8f2e4`/`#e6ddc9`
  radius 12 pad 3; segment radius 9 pad 7, unselected 14/500 `#8a8377`, selected raised `#fffdf9` +
  border `#d8cdb4` + 600. 2–3 short options.
- **`.toggle`** (`.on`/`[aria-checked]`) — 40×22, 18px knob; off `#d8cdb4`, on `#b22222`. One boolean.
- **`.radio-row`** (`.selected`/`[aria-checked]`) + **`.radio-dot`** + **`.radio-now`** — 4+ options with
  a consequence line; 16px circle / 8px dot; selected wash `#fff5f5` + border `#f0dcd8`; stored value
  tagged `.radio-now` (10.5 mono on `#f4ede0`).
- **`.aliases-input-container .alias-tag`** — alias chip: neutral pill `#f8f2e4` / border `#e6ddc9` /
  13.5px, removable (✕ 11px `#8a8377`). Canonical alias chip.
- _Deferred to page waves_: place-suggestion row (`#fff5f5` selected, reason 12.5 `#8a8377`, "new" tag
  on `#fdf1e2`/`#8a5300`) — built with Search/onboarding.

## Status (Components §Status)

Chips never rely on colour alone — the word is always present. An absence is never a badge.

- **`.chip`** + **`.chip--keeper` / `--write` / `--read` / `--invited`** — 4/11 · radius 999 · 12/600 ·
  bordered. keeper `#fff5f5`/`#8b0000`/`#e8c9c6` · write `#eaf4ee`/`#1f6a3e`/`#c9e0d2` · read
  `#f4ede0`/`#55504a`/`#e2d7bf` · invited `#fdf1e2`/`#8a5300`/`#eed9b6`. "no account" is NOT a chip —
  bare 13px `#6b6455` text. Read by every role; changed only by a keeper, only from the record panel.
- **`.absent`** — absence in words, `#a89f8c` (size contextual, 14px in rows). Never a blank/em-dash.
  This colour is integration contract §8.
- **`.count-badge`** — 12/600 `#8a8377`, right-aligned (rail uses its own `.tree-rail-badge`).
- **`.dirty-dot`** — 6px `#b22222` dot before a changed field's label (Spec 13 dirty tracking).
- **`.check-mark`** + **`--done` / `--current` / `--later`** — 16px getting-started checklist markers:
  done filled `#b22222` + white ✓ (9px), current open red ring, later open quiet `#d8cdb4` ring.
- `.suggested` and `.radio-now` (the "now" tag) also live under Inputs; they double as Status markers.
- Generation marker (I/II/III) is typography, not a component: Yatra One 15px (type ladder).

## Containers & lists (Components §Containers)

Three tables share ONE row + header. Fixed column grid: 40 · flex · 46 · 100 · 150 · 100 · 112.

- **`.card`** — the default content container: bg `#fffdf9` · border 1px `#e6ddc9` · radius 16.
- **`.records-table`** — bordered card wrapper (radius 16, clip). **`.records-thead`** — header, 42px,
  sticky, `#f8f2e4`, 10px mono .13em caps `#8a8377`, hairline bottom.
- **`.records-row`** — the shared row: 60px (40px avatar + 10/10) · padding 10/18 · gap 14 ·
  border-bottom 1px `#f4ede0` (last row none). Hover + `.open`/`[aria-current]` → wash `#fff5f5`; open
  also bolds `.records-name-primary` to 700 `#8b0000`. `:focus-visible` → inset 3px halo (keyboard nav).
  The whole row opens the record; only the May cell stops propagation. Rows order by generation then
  birth, never alphabetically.
  - **`.records-avatar`** 40px · 2px ring (colour set per-person) · initials 12/600 `#fffdf9`.
  - **`.records-name-primary`** 15/600 `#1a1a1a` · **`.records-name-secondary`** 13/400 `#8a8377`.
  - **`.records-col-gen`** (46, Yatra 15) · `.records-col-born` · `.records-col-may`. Exact per-table
    column widths reconciled at Spec 06 (QUESTIONS Q8: row h-padding 18 vs 32; col widths).
  - ⚠️ `.records-select` (role `<select>` inside a row) is a Spec-06 "Do not" — remove in Wave 3;
    role writes move to the record panel.
- **`.preview-block`** — states what a Save will change: bg `#f8f2e4` · radius 12 · 14/16 · 13.5/1.55
  `#55504a`. (Write panels; Spec 07/13.)
- **`.panel-footer`** — 68px · hairline top `#e6ddc9` · Discard (quiet, left) + Save (filled, right).
  Rendered only when dirty — behaviour wired in Spec 13 (Wave 1).
- Numbered-step eyebrow reuses `.eyebrow` (10px mono .14em caps).
