// Prints book.html to docs/submission/ChainBrain-technical-documentation.pdf (mermaid diagrams drawn first).
// Usage: node docs/submission/build/pdf.cjs   (needs Playwright, e.g. NODE_PATH=web/node_modules)
const { chromium } = require("@playwright/test");
const path = require("node:path");
const src = path.join(__dirname, "book.html");
const out = path.join(__dirname, "..", "ChainBrain-technical-documentation.pdf");
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  await pg.goto("file:///" + src.replace(/\\/g, "/"), { waitUntil: "load" });
  await pg.evaluate(async () => {
    window.mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose", fontFamily: "Segoe UI, sans-serif" });
    await window.mermaid.run({ querySelector: "pre.mermaid" });
  });
  const failed = await pg.$$eval("pre.mermaid", (els) => els.filter((e) => !e.querySelector("svg")).length);
  if (failed) throw new Error(`${failed} mermaid diagram(s) did not render`);
  const foot = `<div style="width:100%;font-size:7.5pt;color:#5B6B7A;font-family:Segoe UI,sans-serif;padding:0 15mm;display:flex;justify-content:space-between"><span>链AI脑 ChainBrain · Technical documentation</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  await pg.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true, outline: true, tagged: true,
    displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: foot });
  await b.close();
  console.log(out);
})().catch((e) => { console.error(e); process.exit(1); });
