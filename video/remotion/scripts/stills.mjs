// Render many stills of the Main composition with one bundle (storyboards, frame checks).
// usage (from video/remotion): node scripts/stills.mjs <out_dir> <scale> <t1> <t2> ...   (t = seconds)
// Each still is saved as <out_dir>/<t>.jpg.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [outDir, scaleArg, ...times] = process.argv.slice(2);
if (!outDir || !times.length) {
  console.error("usage: node scripts/stills.mjs <out_dir> <scale> <t1> <t2> ...");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });
const composition = await selectComposition({ serveUrl, id: "Main", inputProps: {} });
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(t) * composition.fps));
  const output = path.join(outDir, `${t}.jpg`);
  await renderStill({ composition, serveUrl, output, frame, scale: Number(scaleArg) || 0.5, imageFormat: "jpeg", jpegQuality: 88, chromiumOptions: { gl: "angle" }, logLevel: "error" });
  console.log("still", t, "->", output);
}
