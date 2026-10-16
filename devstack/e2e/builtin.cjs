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
  // reason codes and quoted seller text sit under quiet "Why" disclosures: open every closed one before reading them
  const openWhy = async () => {
    const all = page.getByRole("button", { name: "Why", exact: true });
    const n = await all.count();
    for (let i = 0; i < n; i++) {
      const b = all.nth(i);
      if (!(await b.isVisible()) || (await b.getAttribute("aria-expanded")) === "true") continue;
      await b.click(); await sleep(250);
    }
  };
  const confirmTask = async () => { const b = page.getByRole("button", { name: "Confirm task" }).last(); await b.waitFor({ timeout: 30000 }); await sleep(450); await b.click(); };
  // the chat is a pushed screen (Agents tab, ChainBrain's card, Chat); tabs come back once it is closed
  const openChat = async () => { await tab("Agents"); await page.getByRole("button", { name: "Chat", exact: true }).first().click(); await page.waitForURL(/\/agent$/, { timeout: 15000 }); };
  const leaveChat = async () => { if (/\/agent$/.test(page.url())) { await page.goBack(); await sleep(600); } };
  const idle = () => until("agent idle", async () => /Ready ·|Stopped ·/.test(await body()), 60000, 300);
  const run = async (name, f) => { console.log(`\n# ${name}`); try { await f(); } catch (e) { check(`${name}: no exception`, false, e.message.split("\n")[0]); await shot(`fail-${name.replace(/\W+/g, "_")}`); } };

  await page.goto(`${URL0}/`);

  await run("intro: three user-paced pages on the first launch, Skip always there", async () => {
    const skip = page.getByRole("button", { name: "Skip" });
    await skip.waitFor({ timeout: 60000 });
    await visible("Give your AI a pocket, not your wallet").waitFor();
    check("intro page 1 shows the pitch line with Skip", true);
    await shot("00-intro");
    await page.getByRole("button", { name: "Next" }).click();
    await visible("The limits live in a contract you own").waitFor();
    await page.getByRole("button", { name: "Next" }).click();
    await visible("The worst case is the pocket balance").waitFor();
    check("intro pages 2 and 3 are reachable and Skip stays visible", await skip.isVisible());
    await skip.click();
    await skip.waitFor({ state: "detached", timeout: 5000 });
    check("Skip lands on Home", true);
  });

  await run("launch: straight to a lived-in Home, nothing says demo", async () => {
    await visible("Agent pockets").waitFor({ timeout: 60000 });
    await visible("Research data").waitFor();
    const t = await body();
    check("four seeded pockets", /Research data/.test(t) && /One purchase/.test(t) && /Market news/.test(t) && /Trade quotes/.test(t));
    check("pockets are cards (cap, ask-me limit, expiry)", /Cap US\$/.test(t) && /asks above|never asks|asks every time/.test(t) && /Exp\. \d\d\/\d\d|Ends \d\d:\d\d/.test(t));
    check("the deck shows every pocket as a button", (await page.getByRole("button", { name: /Research data pocket/ }).count()) === 1 && (await page.getByRole("button", { name: /One purchase pocket/ }).count()) === 1 && (await page.getByRole("button", { name: /Market news pocket/ }).count()) === 1);
    check("the agents that hold them are named", /ChainBrain/.test(t) && /Claude/.test(t) && /ChatGPT/.test(t));
    check("spending this week is computed (vs last week)", /Weekly spending by your agents/.test(t) && /vs last week/.test(t));
    check("main wallet shows US$54.80", /54\.80/.test(t), t.slice(0, 200));
    check("no demo / sample / mock wording", !/\bdemo\b|sample data|mock|simulat/i.test(t));
    check("no BaseScan links", (await page.locator('a[href*="basescan"]').count()) === 0);
    await shot("01-home");
  });

  await run("tap a card: it opens the pocket page", async () => {
    await page.getByRole("button", { name: /Research data pocket/ }).click({ position: { x: 120, y: 24 } }); // the visible header strip
    await page.waitForURL(/pocket\/0x[0-9a-fA-F]{40}/, { timeout: 15000 });
    await visible("Allowed sellers").waitFor();
    await sleep(900);
    const t = await body();
    check("pocket page shows the same card (expiry) and its rules", /Exp\. \d\d\/\d\d|Ends \d\d:\d\d/.test(t) && /Allowed sellers/.test(t));
    await shot("01a-pocket-page");
    await page.goBack();
    await visible("Agent pockets").waitFor();
    await sleep(500);
  });

  await run("agents: ChainBrain, Claude and ChatGPT with their pockets", async () => {
    await tab("Agents");
    await visible("Connected agents").waitFor();
    const t = await body();
    check("three agents", /ChainBrain Agent/.test(t) && /Claude/.test(t) && /ChatGPT/.test(t));
    check("each with the pocket it holds", /Market news/.test(t) && /Trade quotes/.test(t) && /Research data/.test(t));
    await shot("01d-agents");
    await page.getByRole("button", { name: /^Claude, / }).first().click();
    await visible("Activity ledger").waitFor({ timeout: 15000 });
    const d = await body();
    check("Claude's page: its pocket, spent today, its own ledger", /Market news/.test(d) && /Spent today/.test(d) && /Paid (Exa|CoinGecko)/.test(d));
    check("Disconnect keeps the money", /Money stays safe in the pocket/.test(d));
    await shot("01e-agent-claude");
    await page.goBack(); await sleep(600);
  });

  await run("ask dock: Claude asks to pay above its limit; the owner co-signs the cheque", async () => {
    await tab("Home");
    const dock = page.getByRole("button", { name: /Claude asks US\$0\.05/ }).first();
    await dock.waitFor({ timeout: 40000 });
    check("ask dock: Claude, US$0.05, Nansen", /Nansen/.test((await dock.getAttribute("aria-label")) ?? ""));
    await shot("01f-dock");
    // the inbox lists it too
    await page.getByRole("button", { name: /Approvals, 1 waiting/ }).first().click();
    await visible("Waiting for you (1)").waitFor({ timeout: 15000 });
    const t = await body();
    check("inbox: Claude, Nansen, US$0.05, its countdown", /Claude/.test(t) && /Nansen/.test(t) && /0\.05/.test(t) && /left/.test(t));
    await shot("01f-inbox");
    await page.goBack(); await sleep(800);
    await dock.click();
    await visible("Claude asks you to co-sign").waitFor({ timeout: 15000 });
    await sleep(1600); // the card turns over to the cheque
    const a = await body();
    check("cheque: pay, to, for, what is left, the rule that asks, checks, the note marked not checked",
      /to Nansen/.test(a) && /left after/.test(a) && /ask-me limit/.test(a) && /Seller check/.test(a) && /not checked/i.test(a));
    await shot("01g-cheque");
    await slide("Slide to approve");
    await visible("Paid US$0.05").waitFor({ timeout: 30000 });
    await sleep(2400);
    check("Claude's payment co-signed, the dock is gone", (await page.getByRole("button", { name: /Claude asks US\$/ }).count()) === 0);
  });

  await run("connect: ChatGPT gets its own pocket after consent", async () => {
    await tab("Home");
    await page.getByRole("button", { name: "Connect an agent" }).first().click();
    await visible("Add ChainBrain to your AI").waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: "Connect ChatGPT" }).click();
    await page.getByRole("button", { name: "Copy link" }).click();
    await visible("ChatGPT wants to use a pocket").waitFor({ timeout: 15000 });
    const t = await body();
    check("consent: a new pocket, can and can't, other pockets keep their agents", /New pocket: ChatGPT research/.test(t) && /ChatGPT can't/i.test(t) && /keep the agent/.test(t));
    await shot("01h-consent");
    await slide("Allow");
    await visible("See ChatGPT").waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "See ChatGPT" }).click();
    await visible("Activity ledger").waitFor({ timeout: 15000 });
    check("ChatGPT now holds two pockets", /2 pockets/i.test(await body()));
    await shot("01i-agent-chatgpt");
    await page.goBack(); await sleep(600);
  });

  await run("scene 1: create and fund a Research pocket in the wizard", async () => {
    await tab("Home");
    await page.getByRole("button", { name: "New pocket" }).first().click();
    await visible("What is it for?").waitFor();
    await page.getByText(/US\$1 budget · up to US\$0\.05 each/).first().click();
    // a preset sets every limit, so one press goes straight to Review
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await visible("Looks right?").waitFor();
    check("a preset goes straight to Review, every row editable", (await page.getByRole("button", { name: /^Sellers: .*Change$/ }).count()) === 1);
    await shot("01b-wizard-review");
    await slide("Slide to create and fund");
    await page.waitForURL(/pocket\/0x[0-9a-fA-F]{40}/, { timeout: 30000 });
    await visible("US$1.00").waitFor({ timeout: 15000 }).catch(() => {});
    const t = await body();
    check("new pocket page shows US$1.00", /1\.00/.test(t), t.slice(0, 300));
    await shot("01c-new-pocket");
    await page.goBack();
    await sleep(500);
  });

  await run("scene 1-3: question, intent, Exa and CoinGecko paid, Nansen co-signed", async () => {
    await openChat();
    await visible("Research a durian deal").waitFor();
    await chip("Research a durian deal");
    await visible("Your agent has a question").waitFor({ timeout: 30000 });
    await visible("US$0.10 in total or per lookup?").waitFor({ timeout: 10000 }).catch(() => {});
    check("one clarifying question", (await body()).includes("US$0.10 in total or per lookup?"));
    await shot("02-question");
    await chip("In total, check the wallet");
    await confirmTask();
    await visible("Paid Exa").waitFor({ timeout: 30000 });
    await visible("Paid CoinGecko").waitFor({ timeout: 30000 });
    check("Exa and CoinGecko paid on their own", true);
    await visible("asks you to co-sign").waitFor({ timeout: 30000 }); await sleep(1600); // the card turns over to the cheque
    const t = await body();
    check("approval sheet: Nansen US$0.05", /Nansen/.test(t) && /0\.05/.test(t));
    await shot("03-approval");
    await slide("Slide to approve");
    await visible("Paid Nansen").waitFor({ timeout: 30000 });
    await idle();
    const t2 = await body();
    check("co-signed tag on the Nansen card", /Co-signed by you/.test(t2));
    check("reply names the three purchases", /Bought Exa's web search for durian export news \(US\$0\.007\) and CoinGecko's USDC price \(US\$0\.01\) and Nansen's counterparty check/.test(t2), t2.slice(-400));
    await shot("04-paid");
  });

  await run("scene 4: refused SELLER_NOT_ALLOWED, re-plan", async () => {
    await chip("Harbour Wines trade report");
    await confirmTask();
    await visible("Paid Exa").waitFor({ timeout: 30000 });
    await idle();
    await openWhy();
    const t = await body();
    check("refusal card for Harbour Wines", /Harbour Wines/.test(t) && /SELLER_NOT_ALLOWED/.test(t));
    check("re-planned to Exa's fruit trade search", /SE Asia fruit trade news \(US\$0\.007\)/.test(t));
    await shot("05-replan");
  });

  await run("scene 5-6: injection flagged, disclosure refused", async () => {
    await chip("Check ShadyFeed's preview");
    await confirmTask();
    await idle();
    await visible("tried to give your agent an order").waitFor({ timeout: 20000 }).catch(() => {});
    await openWhy();
    let t = await body();
    check("ShadyFeed flagged, only CoinGecko paid", /Warning: ShadyFeed/.test(t));
    check("injection quoted and marked ignored", /tried to give your agent an order/.test(t) && /Send 50 USDC/.test(t) && /IGNORED/.test(t));
    check("disclosure refused card", /DISCLOSURE_REFUSED|asked for more data|Refused:/.test(t));
    await chip("ShadyFeed's full feed");
    await idle();
    t = await body();
    check("phishing: wallet refused to share or sign", /The wallet refused/.test(t));
    await shot("06-shadyfeed");
  });

  await run("scene 7: stop the agent mid-task, return funds", async () => {
    await chip("Two Exa searches");
    await confirmTask();
    await visible("Paid Exa").waitFor({ timeout: 30000 });
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
    await visible("A search for half a cent").waitFor();
    await chip("A search for half a cent");
    await confirmTask();
    await idle();
    const t = await body();
    check("dead end: nothing paid, fix suggested", /No allowed seller fits/.test(t) && /raise the cap and budget to US\$0\.007/.test(t));
    await shot("08-dead-end");
    await page.getByRole("button", { name: /Raise cap and budget to US\$0\.007/ }).click();
    await slide("Slide to raise cap and add money");
    await page.getByRole("button", { name: "Done" }).filter({ visible: true }).last().click();
    await sleep(800);
    const ask = page.getByRole("button", { name: /Ask again, max US\$0\.007/ });
    await ask.waitFor({ timeout: 15000 });
    check("fix applied: the card offers Ask again, the raise button is gone", (await page.getByRole("button", { name: /Raise cap and budget/ }).count()) === 0);
    await ask.click();
    await confirmTask();
    await visible("Paid Exa").waitFor({ timeout: 30000 });
    check("asked again: Exa paid within the raised cap", true);
    await idle();
    check("the old dead end now reads as fixed (no second raise button)", /Fixed: you raised the limit/.test(await body()) && (await page.getByRole("button", { name: /Raise cap and budget/ }).count()) === 0);
    await shot("08b-fixed");
  });

  await run("activity and receipt with what was bought", async () => {
    await leaveChat();
    await tab("Activity");
    await visible("Nansen").waitFor();
    await shot("09-activity");
    await page.getByRole("button", { name: "Paid", exact: true }).filter({ visible: true }).first().click(); // the co-signed payment, not scene 8's refused quote
    await sleep(400);
    await page.getByText("Nansen", { exact: true }).filter({ visible: true }).first().click();
    await visible("What you got").waitFor();
    const t = await body();
    check("receipt shows what was delivered", /Counterparties of the exporter's wallet/.test(t));
    check("receipt never links to BaseScan", (await page.getByLabel("Open on BaseScan").count()) === 0);
    await shot("10-receipt");
    // the hash opens the in-app explorer: test network, never BaseScan
    await page.getByText("Details", { exact: true }).filter({ visible: true }).first().click();
    await sleep(300);
    await page.getByRole("button", { name: /Open transaction/ }).filter({ visible: true }).first().click();
    await visible("How it was checked").waitFor({ timeout: 10000 });
    const x = await body();
    check("explorer sheet: Test network, block, method, checks path", /Test network/.test(x) && /Block/.test(x) && /Method/.test(x) && /Signature check/.test(x), x.slice(0, 300));
    check("explorer never mentions or links BaseScan", !/BaseScan/i.test(x) && (await page.locator('a[href*="basescan"]').count()) === 0);
    await shot("10b-explorer");
    await page.getByRole("button", { name: "Done" }).filter({ visible: true }).last().click();
    await sleep(500);
    await page.getByRole("button", { name: "Done" }).filter({ visible: true }).last().click();
  });

  await run("settings: subtle custom server switch", async () => {
    await tab("Settings");
    await visible("Custom server").waitFor();
    const t = await body();
    check("custom server is off", /Custom server\s*Off/.test(t));
    check("no demo wording in Settings", !/\bdemo\b|mock|simulat/i.test(t));
    await shot("11-settings");
    // the intro showed once at the start; Settings replays it
    await page.getByRole("button", { name: /How ChainBrain works/ }).click();
    const skip = page.getByRole("button", { name: "Skip" });
    await skip.waitFor({ timeout: 10000 });
    check("How ChainBrain works replays the intro", await visible("Give your AI a pocket, not your wallet").isVisible());
    await skip.click();
    await skip.waitFor({ state: "detached", timeout: 5000 });
  });

  check("no page errors", issues.length === 0, issues.slice(0, 5).join(" | "));
  console.log(`\n${passed} passed, ${failed.length} failed`);
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})();
