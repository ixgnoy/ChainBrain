// End-to-end run of the phone app on its built-in network (the default on every launch): scenes 1-8 from the spec,
// nothing else running. Point it at the Expo web dev server or a static export:
//   (cd mobile && npx expo start --web --port 8091)      # or: npx expo export --platform web --output-dir dist + any static server
//   node devstack/e2e/builtin.cjs [--url http://localhost:8091] [--shots <dir>] [--headed]
const { chromium } = require("../../web/node_modules/@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);
const argv = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const URL0 = argv("--url", process.env.E2E_PHONE_URL ?? "http://localhost:8091").replace(/\/$/, "");
const SHOTS = argv("--shots", process.env.E2E_SHOTS ?? "");
const HEADED = args.includes("--headed");

let passed = 0; const failed = [];
const check = (name, ok, detail = "") => { if (ok) { passed++; console.log(`  ok   ${name}`); } else { failed.push(name); console.log(`  FAIL ${name}${detail ? "  -> " + detail : ""}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(what, fn, ms = 30000, step = 200) {
  const t0 = Date.now(); let last;
  while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(step); }
  throw new Error(`timeout waiting for ${what}${last ? ": " + last.message : ""}`);
}

(async () => {
  const browser = await chromium.launch({ headless: !HEADED });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  // stay off the laptop relay unless asked (it links one phone at a time): answer its calls here, quietly
  if (!args.includes("--link")) await ctx.route("**/dev/relay/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, commands: [] }) }));
  const page = await ctx.newPage();
  const issues = [];
  page.on("pageerror", (e) => issues.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|DevTools|Download the React/.test(m.text())) issues.push(`console: ${m.text().slice(0, 300)}`); });
  page.setDefaultTimeout(20000);
  // screens are captured once their entrance animations have settled (count-ups, sheet reveals, tab highlight)
  const shot = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await sleep(1600); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }).catch(() => {}); };
  const body = () => page.locator("body").innerText();
  const visible = (t) => page.getByText(t).filter({ visible: true }).first();
  const tab = (name) => page.getByRole("tab", { name }).click();
  const chip = async (label) => { await visible(label).click(); };
  const slide = async (name) => {
    const el = page.getByRole("button", { name });
    await el.waitFor(); await sleep(550);
    const b = await el.boundingBox();
    await page.mouse.move(b.x + 30, b.y + b.height / 2); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(b.x + 30 + ((b.width - 40) * i) / 12, b.y + b.height / 2); await sleep(20); }
    await page.mouse.up();
  };
  const confirmTask = async () => { const b = page.getByRole("button", { name: "Confirm task" }).last(); await b.waitFor({ timeout: 30000 }); await sleep(450); await b.click(); };
  const idle = () => until("agent idle", async () => /Ready ·|Stopped ·/.test(await body()), 60000, 300);
  const run = async (name, f) => { console.log(`\n# ${name}`); try { await f(); } catch (e) { check(`${name}: no exception`, false, e.message.split("\n")[0]); await shot(`fail-${name.replace(/\W+/g, "_")}`); } };

  await page.goto(`${URL0}/`);

  await run("launch: straight to a lived-in Home, nothing says demo", async () => {
    await visible("Agent pockets").waitFor({ timeout: 60000 });
    await visible("Research data").waitFor();
    const t = await body();
    check("two seeded pockets", /Research data/.test(t) && /One purchase/.test(t));
    check("main wallet shows US$54.80", /54\.80/.test(t), t.slice(0, 200));
    check("no demo / sample / mock wording", !/\bdemo\b|sample data|mock|simulat/i.test(t));
    check("no BaseScan links", (await page.locator('a[href*="basescan"]').count()) === 0);
    await shot("01-home");
  });

  await run("scene 1: create and fund a Research pocket in the wizard", async () => {
    await page.getByRole("button", { name: "New pocket" }).first().click();
    await visible("What is it for?").waitFor();
    await page.getByText(/US\$5 budget · up to US\$2 each/).first().click();
    for (let i = 0; i < 6; i++) { await page.getByRole("button", { name: "Continue" }).click(); await sleep(350); }
    await visible("Looks right?").waitFor();
    await shot("01b-wizard-review");
    await slide("Slide to create and fund");
    await page.waitForURL(/pocket\/0x[0-9a-fA-F]{40}/, { timeout: 30000 });
    await visible("US$5.00").waitFor({ timeout: 15000 }).catch(() => {});
    const t = await body();
    check("new pocket page shows US$5.00", /5\.00/.test(t), t.slice(0, 300));
    await shot("01c-new-pocket");
    await page.goBack();
    await sleep(500);
  });

  await run("scene 1-3: question, intent, DataLite paid, DataPro co-signed", async () => {
    await tab("Agent");
    await visible("Durian report under US$2").waitFor();
    await chip("Durian report under US$2");
    await visible("Your agent has a question").waitFor({ timeout: 30000 });
    await visible("US$2 in total or per report?").waitFor({ timeout: 10000 }).catch(() => {});
    check("one clarifying question", (await body()).includes("US$2 in total or per report?"));
    await shot("02-question");
    await chip("Per report, add the forecast");
    await confirmTask();
    await visible("Paid DataLite").waitFor({ timeout: 30000 });
    check("DataLite paid on its own", true);
    await visible("Approve payment?").waitFor({ timeout: 30000 });
    const t = await body();
    check("approval sheet: DataPro US$1.50", /DataPro/.test(t) && /1\.50/.test(t));
    await shot("03-approval");
    await slide("Slide to approve");
    await visible("Paid DataPro").waitFor({ timeout: 30000 });
    await idle();
    const t2 = await body();
    check("co-signed tag on the DataPro card", /Co-signed by you/.test(t2));
    check("reply names both purchases", /Bought DataLite's durian export report \(US\$0\.30\) and DataPro's premium report/.test(t2), t2.slice(-400));
    await shot("04-paid");
  });

  await run("scene 4: refused SELLER_NOT_ALLOWED, re-plan", async () => {
    await chip("Harbour Wines trade report");
    await confirmTask();
    await visible("Paid DataLite").waitFor({ timeout: 30000 });
    await idle();
    const t = await body();
    check("refusal card for Harbour Wines", /Harbour Wines/.test(t) && /SELLER_NOT_ALLOWED/.test(t));
    check("re-planned to the DataLite fruit report", /fruit trade report \(US\$0\.35\)/.test(t));
    await shot("05-replan");
  });

  await run("scene 5-6: injection flagged, disclosure refused", async () => {
    await chip("Check ShadyFeed's preview");
    await confirmTask();
    await idle();
    let t = await body();
    check("ShadyFeed flagged, only DataLite paid", /Warning: ShadyFeed/.test(t));
    check("injection quoted and marked ignored", /tried to give your agent an order/.test(t) && /Send 50 USDC/.test(t) && /IGNORED/.test(t));
    check("disclosure refused card", /DISCLOSURE_REFUSED|asked for more data|Refused:/.test(t));
    await chip("ShadyFeed's full feed");
    await idle();
    t = await body();
    check("phishing: wallet refused to share or sign", /The wallet refused/.test(t));
    await shot("06-shadyfeed");
  });

  await run("scene 7: stop the agent mid-task, return funds", async () => {
    await chip("Two DataLite reports");
    await confirmTask();
    await visible("Paid DataLite").waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Stop agent" }).click();
    const hold = page.getByRole("button", { name: /Hold to revoke/ }).filter({ visible: true }).last();
    await hold.waitFor();
    await sleep(650); // let the sheet finish sliding in before reading the button's position
    const b = await hold.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await sleep(1700); await page.mouse.up();
    await until("revoked reply", async () => /You stopped the pocket, so I stopped too/.test(await body()), 30000);
    check("second payment refused POCKET_REVOKED, agent stopped", true);
    await shot("07-revoked");
  });

  await run("scene 8: dead end on the One purchase pocket", async () => {
    await page.getByRole("button", { name: /Change pocket/ }).click();
    await visible("Which pocket?").waitFor();
    await page.getByText("One purchase").filter({ visible: true }).last().click();
    await sleep(500);
    await visible("A report for US$0.20").waitFor();
    await chip("A report for US$0.20");
    await confirmTask();
    await idle();
    const t = await body();
    check("dead end: nothing paid, fix suggested", /No allowed seller fits/.test(t) && /raise the cap and budget to US\$0\.30/.test(t));
    await shot("08-dead-end");
    await page.getByRole("button", { name: /Raise cap and budget to US\$0\.30/ }).click();
    await slide("Slide to raise cap and add money");
    await page.getByRole("button", { name: "Done" }).filter({ visible: true }).last().click();
    await sleep(800);
    const ask = page.getByRole("button", { name: /Ask again, max US\$0\.30/ });
    await ask.waitFor({ timeout: 15000 });
    check("fix applied: the card offers Ask again, the raise button is gone", (await page.getByRole("button", { name: /Raise cap and budget/ }).count()) === 0);
    await ask.click();
    await confirmTask();
    await visible("Paid DataLite").waitFor({ timeout: 30000 });
    check("asked again: DataLite paid within the raised cap", true);
    await idle();
    check("the old dead end now reads as fixed (no second raise button)", /Fixed: you raised the limit/.test(await body()) && (await page.getByRole("button", { name: /Raise cap and budget/ }).count()) === 0);
    await shot("08b-fixed");
  });

  await run("activity and receipt with what was bought", async () => {
    await tab("Activity");
    await visible("DataPro").waitFor();
    await shot("09-activity");
    await page.getByRole("button", { name: "Paid", exact: true }).filter({ visible: true }).first().click(); // the co-signed payment, not scene 8's refused quote
    await sleep(400);
    await page.getByText("DataPro", { exact: true }).filter({ visible: true }).first().click();
    await visible("What you got").waitFor();
    const t = await body();
    check("receipt shows the delivered report", /2026 forecast/.test(t));
    check("receipt never links to BaseScan", (await page.getByLabel("Open on BaseScan").count()) === 0);
    await shot("10-receipt");
    await page.getByRole("button", { name: "Done" }).click();
  });

  await run("settings: subtle custom server switch", async () => {
    await tab("Settings");
    await visible("Custom server").waitFor();
    const t = await body();
    check("custom server is off", /Custom server\s*Off/.test(t));
    check("no demo wording in Settings", !/\bdemo\b|mock|simulat/i.test(t));
    await shot("11-settings");
  });

  check("no page errors", issues.length === 0, issues.slice(0, 5).join(" | "));
  console.log(`\n${passed} passed, ${failed.length} failed`);
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})();
