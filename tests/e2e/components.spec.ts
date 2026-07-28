import { test, expect, type Page } from "@playwright/test";

/**
 * Vanshavali Components.dc.html — the primitive library, tested in isolation.
 * Each primitive is injected into a page that already has globals.css loaded and
 * its computed styles are asserted against the spec's measured values. Grows one
 * section at a time (Actions, Inputs, Status, Containers, Overlays, Empty/loading).
 */

// Primitives are global CSS — test signed out, no seed dependency.
test.use({ storageState: { cookies: [], origins: [] } });

/** Inject `html`, read computed props off `selector`, clean up. */
async function computed(
  page: Page,
  html: string,
  selector: string,
  props: string[]
): Promise<Record<string, string>> {
  return page.evaluate(
    ({ html, selector, props }) => {
      const host = document.createElement("div");
      host.setAttribute("data-probe", "");
      host.innerHTML = html;
      document.body.appendChild(host);
      const el = host.querySelector(selector) as HTMLElement;
      const cs = getComputedStyle(el);
      const out: Record<string, string> = {};
      for (const p of props) out[p] = cs.getPropertyValue(p);
      host.remove();
      return out;
    },
    { html, selector, props }
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Components — Actions (buttons)", () => {
  test("Primary: filled red pill, 11/20, 14.5/600 white, with the primary shadow", async ({
    page,
  }) => {
    const c = await computed(
      page,
      '<button class="btn btn-primary">+ Add person</button>',
      ".btn-primary",
      [
        "padding",
        "background-color",
        "color",
        "border-radius",
        "font-size",
        "font-weight",
        "box-shadow",
      ]
    );
    expect(c).toMatchObject({
      padding: "11px 20px",
      "background-color": "rgb(178, 34, 34)",
      color: "rgb(255, 255, 255)",
      "border-radius": "999px",
      "font-size": "14.5px",
      "font-weight": "600",
    });
    expect(c["box-shadow"]).toContain("178, 34, 34");
  });

  test("Outline: paper pill, 10/18, 14.5/600 #33302b, 1px #d8cdb4 border", async ({ page }) => {
    const c = await computed(page, '<button class="btn">Edit record</button>', ".btn", [
      "padding",
      "background-color",
      "color",
      "border-top-color",
      "border-top-width",
      "font-size",
      "font-weight",
    ]);
    expect(c).toMatchObject({
      padding: "10px 18px",
      "background-color": "rgb(255, 253, 249)",
      color: "rgb(51, 48, 43)",
      "border-top-color": "rgb(216, 205, 180)",
      "border-top-width": "1px",
      "font-size": "14.5px",
      "font-weight": "600",
    });
  });

  test("Quiet: 10/18, 14/500 #6b6455 — guidance the viewer cannot act on", async ({ page }) => {
    const c = await computed(
      page,
      '<button class="btn btn-quiet">Ask a keeper</button>',
      ".btn-quiet",
      ["padding", "color", "font-size", "font-weight"]
    );
    expect(c).toMatchObject({
      padding: "10px 18px",
      color: "rgb(107, 100, 85)",
      "font-size": "14px",
      "font-weight": "500",
    });
  });

  test("Destructive pill: red text on the red wash, never filled red", async ({ page }) => {
    const c = await computed(
      page,
      '<button class="btn btn-danger">Remove access</button>',
      ".btn-danger",
      ["background-color", "color", "border-top-color", "font-weight"]
    );
    expect(c).toMatchObject({
      "background-color": "rgb(255, 245, 245)",
      color: "rgb(178, 34, 34)",
      "border-top-color": "rgb(240, 220, 216)",
      "font-weight": "600",
    });
  });

  test("Destructive text: 13.5/600 red, no border, no fill", async ({ page }) => {
    const c = await computed(
      page,
      '<button class="btn-danger-text">Delete household</button>',
      ".btn-danger-text",
      ["color", "font-size", "font-weight", "background-color", "border-top-width"]
    );
    expect(c).toMatchObject({
      color: "rgb(178, 34, 34)",
      "font-size": "13.5px",
      "font-weight": "600",
      "background-color": "rgba(0, 0, 0, 0)",
      "border-top-width": "0px",
    });
  });

  test("Cell button: 4/11, 12.5/600 red on wash — the only in-row control", async ({ page }) => {
    const c = await computed(page, '<button class="cell-btn">Invite</button>', ".cell-btn", [
      "padding",
      "font-size",
      "font-weight",
      "background-color",
      "color",
    ]);
    expect(c).toMatchObject({
      padding: "4px 11px",
      "font-size": "12.5px",
      "font-weight": "600",
      "background-color": "rgb(255, 245, 245)",
      color: "rgb(178, 34, 34)",
    });
  });

  test("Close ✕: 15px #8a8377 in a 32px hit area", async ({ page }) => {
    const c = await computed(page, '<button class="icon-close">✕</button>', ".icon-close", [
      "width",
      "height",
      "color",
      "font-size",
    ]);
    expect(c).toMatchObject({
      width: "32px",
      height: "32px",
      color: "rgb(138, 131, 119)",
      "font-size": "15px",
    });
  });

  test("Key cap: 11px mono label, radius 4px, quiet fill — a label, not a button", async ({
    page,
  }) => {
    const c = await computed(page, '<span class="key-cap">esc</span>', ".key-cap", [
      "font-size",
      "border-radius",
      "background-color",
    ]);
    expect(c).toMatchObject({
      "font-size": "11px",
      "border-radius": "4px",
      "background-color": "rgb(244, 237, 224)",
    });
  });

  test("Disabled: opacity .45, cursor default", async ({ page }) => {
    const c = await computed(
      page,
      '<button class="btn btn-primary" disabled>Save</button>',
      ".btn-primary",
      ["opacity", "cursor"]
    );
    expect(c).toMatchObject({ opacity: "0.45", cursor: "default" });
  });
});

test.describe("Components — Inputs", () => {
  test("Data field: rounded rectangle, radius 12, 11/14, 15.5px value, control border", async ({
    page,
  }) => {
    const c = await computed(page, '<input class="input" value="Devendra Mishra" />', ".input", [
      "padding",
      "border-radius",
      "font-size",
      "border-top-color",
    ]);
    expect(c).toMatchObject({
      padding: "11px 14px",
      "border-radius": "12px",
      "font-size": "15.5px",
      "border-top-color": "rgb(216, 205, 180)",
    });
  });

  test("Search pill: radius 999, 9/13, 14px field — typing filters, not writes", async ({
    page,
  }) => {
    const html = '<div class="search-pill"><input placeholder="Name or alias" /></div>';
    const pill = await computed(page, html, ".search-pill", ["border-radius", "padding"]);
    expect(pill).toMatchObject({ "border-radius": "999px", padding: "9px 13px" });
    const field = await computed(page, html, ".search-pill input", ["font-size"]);
    expect(field["font-size"]).toBe("14px");
  });

  test("Field label / error / suggested carry their exact type", async ({ page }) => {
    const label = await computed(page, '<label class="field-label">Latin</label>', ".field-label", [
      "font-size",
      "font-weight",
      "color",
    ]);
    expect(label).toMatchObject({
      "font-size": "12.5px",
      "font-weight": "600",
      color: "rgb(85, 80, 74)",
    });
    const err = await computed(
      page,
      '<span class="field-error">There is no thirteenth month.</span>',
      ".field-error",
      ["font-size", "color", "margin-top"]
    );
    expect(err).toMatchObject({
      "font-size": "12.5px",
      color: "rgb(139, 0, 0)",
      "margin-top": "6px",
    });
    const sug = await computed(page, '<span class="suggested">suggested</span>', ".suggested", [
      "font-size",
      "font-weight",
      "color",
    ]);
    expect(sug).toMatchObject({
      "font-size": "10.5px",
      "font-weight": "600",
      color: "rgb(138, 131, 119)",
    });
  });

  test("Segmented switch: quiet track, raised selected segment at 600", async ({ page }) => {
    const html =
      '<div class="segmented"><button class="segmented-option selected">Male</button><button class="segmented-option">Female</button></div>';
    const track = await computed(page, html, ".segmented", [
      "background-color",
      "border-radius",
      "padding",
    ]);
    expect(track).toMatchObject({
      "background-color": "rgb(248, 242, 228)",
      "border-radius": "12px",
      padding: "3px",
    });
    const sel = await computed(page, html, ".segmented-option.selected", [
      "background-color",
      "font-weight",
      "border-radius",
    ]);
    expect(sel).toMatchObject({
      "background-color": "rgb(255, 253, 249)",
      "font-weight": "600",
      "border-radius": "9px",
    });
    const un = await computed(page, html, ".segmented-option:not(.selected)", [
      "color",
      "font-weight",
    ]);
    expect(un).toMatchObject({ color: "rgb(138, 131, 119)", "font-weight": "500" });
  });

  test("Toggle: 40×22, track #d8cdb4 off and #b22222 on", async ({ page }) => {
    const off = await computed(page, '<button class="toggle"></button>', ".toggle", [
      "width",
      "height",
      "background-color",
    ]);
    expect(off).toMatchObject({
      width: "40px",
      height: "22px",
      "background-color": "rgb(216, 205, 180)",
    });
    const on = await computed(page, '<button class="toggle on"></button>', ".toggle", [
      "background-color",
    ]);
    expect(on["background-color"]).toBe("rgb(178, 34, 34)");
  });

  test("Radio row: selected takes the red wash and the red hairline", async ({ page }) => {
    const sel = await computed(
      page,
      '<button class="radio-row selected"><span class="radio-dot"></span>Write</button>',
      ".radio-row.selected",
      ["background-color", "border-top-color", "border-radius"]
    );
    expect(sel).toMatchObject({
      "background-color": "rgb(255, 245, 245)",
      "border-top-color": "rgb(240, 220, 216)",
      "border-radius": "12px",
    });
  });

  test("Alias chip: neutral pill (#f8f2e4 / #e6ddc9), 5/11, 13.5px — never red", async ({
    page,
  }) => {
    const c = await computed(
      page,
      '<div class="aliases-input-container"><span class="alias-tag">“Ani”</span></div>',
      ".alias-tag",
      ["padding", "background-color", "border-top-color", "font-size", "border-radius"]
    );
    expect(c).toMatchObject({
      padding: "5px 11px",
      "background-color": "rgb(248, 242, 228)",
      "border-top-color": "rgb(230, 221, 201)",
      "font-size": "13.5px",
      "border-radius": "999px",
    });
  });
});

test.describe("Components — Status", () => {
  const chipCases = [
    ["keeper", "Keeper", "rgb(255, 245, 245)", "rgb(139, 0, 0)", "rgb(232, 201, 198)"],
    ["write", "Write", "rgb(234, 244, 238)", "rgb(31, 106, 62)", "rgb(201, 224, 210)"],
    ["read", "Read", "rgb(244, 237, 224)", "rgb(85, 80, 74)", "rgb(226, 215, 191)"],
    ["invited", "Invited", "rgb(253, 241, 226)", "rgb(138, 83, 0)", "rgb(238, 217, 182)"],
  ] as const;

  for (const [mod, label, bg, fg, bc] of chipCases) {
    test(`Access chip ${label}: 4/11 · 999 · 12/600, bordered, word always present`, async ({
      page,
    }) => {
      const c = await computed(
        page,
        `<span class="chip chip--${mod}">${label}</span>`,
        `.chip--${mod}`,
        [
          "padding",
          "border-radius",
          "font-size",
          "font-weight",
          "background-color",
          "color",
          "border-top-color",
        ]
      );
      expect(c).toMatchObject({
        padding: "4px 11px",
        "border-radius": "999px",
        "font-size": "12px",
        "font-weight": "600",
        "background-color": bg,
        color: fg,
        "border-top-color": bc,
      });
    });
  }

  test("Absence is stated in words at #a89f8c — never a chip", async ({ page }) => {
    const c = await computed(page, '<span class="absent">no date recorded</span>', ".absent", [
      "color",
      "background-color",
    ]);
    expect(c).toMatchObject({
      color: "rgb(168, 159, 140)",
      "background-color": "rgba(0, 0, 0, 0)",
    });
  });

  test("Count badge: 12/600 meta", async ({ page }) => {
    const c = await computed(page, '<span class="count-badge">62</span>', ".count-badge", [
      "font-size",
      "font-weight",
      "color",
    ]);
    expect(c).toMatchObject({
      "font-size": "12px",
      "font-weight": "600",
      color: "rgb(138, 131, 119)",
    });
  });

  test("Dirty-field dot: 6px red", async ({ page }) => {
    const c = await computed(page, '<span class="dirty-dot"></span>', ".dirty-dot", [
      "width",
      "height",
      "background-color",
      "border-radius",
    ]);
    expect(c).toMatchObject({
      width: "6px",
      height: "6px",
      "background-color": "rgb(178, 34, 34)",
      "border-radius": "50%",
    });
  });

  test("Checklist markers: done filled red, current open red ring, later open quiet ring", async ({
    page,
  }) => {
    const done = await computed(
      page,
      '<span class="check-mark check-mark--done">✓</span>',
      ".check-mark--done",
      ["width", "height", "background-color", "color"]
    );
    expect(done).toMatchObject({
      width: "16px",
      height: "16px",
      "background-color": "rgb(178, 34, 34)",
      color: "rgb(255, 255, 255)",
    });
    // (border-width read omitted — Chromium rounds 1.5px→1px in getComputedStyle
    // at DSF 2; the CSS is 1.5px per spec. The ring COLOUR is what distinguishes
    // current from later.)
    const current = await computed(
      page,
      '<span class="check-mark check-mark--current"></span>',
      ".check-mark--current",
      ["border-top-color", "border-top-style"]
    );
    expect(current).toMatchObject({
      "border-top-color": "rgb(178, 34, 34)",
      "border-top-style": "solid",
    });
    const later = await computed(
      page,
      '<span class="check-mark check-mark--later"></span>',
      ".check-mark--later",
      ["border-top-color"]
    );
    expect(later["border-top-color"]).toBe("rgb(216, 205, 180)");
  });
});

test.describe("Components — Containers & lists", () => {
  test("Card: paper, structure hairline, radius 16", async ({ page }) => {
    const c = await computed(page, '<div class="card">x</div>', ".card", [
      "background-color",
      "border-top-color",
      "border-radius",
    ]);
    expect(c).toMatchObject({
      "background-color": "rgb(255, 253, 249)",
      "border-top-color": "rgb(230, 221, 201)",
      "border-radius": "16px",
    });
  });

  test("Table header: 42px, table-head fill, sticky, 10px mono caps", async ({ page }) => {
    const c = await computed(page, '<div class="records-thead">Name</div>', ".records-thead", [
      "min-height",
      "background-color",
      "position",
      "font-size",
      "text-transform",
    ]);
    expect(c).toMatchObject({
      "min-height": "42px",
      "background-color": "rgb(248, 242, 228)",
      position: "sticky",
      "font-size": "10px",
      "text-transform": "uppercase",
    });
  });

  test("Shared row: 40px avatar (2px-ring, 12/600 initials) → a 60px row, 10/18, gap 14", async ({
    page,
  }) => {
    // Two rows so the measured (first) one isn't :last-child (which drops its divider).
    const html =
      '<div class="records-row"><span class="records-avatar">रघु</span><span class="records-name"><span class="records-name-primary">रघुनाथ मिश्र</span><span class="records-name-secondary">Raghunath Mishra</span></span></div><div class="records-row">next</div>';
    const row = await computed(page, html, ".records-row", [
      "padding",
      "gap",
      "border-bottom-color",
    ]);
    expect(row).toMatchObject({
      padding: "10px 18px",
      gap: "14px",
      "border-bottom-color": "rgb(244, 237, 224)",
    });
    const av = await computed(page, html, ".records-avatar", ["width", "height", "font-size"]);
    expect(av).toMatchObject({ width: "40px", height: "40px", "font-size": "12px" });
    const name = await computed(page, html, ".records-name-primary", ["font-size", "font-weight"]);
    expect(name).toMatchObject({ "font-size": "15px", "font-weight": "600" });
    const sub = await computed(page, html, ".records-name-secondary", ["font-size"]);
    expect(sub["font-size"]).toBe("13px");
  });

  test("Row — open state: red wash + name 700 #8b0000", async ({ page }) => {
    const html =
      '<div class="records-row open"><span class="records-name"><span class="records-name-primary">देवेन्द्र मिश्र</span></span></div>';
    const row = await computed(page, html, ".records-row.open", ["background-color"]);
    expect(row["background-color"]).toBe("rgb(255, 245, 245)");
    const name = await computed(page, html, ".records-name-primary", ["font-weight", "color"]);
    expect(name).toMatchObject({ "font-weight": "700", color: "rgb(139, 0, 0)" });
  });

  test("Preview block: quiet inset, radius 12, 13.5/1.55 strong-meta", async ({ page }) => {
    const c = await computed(
      page,
      '<div class="preview-block">This will change…</div>',
      ".preview-block",
      ["background-color", "border-radius", "padding", "font-size", "color"]
    );
    expect(c).toMatchObject({
      "background-color": "rgb(248, 242, 228)",
      "border-radius": "12px",
      padding: "14px 16px",
      "font-size": "13.5px",
      color: "rgb(85, 80, 74)",
    });
  });

  test("Panel footer: 68px, hairline top, space-between", async ({ page }) => {
    const c = await computed(
      page,
      '<div class="panel-footer"><span>Discard</span><span>Save</span></div>',
      ".panel-footer",
      ["min-height", "border-top-color", "justify-content"]
    );
    expect(c).toMatchObject({
      "min-height": "68px",
      "border-top-color": "rgb(230, 221, 201)",
      "justify-content": "space-between",
    });
  });
});

test.describe("Components — Overlays", () => {
  test("Dialog scrim: rgba(20,18,16,.42), centres its card", async ({ page }) => {
    const c = await computed(page, '<div class="dialog-scrim"></div>', ".dialog-scrim", [
      "background-color",
      "position",
      "place-items",
    ]);
    expect(c["background-color"]).toBe("rgba(20, 18, 16, 0.42)");
    expect(c.position).toBe("fixed");
    expect(c["place-items"]).toContain("center");
  });

  test("Dialog card: radius 22, 30/32, the dialog shadow", async ({ page }) => {
    const c = await computed(page, '<div class="dialog">x</div>', ".dialog", [
      "background-color",
      "border-radius",
      "padding",
      "box-shadow",
    ]);
    expect(c).toMatchObject({
      "background-color": "rgb(255, 253, 249)",
      "border-radius": "22px",
      padding: "30px 32px",
    });
    expect(c["box-shadow"]).toContain("32px 80px");
  });

  test("Dialog heading is Yatra 23; destructive eyebrow is deep red", async ({ page }) => {
    const heading = await computed(
      page,
      '<div class="dialog"><h2 class="dialog-heading">Remove?</h2></div>',
      ".dialog-heading",
      ["font-size", "font-family"]
    );
    expect(heading["font-size"]).toBe("23px");
    expect(heading["font-family"]).toContain("Yatra One");
    const eyebrow = await computed(
      page,
      '<div class="dialog dialog--danger"><span class="dialog-eyebrow">Cannot be undone</span></div>',
      ".dialog-eyebrow",
      ["color", "text-transform"]
    );
    expect(eyebrow).toMatchObject({ color: "rgb(139, 0, 0)", "text-transform": "uppercase" });
  });

  test("Consequence inset: red wash, #f0dcd8 border, radius 14", async ({ page }) => {
    const c = await computed(
      page,
      '<div class="consequence">Her record leaves this tree.</div>',
      ".consequence",
      ["background-color", "border-top-color", "border-radius", "font-size"]
    );
    expect(c).toMatchObject({
      "background-color": "rgb(255, 245, 245)",
      "border-top-color": "rgb(240, 220, 216)",
      "border-radius": "14px",
      "font-size": "13.5px",
    });
  });

  test("Toast: paper, hairline, radius 12, toast shadow; green glyph, amber on warn", async ({
    page,
  }) => {
    const c = await computed(
      page,
      '<div class="toast"><span class="toast-glyph">✧</span><div class="toast-body"><span class="toast-primary">Saved</span></div></div>',
      ".toast",
      ["background-color", "border-top-color", "border-radius", "box-shadow", "max-width"]
    );
    expect(c).toMatchObject({
      "background-color": "rgb(255, 253, 249)",
      "border-top-color": "rgb(230, 221, 201)",
      "border-radius": "12px",
      "max-width": "560px",
    });
    expect(c["box-shadow"]).toContain("12px 32px");
    const glyph = await computed(
      page,
      '<div class="toast"><span class="toast-glyph">✧</span></div>',
      ".toast-glyph",
      ["color"]
    );
    expect(glyph.color).toBe("rgb(31, 106, 62)");
    const warn = await computed(
      page,
      '<div class="toast toast--warn"><span class="toast-glyph">✧</span></div>',
      ".toast-glyph",
      ["color"]
    );
    expect(warn.color).toBe("rgb(138, 83, 0)");
  });

  test("Toast action is 13.5/600 red", async ({ page }) => {
    const c = await computed(
      page,
      '<div class="toast"><button class="toast-action">Undo</button></div>',
      ".toast-action",
      ["font-size", "font-weight", "color"]
    );
    expect(c).toMatchObject({
      "font-size": "13.5px",
      "font-weight": "600",
      color: "rgb(178, 34, 34)",
    });
  });
});

test.describe("Components — Empty & loading", () => {
  test("Empty state: dashed control border, radius 14; Yatra 27 heading; 16.5 lede", async ({
    page,
  }) => {
    const html =
      '<div class="empty-state"><h2 class="empty-heading">No marriages recorded yet</h2><p class="empty-lede">A household is two people…</p></div>';
    const box = await computed(page, html, ".empty-state", [
      "border-style",
      "border-top-color",
      "border-radius",
    ]);
    expect(box).toMatchObject({
      "border-style": "dashed",
      "border-top-color": "rgb(216, 205, 180)",
      "border-radius": "14px",
    });
    const h = await computed(page, html, ".empty-heading", ["font-size", "font-family"]);
    expect(h["font-size"]).toBe("27px");
    expect(h["font-family"]).toContain("Yatra One");
    const lede = await computed(page, html, ".empty-lede", ["font-size", "color"]);
    expect(lede).toMatchObject({ "font-size": "16.5px", color: "rgb(85, 80, 74)" });
  });

  test("Skeleton: quiet fill, shimmer 1.4s — never a spinner; 40px avatar at real row height", async ({
    page,
  }) => {
    const html =
      '<div class="skeleton-row"><div class="skeleton-avatar"></div><div class="skeleton-bar" style="width:120px"></div></div>';
    const avatar = await computed(page, html, ".skeleton-avatar", [
      "width",
      "height",
      "background-color",
      "animation-duration",
    ]);
    expect(avatar).toMatchObject({
      width: "40px",
      height: "40px",
      "background-color": "rgb(244, 237, 224)",
      "animation-duration": "1.4s",
    });
    const bar = await computed(page, html, ".skeleton-bar", ["height", "animation-name"]);
    expect(bar.height).toBe("11px");
    expect(bar["animation-name"]).toBe("skeleton-shimmer");
  });
});
