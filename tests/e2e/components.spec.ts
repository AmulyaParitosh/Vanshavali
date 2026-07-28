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
