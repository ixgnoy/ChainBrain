// The phone (src/tokens.ts) and the console (web/src/index.css) carry one Neo-Kinetic palette. This keeps them in step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { c } from "../tokens";

const css = readFileSync(fileURLToPath(new URL("../../../web/src/index.css", import.meta.url)), "utf8");
const web = (name: string) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toUpperCase();

const PAIRS: [keyof typeof c, string][] = [
  ["canvas", "canvas"], ["card", "card"], ["fill", "fill"], ["line", "line"], ["tileStroke", "tile-stroke"],
  ["ink", "ink"], ["ink2", "ink2"], ["muted", "muted"], ["mutedOnCanvas", "muted-canvas"], ["faint", "faint"],
  ["vermillion", "vermillion"], ["vermillionInk", "vermillion-ink"], ["vermillionSoft", "vermillion-soft"],
  ["blue", "blue"], ["blueInk", "blue-ink"], ["blueSoft", "blue-soft"],
  ["green", "green"], ["greenInk", "green-ink"], ["greenSoft", "green-soft"],
  ["accent", "accent"], ["positive", "positive"], ["negative", "negative"], ["negativeSoft", "negative-soft"],
];

test("phone and console share the Neo-Kinetic palette", () => {
  for (const [phone, console] of PAIRS) assert.equal(web(console), c[phone].toUpperCase(), `${phone} vs --color-${console}`);
});

test("the DESIGN.md anchors are exact", () => {
  assert.equal(c.canvas, "#E2E5E8");
  assert.equal(c.ink, "#111215");
  assert.equal(c.vermillion, "#F04E23");
  assert.equal(c.blue, "#9DCAFF");
  assert.equal(c.green, "#22C55E");
  assert.equal(c.muted, "#777781");
  assert.equal(c.line, "#D3D3D1");
});
