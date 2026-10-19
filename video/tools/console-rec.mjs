// Record a browser page at 1920x1080 through Chrome's screencast (crisp JPEG frames, timed), then encode an MP4.
// usage: node tools/console-rec.mjs <shot.json> <out.mp4>
//   shot.json: { "url": "...", "steps": [ {"wait": 2}, {"click": "Assume the AI is fooled"}, {"scroll": 400}, {"probe": "name"} ] }
//   "probe" saves a still to footage/probe/<name>.png (no recording needed for that).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
// the repo's own Playwright (pnpm store, from the web console's e2e tests)
const pw = require(path.join(repo, "node_modules/.pnpm/playwright@1.64.0/node_modules/playwright"));

const [shotFile, out] = process.argv.slice(2);
const shot = JSON.parse(fs.readFileSync(shotFile, "utf8"));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const browser = await pw.chromium.launch({ headless: true });
const vp = shot.viewport ?? { width: 1920, height: 1080 };
const dpr = shot.dpr ?? 1;
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr });
const page = await ctx.newPage();
await page.goto(shot.url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout((shot.settle ?? 3) * 1000);

const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  frames.push({ t: metadata.timestamp, data });
  try { await cdp.send("Page.screencastFrameAck", { sessionId }); } catch {}
});
const recording = !!out;
if (recording) await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: Math.round(vp.width * dpr), maxHeight: Math.round(vp.height * dpr), everyNthFrame: 1 });
const t0 = Date.now() / 1000;

for (const s of shot.steps) {
  if (s.wait) await page.waitForTimeout(s.wait * 1000);
  if (s.click) {
    const loc = page.getByText(s.click, { exact: s.exact ?? false }).first();
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await loc.hover().catch(() => {});
    await page.waitForTimeout(350);
    await loc.click({ timeout: 8000 }).catch((e) => console.error("click failed:", s.click, e.message.split("\n")[0]));
  }
  if (s.role) {
    await page.getByRole(s.role.role, { name: s.role.name }).first().click({ timeout: 8000 }).catch((e) => console.error("role click failed", e.message.split("\n")[0]));
  }
  if (s.scroll !== undefined) await page.evaluate(([y, smooth]) => window.scrollTo({ top: y, behavior: smooth ? "smooth" : "instant" }), [s.scroll, s.smooth ?? true]);
  if (s.scrollTo) await page.getByText(s.scrollTo).first().evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" })).catch(() => {});
  if (s.goto) { await page.goto(s.goto, { waitUntil: "domcontentloaded" }); }
  if (s.eval) await page.evaluate(s.eval);
  if (s.probe) {
    fs.mkdirSync(path.join(root, "footage/probe"), { recursive: true });
    await page.screenshot({ path: path.join(root, "footage/probe", `${s.probe}.png`) });
    console.log("probe", s.probe);
  }
}
if (recording) {
  await page.waitForTimeout(400);
  await cdp.send("Page.stopScreencast");
  const end = Date.now() / 1000;
  const dir = fs.mkdtempSync(path.join(root, "footage/.frames-"));
  const list = [];
  frames.forEach((f, i) => {
    const name = path.join(dir, `${String(i).padStart(5, "0")}.jpg`);
    fs.writeFileSync(name, Buffer.from(f.data, "base64"));
    const next = i + 1 < frames.length ? frames[i + 1].t : f.t + Math.max(0.5, end - f.t);
    list.push(`file '${name}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  list.push(`file '${path.join(dir, `${String(frames.length - 1).padStart(5, "0")}.jpg`)}'`);
  fs.writeFileSync(path.join(dir, "list.txt"), list.join("\n"));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "14", "-preset", "slow", out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`saved ${out}: ${frames.length} frames over ${(end - t0).toFixed(1)} s`);
}
await browser.close();
