import { test, expect, type Page } from "@playwright/test";

/**
 * Spec 00 — Foundations, system level. Grows to cover the shell + conventions;
 * for now it pins the token layer (§08 / Vanshavali Style Guide) as the repo's
 * theme values, and the heritage cascade that integration contract §4 depends on.
 *
 * Custom properties are read with getComputedStyle on <html>; the browser returns
 * their specified value verbatim (tokens are opaque strings), so hex/px/number
 * values compare exactly and composite values (shadows, easing, url) by substring.
 */

// The token/asset layer is global — test it signed out, independent of the seed.
test.use({ storageState: { cookies: [], origins: [] } });

async function tokens(page: Page, names: string[]): Promise<Record<string, string>> {
  return page.evaluate((ns) => {
    const cs = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const n of ns) out[n] = cs.getPropertyValue(n).trim();
    return out;
  }, names);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("brand, surface, line and text colours match the style guide", async ({ page }) => {
  const t = await tokens(page, [
    "--color-red",
    "--color-red-deep",
    "--color-red-wash",
    "--color-marigold",
    "--color-green",
    "--surface-desk",
    "--surface-canvas",
    "--surface-paper",
    "--surface-tablehead",
    "--surface-quiet",
    "--surface-chrome",
    "--line-structure",
    "--line-control",
    "--line-inner",
    "--line-row",
    "--text-primary",
    "--text-rail",
    "--text-strong",
    "--text-prose",
    "--text-meta",
    "--text-absent",
  ]);
  expect(t).toMatchObject({
    "--color-red": "#b22222",
    "--color-red-deep": "#8b0000",
    "--color-red-wash": "#fff5f5",
    "--color-marigold": "#ff8c00",
    "--color-green": "#2e8b57",
    "--surface-desk": "#e6e0d2",
    "--surface-canvas": "#fdf5e6",
    "--surface-paper": "#fffdf9",
    "--surface-tablehead": "#f8f2e4",
    "--surface-quiet": "#f4ede0",
    "--surface-chrome": "#1a1a1a",
    "--line-structure": "#e6ddc9",
    "--line-control": "#d8cdb4",
    "--line-inner": "#f0e9da",
    "--line-row": "#f4ede0",
    "--text-primary": "#1a1a1a",
    "--text-rail": "#33302b",
    "--text-strong": "#55504a",
    "--text-prose": "#6b6455",
    "--text-meta": "#8a8377",
    "--text-absent": "#a89f8c",
  });
});

test("the eight portrait tints are the guide values, in order", async ({ page }) => {
  const t = await tokens(page, [
    "--tint-1",
    "--tint-2",
    "--tint-3",
    "--tint-4",
    "--tint-5",
    "--tint-6",
    "--tint-7",
    "--tint-8",
  ]);
  expect(Object.values(t)).toEqual([
    "#8a5b3c",
    "#7c9bb5",
    "#c58fa5",
    "#6f9a7b",
    "#c9885a",
    "#96849f",
    "#5f9295",
    "#b58f5e",
  ]);
});

test("the full type ladder is present in px", async ({ page }) => {
  const t = await tokens(page, [
    "--fs-42",
    "--fs-32",
    "--fs-30",
    "--fs-27",
    "--fs-23",
    "--fs-22",
    "--fs-20",
    "--fs-19",
    "--fs-18",
    "--fs-17",
    "--fs-165",
    "--fs-16",
    "--fs-155",
    "--fs-15",
    "--fs-145",
    "--fs-14",
    "--fs-135",
    "--fs-13",
    "--fs-125",
    "--fs-12",
    "--fs-115",
    "--fs-11",
    "--fs-105",
    "--fs-10",
    "--fs-9",
  ]);
  expect(t).toMatchObject({
    "--fs-42": "42px",
    "--fs-30": "30px",
    "--fs-27": "27px",
    "--fs-23": "23px",
    "--fs-22": "22px",
    "--fs-20": "20px",
    "--fs-165": "16.5px",
    "--fs-155": "15.5px",
    "--fs-145": "14.5px",
    "--fs-135": "13.5px",
    "--fs-125": "12.5px",
    "--fs-115": "11.5px",
    "--fs-105": "10.5px",
    "--fs-10": "10px",
    "--fs-9": "9px",
  });
});

test("the twelve-step radius scale matches", async ({ page }) => {
  const t = await tokens(page, [
    "--radius-pill",
    "--radius-circle",
    "--radius-26",
    "--radius-22",
    "--radius-18",
    "--radius-16",
    "--radius-14",
    "--radius-12",
    "--radius-10",
    "--radius-9",
    "--radius-8",
    "--radius-4",
  ]);
  expect(Object.values(t)).toEqual([
    "999px",
    "50%",
    "26px",
    "22px",
    "18px",
    "16px",
    "14px",
    "12px",
    "10px",
    "9px",
    "8px",
    "4px",
  ]);
});

test("the seven shadows carry their exact values", async ({ page }) => {
  const t = await tokens(page, [
    "--shadow-frame",
    "--shadow-primary",
    "--shadow-node",
    "--shadow-inspector",
    "--shadow-focus",
    "--shadow-pill",
    "--shadow-dialog",
  ]);
  expect(t["--shadow-frame"]).toContain("0 24px 64px");
  expect(t["--shadow-primary"]).toContain("0 2px 8px");
  expect(t["--shadow-primary"]).toContain("178, 34, 34");
  expect(t["--shadow-node"]).toContain("0 3px 12px");
  expect(t["--shadow-inspector"]).toContain("-8px 0 24px");
  expect(t["--shadow-focus"]).toBe("0 0 0 3px rgba(178, 34, 34, 0.1)");
  expect(t["--shadow-pill"]).toContain("0 2px 10px");
  expect(t["--shadow-dialog"]).toContain("0 32px 80px");
});

test("shell metrics and the product motion tokens match", async ({ page }) => {
  const t = await tokens(page, [
    "--shell-chrome-h",
    "--shell-rail-w",
    "--shell-inspector-w",
    "--ease",
    "--dur-panel",
    "--dur-dialog",
    "--dur-canvas",
  ]);
  expect(t["--shell-chrome-h"]).toBe("60px");
  expect(t["--shell-rail-w"]).toBe("232px");
  expect(t["--shell-inspector-w"]).toBe("384px");
  expect(t["--ease"]).toBe("cubic-bezier(0.32, 0.72, 0, 1)");
  expect(t["--dur-panel"]).toBe("180ms");
  expect(t["--dur-dialog"]).toBe("140ms");
  expect(t["--dur-canvas"]).toBe("320ms");
});

test("the three painted assets are served at their spec paths", async ({ page }) => {
  for (const path of ["/banner.jpg", "/node_border_320.png", "/paper_texture.jpg"]) {
    const res = await page.request.get(path);
    expect(res.ok(), `${path} served`).toBeTruthy();
    const body = await res.body();
    expect(body.byteLength, `${path} is a real, non-empty file`).toBeGreaterThan(10000);
  }
});

test("the paper wash is drawn from paper_texture.jpg", async ({ page }) => {
  const bg = await page.evaluate(() => getComputedStyle(document.body, "::before").backgroundImage);
  expect(bg).toContain("paper_texture.jpg");
});

test("heritage defaults to full, and plain drops rings, gradient and paper", async ({ page }) => {
  const full = await tokens(page, [
    "--heritage-paper",
    "--heritage-paper-tree",
    "--ornament-ring",
    "--ornament-bar",
    "--heritage-border",
  ]);
  expect(full["--heritage-paper"]).toBe("0.05");
  expect(full["--heritage-paper-tree"]).toBe("0.07");
  expect(full["--ornament-ring"]).toContain("node_border_320.png");
  expect(full["--ornament-bar"]).toContain("linear-gradient");
  expect(full["--heritage-border"]).toBe("#e8c9c6");

  await page.evaluate(() => document.documentElement.setAttribute("data-heritage", "restrained"));
  const restrained = await tokens(page, ["--heritage-paper", "--ornament-bar", "--ornament-ring"]);
  expect(restrained["--heritage-paper"]).toBe("0.025");
  expect(restrained["--ornament-bar"]).toBe("#b22222");
  expect(restrained["--ornament-ring"]).toContain("node_border_320.png");

  await page.evaluate(() => document.documentElement.setAttribute("data-heritage", "plain"));
  const plain = await tokens(page, [
    "--heritage-paper",
    "--heritage-paper-tree",
    "--ornament-ring",
    "--ornament-bar",
  ]);
  expect(plain["--heritage-paper"]).toBe("0");
  expect(plain["--heritage-paper-tree"]).toBe("0");
  expect(plain["--ornament-ring"]).toBe("none");
  expect(plain["--ornament-bar"]).toBe("#e6ddc9");
});
