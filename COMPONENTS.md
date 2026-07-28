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
