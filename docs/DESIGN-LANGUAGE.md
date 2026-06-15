# Vanshavali Design Language

This document is the source of truth for Vanshavali's visual identity. It has two parts:

- **Part 1: Current state (descriptive)** — what exists in the codebase today as audited in June 2026. Useful for understanding the baseline before any redesign work and for catching drift.
- **Part 2: Target system (prescriptive)** — what the design language *should* be after the design pass. New components and refactors target this spec.

When the two disagree, follow Part 2 for new work and treat the gap as cleanup debt.

---

# Part 1 — Current state (descriptive snapshot, June 2026)

## 1.1 Brand

Vanshavali is a family-tree app rooted in **Mithila / Madhubani** visual heritage. The identity is currently strongest on the home tree (`/`) — Madhubani banner header, "Old Lace" paper-textured background wash, double-bordered ornamental tooltip cards, and circular nodes wrapped in painted Madhubani border imagery (`/node_border.png`). The rest of the app (forms, admin pages, modals) reverts to a generic light Material/Bootstrap visual language. **Most interactive surfaces do not currently carry the heritage motif.**

## 1.2 Tokens (current)

All tokens live in `:root` in `src/app/globals.css`.

### Color tokens

| Token | Value | Role today |
|---|---|---|
| `--color-bg` | `#fdf5e6` | Page background (handmade paper) |
| `--color-surface` | `#ffffff` | Card / panel surface |
| `--color-surface-dim` | `#f8f9fa` | (unused — orphan) |
| `--color-text` | `#1a1a1a` | Default body text |
| `--color-text-light` | `#666666` | Secondary text |
| `--color-primary` | `#b22222` | Madhubani red — branded actions, borders, accents |
| `--color-primary-dark` | `#8b0000` | Hover / strong primary |
| `--color-primary-light` | `#fff5f5` | Selected backgrounds, hover tints |
| `--color-secondary` | `#ff8c00` | Marigold — display headings, secondary accents |
| `--color-accent` | `#2e8b57` | Leaf green — confirm / success |
| `--color-node-border` | `#b22222` | Alias of primary, used on tree node borders |
| `--color-shadow` | `rgba(0,0,0,0.08)` | Generic shadow |
| `--color-link-stroke` | `#221005` | Tree edge stroke color |
| `--color-bg-transparent` | `rgba(253,245,230,0.95)` | (declared twice, unused) |
| `--shadow-strong` | `0 12px 36px rgba(178,34,34,0.12)` | Elevated cards |

### Known issues with current tokens

- **Six different reds** are in active use across the app (`#b22222`, `#a72626`, `#dc3545`, `#f44336`, `#d32f2f`, `#8b0000`). No semantic distinction between "brand red" and "danger red".
- **Two greens** (`#2e8b57`, `#28a745`).
- **12+ gray tones** used without a neutral scale.
- **Tailwind-palette pastel pairs** leaked into role badges (`/user/profile`) and the "linked" pills (`SearchItem.tsx`) — completely off-brand.
- **No semantic role tokens** (no `--color-danger`, `--color-success`, `--color-warning`, `--color-info`).
- **No spacing scale**. No type-size tokens. No motion-easing tokens beyond raw `cubic-bezier(...)` literals.
- `rgba(var(--color-bg), 0.8)` in `.loading-container` is **broken CSS** — `--color-bg` is a hex, not an RGB triple.
- `var(--background)` (no leading double-dash typo — different from `--color-bg`) referenced in `.user-layout` is **undefined**.
- `--color-bg-transparent` is **declared twice** in the same `:root` block and never used.

### Radius (raw values; no scale)

| Token | Value | Role today |
|---|---|---|
| `--border-radius-sm` | `12px` | Small chips, small buttons, badges, admin inputs |
| `--border-radius-md` | `20px` | Section/list cards |
| `--border-radius-lg` | `32px` | Hero panels (login, admin container, form container) |

Literal values also in active use: `9999px` (button pills, search input), `16px` (form inputs), `50%` (avatars, circle buttons), `15px` (alias tags).

### Typography (current)

- **Heading font**: `"Yatra One", cursive` — Devanagari-evoking display, weight 400 only.
- **Body font**: `"Hind", sans-serif` — humanist sans, weights 300/400/600.
- Imported via Google Fonts `@import` with `&display=swap` in `globals.css:2`.

**Font sizes in actual use** (20 distinct values, no scale):
`0.7em`, `0.75rem`, `0.8em`, `0.85em`, `0.9em`, `0.9rem`, `0.95em`, `1em`, `1.1em`, `1.2em`, `1.2rem`, `1.25em`, `1.5em`, `1.8em`, `2em`, `2.2em`, `2.5em`, `3em`, `12px`, `14px`, `15px`, `16px`.

**Font weights**: 400, 500, 600, bold(700). The `500` weight is *referenced but never loaded* by the Google Fonts URL — it silently falls back to 400.

### Spacing (no scale)

Raw px values used: 0, 2, 3, 4, 5, 6, 8, 10, 12, 14, 15, 16, 20, 24, 25, 30, 40, 50. Mixed with `1.5rem`, `2rem`. **No 4px or 8px base is enforced.**

### Elevation

No token system. ~25 distinct `box-shadow` literals across `globals.css`. Roughly grouped into: subtle card shadows (~0.02-0.05 alpha), branded strong shadow (`var(--shadow-strong)`), hover-lift shadows, inset input shadows, dark header shadow.

### Motion

Two easing curves used as raw literals (no tokens):
- `cubic-bezier(0.4, 0, 0.2, 1)` — Material standard (5+ usages).
- `cubic-bezier(0.175, 0.885, 0.32, 1.275)` — Overshoot/bounce, only on details-card enter/exit.

Durations: 0.2s (most), 0.25s, 0.3s, 0.4s.

## 1.3 Component inventory (current — by class name)

**Buttons** — at least 12 distinct visual variants, many not extending a shared base (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.back-button`, `.btn-approve`, `.btn-deny`, `.btn-icon-remove`, `.btn-icon-remove.small`, `.btn-icon-add`, `.btn-icon-overlay`, `.order-btn`, plus undefined-in-CSS `.btn-outline-danger`/`.btn-block`/`.btn-sm` referenced in JSX). The `\2727` star ::before glyph on `.btn` is a heritage flourish that doesn't transfer to the icon variants.

**Inputs** — five distinct treatments (form-group input, unified-search-input, aliases-container, plain textarea, inline-overridden name input).

**Selects** — four distinct treatments.

**Cards** — five distinct treatments. The "decorative Madhubani frame" (double red border + inner secondary border) is used only on `.details-card` (tree tooltips) and `.about-content`. Every other card surface is generic.

**Sidebars** — three implementations sharing the `.sidebar` class but with different padding/positioning/states. `TextListSidebar` and `UserSidebar` use different active-item visuals.

**Search components** — three (UnifiedSearch, PersonSearch, TreeSearch). TreeSearch re-implements the dropdown inline with a glassmorphic backdrop-filter that appears nowhere else.

**Modals** — none. `ConfirmToast` (toast.custom) is the only "modal" — no overlay scrim, no focus trap, no aria-modal.

**Badges** — five styles, no base class (`.notification-badge`, `.role-badge`, `.status-badge`, `.linked-badge`, `.alias-tag`).

**Toasts** — `ToastSystem.tsx` via react-hot-toast. Border-image gradient (primary → secondary) on the base toast, removed on confirm. Glyph icons (`✔ ✖ ⏳ ✕`) that render differently across OSes.

**Icons** — **no icon library**. Mixed sources: 2 inline SVGs, ~10 Unicode glyphs, ~8 HTML entities, CSS pseudo-content. Style, weight, color all vary.

## 1.4 Decorative motifs (currently active)

- Toast: `border-image: linear-gradient(primary, secondary)` — unique to here.
- Admin / About headings: `::after` dual-bar underline ornament.
- Buttons: `::before \2727` (star) glyph at 0.7 opacity, 0.8em.
- Details-card events: `::before \2740` (flower) glyph.
- Details-card custom fields: `::before \2727` (star) glyph.
- Tree nodes: painted `node_border.png` ring (1.9 MB PNG) extending 30% beyond the circle.
- Tree background: very subtle "tree trunk" SVG path at 3% opacity (effectively invisible).
- Family search overlap: husband (primary border) + wife (secondary border) overlapping avatars — a wedding-photo motif.

## 1.5 Layout (current)

- **App shell**: vertical flex, 100vh, overflow hidden.
- **Header**: ~100 px tall (`padding: 20px 30px` + 3em h1 + 7px bottom border). Madhubani banner background + dark gradient overlay.
- **Main**: three layout patterns:
  - **Split editor** (`.edit-screen`): 300 px sidebar + flex panel. Used on `/family`, `/people`.
  - **Split nav** (`.user-layout`): 300 px sticky sidebar + flex content. Used on `/user/*`.
  - **Single column**: `/about`, login / pending / denied screens.
  - **Full-bleed**: `/` (tree, no sidebar).

Three different assumed header heights are baked into different screens (`calc(100vh - 60px)`, `calc(100vh - 90px)`, `top: 60px` on a sticky sidebar) — none of which match the actual header's ~100 px.

## 1.6 Accessibility (current)

- **Zero `aria-*` attributes** in the entire codebase.
- **No `:focus-visible` styles** — keyboard focus is invisible on most elements.
- `<label htmlFor>` used on only 4 inputs; others rely on `placeholder`.
- The D3 tree has **no keyboard support**.
- Icon-only buttons rely on `title` tooltip for label, not `aria-label`.
- Touch targets often <44 px (icon-remove 28 px, icon-remove-small 20 px, icon-add 32 px, order-btn ~12 px).
- `--color-secondary` (#ff8c00) used as heading text on white — **fails AA 4.5:1**.
- `.search-item-subtext { opacity: 0.8 }` drops light-gray below AA.

## 1.7 Responsive (current)

Effectively desktop-only. **One media query** in 1647 lines of CSS (`@media (max-width: 768px)` at `globals.css:1168-1177`), which only restacks two layouts. No mobile header, no hamburger, no sidebar collapse. No pinch-to-zoom on the D3 tree.

## 1.8 Asset weight (current)

Per page load: **~12-14 MB of decorative imagery**.

| File | Size | Usage |
|---|---|---|
| `public/canvas_background.png` | 8.3 MB | body::before texture wash at 0.2 opacity |
| `public/madhubani_banner.png` | 2.0 MB | header background |
| `public/node_border.png` | 1.9 MB | per-node decorative frame (~50 nodes per tree) |
| `public/screenshot.jpeg` | 1.7 MB | **unused — orphan** |
| `public/developer.png` | 888 KB | single 150×150 profile image on About page |
| `public/favicon.ico` | 4.2 KB | tab favicon |

---

# Part 2 — Target system (prescriptive)

This is the design system to build toward. Implement against these tokens, components, and patterns in new code. Refactor legacy CSS to match incrementally — flag drift in PR review.

## 2.1 Brand position

Vanshavali is a heritage-rooted, contemporary product. The Madhubani identity is **expressed through surface accents**: the banner, decorative borders on key surfaces (login, empty states, tree, error pages), and ornaments on milestone moments (welcome, invitation accepted). The bulk of interactive UI — forms, dropdowns, lists, modals — uses a **clean modern base** that respects the heritage palette and typography but doesn't fight readability or accessibility.

Think: a museum gallery where the building has Mithila murals on the walls but the placards and benches are quiet and well-designed.

## 2.2 Token system

### Color — semantic + scale

Brand colors first (carry forward, untouched values):

```css
--color-primary-50:  #fff5f5;   /* was --color-primary-light */
--color-primary-500: #b22222;   /* was --color-primary; also drop --color-node-border alias */
--color-primary-700: #8b0000;   /* was --color-primary-dark */

--color-secondary-500: #ff8c00; /* Marigold */

--color-accent-500:  #2e8b57;   /* Leaf green */
```

Neutral scale (new — replaces the 12 ad-hoc grays):

```css
--color-neutral-0:   #ffffff;   /* was --color-surface */
--color-neutral-50:  #f8f9fa;   /* was --color-surface-dim */
--color-neutral-100: #f0f0f0;
--color-neutral-200: #e0e0e0;
--color-neutral-300: #ddd;
--color-neutral-400: #aaa;
--color-neutral-500: #888;
--color-neutral-600: #666;      /* was --color-text-light */
--color-neutral-700: #555;
--color-neutral-800: #333;
--color-neutral-900: #1a1a1a;   /* was --color-text */
```

Background (heritage):

```css
--color-bg:          #fdf5e6;   /* handmade paper */
--color-bg-overlay:  rgba(253, 245, 230, 0.95);   /* for use in rgba() contexts */
```

Semantic role aliases (new — one source of truth for all "this means danger" usages):

```css
--color-danger:   var(--color-primary-500);   /* same red — destructive AND brand */
--color-success:  var(--color-accent-500);
--color-warning:  var(--color-secondary-500);
--color-info:     #3b82f6;                    /* new — replaces ad-hoc blues */
```

**Rules**:

1. Use the **semantic alias** (`--color-danger`, `--color-success`, etc.) in component styles whenever the intent is functional. Use the **brand or neutral token** when the intent is purely decorative.
2. No raw hex values in component CSS. Tokens only.
3. The "six different reds" problem disappears because every red is `--color-danger` (which equals `--color-primary-500`). No `#a72626`, `#dc3545`, `#f44336`, `#d32f2f` anywhere.

### Spacing scale (4px base)

```css
--space-0:   0;
--space-1:   4px;
--space-2:   8px;
--space-3:   12px;
--space-4:   16px;
--space-5:   20px;
--space-6:   24px;
--space-8:   32px;
--space-10:  40px;
--space-12:  48px;
--space-16:  64px;
```

Use these. No `padding: 13px`. No `margin-top: 14px` magic values. If a layout demands a non-scale value, it's a design bug — fix the layout, not the value.

### Type scale

Six sizes only; no `em` (use `rem` or named tokens):

```css
--font-size-xs:    0.75rem;   /* 12px — captions, badges, labels */
--font-size-sm:    0.875rem;  /* 14px — secondary body */
--font-size-base:  1rem;      /* 16px — body, inputs */
--font-size-lg:    1.125rem;  /* 18px — emphasized body, login text */
--font-size-xl:    1.5rem;    /* 24px — h3 (section headings) */
--font-size-2xl:   2rem;      /* 32px — h2 (page subtitles) */
--font-size-3xl:   2.5rem;    /* 40px — h1 (page titles) */
--font-size-display: 3rem;    /* 48px — hero / display only */
```

Heading hierarchy:

| Tag | Token | Family |
|---|---|---|
| `h1` | `--font-size-3xl` | `--font-heading` (Yatra One) |
| `h2` | `--font-size-2xl` | `--font-heading` |
| `h3` | `--font-size-xl` | `--font-heading` |
| `h4`+ | `--font-size-lg` | `--font-body` (Hind) bold |
| Body | `--font-size-base` | `--font-body` |
| Caption | `--font-size-sm` | `--font-body` |
| Micro | `--font-size-xs` | `--font-body` |

Add **proper fallbacks**:

```css
--font-heading: "Yatra One", "Georgia", serif;
--font-body:    "Hind", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif;
```

Weights actually loaded: 400 and 600 for Hind, 400 for Yatra One. **Stop referencing `500`** — it falls back to 400 anyway.

### Radius

Rename for clarity, add the missing values:

```css
--radius-xs:  4px;     /* badges, tag chips */
--radius-sm:  8px;     /* small buttons, list items */
--radius-md:  12px;    /* default buttons, inputs, cards */
--radius-lg:  20px;    /* section cards, modals */
--radius-xl:  32px;    /* hero panels */
--radius-pill: 9999px; /* pill buttons, search input */
--radius-circle: 50%;  /* avatars, circle buttons */
```

### Elevation

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
--shadow-sm: 0 2px 4px rgba(0,0,0,0.06);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 12px 36px rgba(178,34,34,0.12);  /* branded — was --shadow-strong */
--shadow-xl: 0 24px 64px rgba(0,0,0,0.16);
```

### Motion

```css
--ease-standard:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-emphasis:  cubic-bezier(0.175, 0.885, 0.32, 1.275);   /* keep for special moments only */
--duration-fast:   150ms;
--duration-base:   200ms;
--duration-slow:   300ms;
```

## 2.3 Components (target)

A single `.btn` base class with variants. Drop the standalone `.btn-approve` / `.btn-deny` / `.back-button` classes.

```
.btn                 → base shape, padding, transition
.btn--primary        → primary action (solid primary bg, white text)
.btn--secondary      → secondary action (outlined, neutral text)
.btn--danger         → destructive (uses --color-danger)
.btn--ghost          → text-only, no border
.btn--icon           → icon-only, square, 40×40 (≥44 touch target with padding)
.btn--icon-sm        → smaller icon button, 32×32 (use sparingly — desktop only)
.btn--block          → full-width modifier (DEFINE — currently referenced in JSX, no CSS)
.btn--sm / .btn--lg  → size modifiers
```

Remove the `::before \2727` star from `.btn`. Reapply heritage motif at component-feature level (e.g., a special "Submit" button on first-tree creation), not on every button.

Single `.input` base for all text inputs / textareas / selects. One focus ring:

```css
.input:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

Modals: a real `<dialog>` element with overlay, focus trap, `role="alertdialog"`, `aria-labelledby`. The current `ConfirmToast` becomes `<ConfirmDialog>`.

Badges: a single `.badge` base + variants by semantic role.

Icons: adopt **Lucide** (preferred — open source, MIT, ~1000 icons, consistent stroke). Replace every Unicode glyph and HTML entity. Replace the 2 inline SVGs.

## 2.4 Heritage motif surfaces (target)

Carry the heritage identity on these surfaces, and these only:

1. **Header banner** — `madhubani_banner.png` (optimized; see §2.7).
2. **Tree node borders** — current `node_border.png` (optimized to SVG).
3. **Tree details cards** — current double-border treatment, but rendered as proper React `<DetailsCard>` (no XSS).
4. **Sign-in / sign-up screen** — decorative borders around the auth card.
5. **Empty states** — illustrated "Add your first family member" with a Madhubani-inspired SVG.
6. **Error pages** — 404, 500, access-denied: heritage-flavored.
7. **Invitation acceptance** — `/invite/[id]` landing with welcome ornamentation.
8. **First-tree-created celebration** — milestone moment (post-onboarding).

Everywhere else: clean modern, generous whitespace, accessible.

## 2.5 Accessibility targets

Every component ships with:

- `aria-label` on icon-only controls.
- `:focus-visible` outline using `--color-primary-500` at 2 px with 2 px offset.
- `role` attributes on custom-built widgets (dropdowns, modals, listboxes).
- Touch targets ≥ 44 × 44 px (WCAG 2.5.5 AAA recommended; minimum 24 × 24 px AA — we aim for AAA).
- Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text + UI components. The `--color-secondary` orange does **not** pass on white — use it only as accent border/background, never as text on light surface.
- Keyboard navigation through every interactive element (including the D3 tree — Tab through siblings, Enter to expand details).
- Screen reader announcements for toasts (`role="status"` / `role="alert"` with `aria-live`).

## 2.6 Responsive (target)

Mobile-first by default — design at 375 px width, expand up. Breakpoints:

```css
--breakpoint-sm: 640px;    /* phone landscape / large phones */
--breakpoint-md: 768px;    /* small tablets */
--breakpoint-lg: 1024px;   /* tablets / small laptops */
--breakpoint-xl: 1280px;   /* desktop */
```

At < 768 px:

- Header collapses: title + hamburger menu. Nav drawer slides in.
- Sidebars become drawers or move to a top tab strip.
- The D3 tree gets pinch-to-zoom touch handlers (D3-zoom supports this; needs binding).
- Forms use full-width inputs, stacked labels above fields.

## 2.7 Assets

Target: ≤ 500 KB total decorative payload per page.

| File | Current | Target | Treatment |
|---|---|---|---|
| `canvas_background.png` | 8.3 MB | < 50 KB | Replace with a CSS-generated tile pattern OR a small repeating SVG. At 0.2 opacity, fidelity isn't critical. |
| `madhubani_banner.png` | 2.0 MB | < 200 KB | Optimized WebP @ 2x density. Or hand-authored SVG for crisp scaling. |
| `node_border.png` | 1.9 MB | < 30 KB | Hand-authored SVG. Repeats ~50 times in the DOM but is a single cached request. |
| `developer.png` | 888 KB | < 30 KB | Optimized WebP, 150 × 150 with 2x retina. |
| `screenshot.jpeg` | 1.7 MB | **delete** | Orphan asset. |

Use Next.js `<Image>` for all non-decorative photography (lazy load, responsive sizes, automatic AVIF/WebP).

## 2.8 Dark mode

**Not in v1.** The heritage aesthetic relies on the warm Old Lace background and warm primary palette; a dark variant requires deliberate design work. Park for v1.5.

## 2.9 Empty / loading / error states

Every list, table, and editor surface needs three pre-designed states:

- **Empty** — heritage-illustrated SVG + "Add your first X" CTA + helpful subtext.
- **Loading** — same skeleton or spinner everywhere (one `<Loading>` component, no toast.loading variant for full-page loads).
- **Error** — concise plain-English message + retry CTA, never a console-only failure.

## 2.10 Decorative ornaments — usage rules

| Ornament | Reserved for |
|---|---|
| `::after` dual-bar underline | Page-title headings on **non-tree** pages (login, profile, settings) — used sparingly. |
| `::before \2727` star glyph | Special moments — invitation accepted, tree created, milestone toasts. **Removed from `.btn`.** |
| `::before \2740` flower glyph | Person events on tree details cards. |
| Madhubani border | Tree node frames, sign-in card, empty-state illustrations. |
| Primary→secondary gradient border-image | Welcome banner on first sign-in. **Removed from generic toasts.** |

Ornaments should feel intentional, not pervasive. The current "every button has a star" pattern is removed.

---

## Appendix: Mapping legacy class names → new tokens

For the refactor work, this is the cheat-sheet:

| Legacy | New |
|---|---|
| `--color-primary-light` | `--color-primary-50` |
| `--color-primary` | `--color-primary-500` |
| `--color-primary-dark` | `--color-primary-700` |
| `--color-secondary` | `--color-secondary-500` |
| `--color-accent` | `--color-accent-500` |
| `--color-surface` | `--color-neutral-0` |
| `--color-surface-dim` | `--color-neutral-50` |
| `--color-text` | `--color-neutral-900` |
| `--color-text-light` | `--color-neutral-600` |
| `--color-node-border` | `--color-primary-500` (drop the alias) |
| `--shadow-strong` | `--shadow-lg` |
| `--border-radius-sm` | `--radius-md` (the legacy 12px → semantic "default") |
| `--border-radius-md` | `--radius-lg` |
| `--border-radius-lg` | `--radius-xl` |

| Inline value | New token |
|---|---|
| `#dc3545`, `#a72626`, `#f44336`, `#d32f2f` | `--color-danger` |
| `#28a745`, `#218838` | `--color-success` |
| `#fcfcfc`, `#f5f7fa` | `--color-neutral-50` |
| `#e0e0e0` | `--color-neutral-200` |
| `#ddd` | `--color-neutral-300` |
| `#aaa` | `--color-neutral-400` |
| `#888`, `#757575`, `#777` | `--color-neutral-500` |
| `#666`, `#6b7280` | `--color-neutral-600` |
| `#555` | `--color-neutral-700` |
| `#333`, `#374151` | `--color-neutral-800` |
| Tailwind role badge pairs (`#fee2e2`/`#991b1b`, etc.) | Build new role badges with `--color-danger`/`--color-success`/`--color-warning` + matching `*-50` background |

---

*This document is updated when token names change, when new components are introduced, or when the heritage motif surfaces shift. Last revised: 2026-06.*
