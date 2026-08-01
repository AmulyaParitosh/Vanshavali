# Tree Canvas spec — contract (Vanshavali Tree Canvas.dc.html)

Concept: **वंश-पट्ट / lineage bands.** Generations run as horizontal bands. Each
household is one card. Descent is drawn in sepia joinery, the eldest son's line
carried on a heavier trunk stroke; branches thin out.

## The card (the only atom) — one household = one person OR a married pair, never two loose people

- Face `#fffdf9`, border `1px #e3d8c0`, radius 12 (full).
- **Descent spine** — 3px left bar. **Red `#b22222`** when the family name carries on
  through this household; **marigold `#d98c1f`** when it changes by marriage.
- **Portrait ring** — 2px on canvas. **Red** = born into this line; **marigold** = married in.
  Same size, only colour differs — never a different shape.
- **Row split** (pair) — dashed hairline `1px dashed #ece0c6`, spouse row bg `#fefaf1`
  (half a step warmer). The pair is ONE object with a seam, not two cards.
- **Name** — Devanagari first, 14px medium (full). Latin only in the record panel.
- **Years** — 9.5px mono, muted `#a49a89`. Open dash (`1968–`) = living. Deceased = dim to 50%
  (opacity .5, name colour `#6f675a`).
- **Fold chip** — only on households with children, only on hover — or always once folded,
  carrying the count (`+14`) below. Marigold pill (`#fdf1e2` bg, `#edd3a8` border, `#8a5300` text).

## 12 card states

1. Household (default) — head on top, spouse below.
2. Single person — no spouse row.
3. Widow — one row dims (opacity .5); household stays whole.
4. Ancestors — both gone, whole card 50%.
5. Selected — 2px red border, lifted shadow `0 8px 22px rgba(178,34,34,.22)`, bg `#fffaf6`; record panel opens same moment.
6. Off the path — focus path lit → everything off it drops to **26%**.
7. Daughter's house — self is a daughter of the line → **marigold spine**; her children carry husband's name.
8. Unrecorded — dashed border `1.5px dashed #d5c9ae`, italic "name unknown", still clickable; spine `#d8cdb4`, ring `#c2b498`.
9. Folded — descent hidden; chip carries count below; stub keeps branch visible.
10. Compact — 0.42–0.72 zoom band. Names hold; years + 2nd chrome line go.
11. Glyph — below 0.42. Two rings in a pill.
12. Empty branch — no recorded issue ends clean: no stub, no dangling stroke, no "add" until hover. Spine marigold.

## Three LODs (zoom-driven, 160ms crossfade, anchored on pointer)

| Metric           | Full (≥0.72) | Compact (0.42–0.72) | Glyph (<0.42) |
| ---------------- | ------------ | ------------------- | ------------- |
| Card width       | 208          | 152                 | auto          |
| Row height       | 44           | 32                  | 27            |
| Portrait         | 32           | 22                  | 15            |
| Name size        | 14           | 12                  | —             |
| Years            | 9.5 mono     | hidden              | hidden        |
| Sibling gap      | 20           | 14                  | 12            |
| Generation pitch | 172          | 122                 | 74            |
| Corner radius    | 12           | 9                   | pill          |
| Elbow radius     | 10           | 10                  | 7             |
| Edge stroke      | 1.5          | 1.5                 | 1.4           |
| Trunk stroke     | 2.6          | 2.6                 | —             |

## Colours

- `#fdf5e6` canvas + even generation band · `#fbf2e0` odd band (only separation)
- `#fffdf9` card face · `#fefaf1` spouse row
- `#b22222` born-into / selection / descent spine · `#d98c1f` married-in / name-change / fold stubs
- `#8b6a4a` trunk (eldest son's descent) · `#b39a72` every other descent stroke
- `#e3d8c0` card border + generation hairlines · `#6f675a` deceased name

## Behaviours

- **Select** (click) — red border, focus path lights, record panel slides in from right. Canvas pans only if the card would sit under the panel.
- **Focus path** — ancestors to founder + all descent full strength; everything else 26%. Escape clears.
- **Fold** (chip / ⌥-click) — hides descent behind a stub with head-count; persists per tree per person across reload.
- **Zoom** (wheel · ⌘± · controls) — continuous 0.18–1.4; LOD swaps at 0.42 & 0.72, 160ms crossfade, pointer-anchored.
- **Fit** (button · F) — frames whole tree, picks resulting LOD; long tree lands in glyph.
- **Generation rail** (always on) — pinned left; roman numeral, first birth year, head-count; click numeral scrolls band to top.
- **Minimap** (above 3 screenfuls) — bottom-right, dark; drag red rect to pan; shows share on screen.
- **Hover** — 1px red border, no movement; in glyph the name floats above the ring.

## Acceptance

1. One-person tree → one card, centred, no rail chrome, no minimap.
2. 40-person tree fits whole at full detail, legend clear of every card.
3. 250-person tree reaches fit <400ms, >50fps while panning.
4. LOD swaps at exactly 0.42 & 0.72, crossfading, never popping mid-drag.
5. Couples never overlap and never separate — one hit target, two rings.
6. Selecting lights an unbroken path to the founder, no gaps at folded households.
7. Folded branch shows true count below (spouses included).
8. Every Devanagari name ≥12px effective in full/compact; below → glyph, no names.
9. Deceased dimmed by opacity only — never a different border/badge/icon.
10. Generation rail always names the band under the pointer, at every zoom.
11. Keyboard-navigable: arrows between siblings, up/down between generations.
12. Printing produces the whole tree at full detail across as many sheets as needed.
