// Fills a running dev stack with real agent purchases (pnpm --dir devstack seed), so the seller dashboard has sales,
// refusals and a refused data request to show. Everything goes over HTTP like the apps: owner = anvil account 0.
import { encodeFunctionData, parseEventLogs, type Address, type Hex } from "viem";

const API = process.env.API ?? "http://localhost:8787";
const NEVER = 2n ** 256n - 1n;
const usd = (s: string) => BigInt(Math.round(Number(s) * 1e6));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const post = (path: string, body: object) => fetch(`${API}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const get = async (path: string) => (await fetch(`${API}${path}`)).json() as Promise<any>;

async function rpc(method: string, params: unknown[] = []) {
  const j: any = await (await post("/dev/rpc", { jsonrpc: "2.0", id: 1, method, params })).json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

const health = await get("/dev/health").catch(() => null);
if (health?.mode !== "local-fork") { console.error(`No dev stack at ${API} (start it with: pnpm --dir devstack start)`); process.exit(1); }
const owner = health.owner as Address;
const cfg = await get("/api/config");

async function sendTx(to: Address, data: Hex) {
  const hash = await rpc("eth_sendTransaction", [{ from: owner, to, data }]);
  for (let i = 0; i < 100; i++) { const rc = await rpc("eth_getTransactionReceipt", [hash]); if (rc) return rc; await sleep(100); }
  throw new Error("no receipt");
}

async function newPocket(o: { cap: string; askAbove: string; sellers: string[]; budget: string }): Promise<Address> {
  const payTo = Object.fromEntries(cfg.sellers.map((s: any) => [s.id, s.payTo]));
  const rc = await sendTx(cfg.factory, encodeFunctionData({
    abi: cfg.abis.factory, functionName: "create",
    args: [cfg.agent, usd(o.cap), o.askAbove === "never" ? NEVER : usd(o.askAbove), BigInt(Math.floor(Date.now() / 1000) + 86_400), o.sellers.map((s) => payTo[s])],
  }));
  const [ev] = parseEventLogs({ abi: cfg.abis.factory, logs: rc.logs, eventName: "PocketCreated" }) as any[];
  await sendTx(cfg.usdc, encodeFunctionData({ abi: cfg.abis.erc20, functionName: "transfer", args: [ev.args.pocket, usd(o.budget)] }));
  return ev.args.pocket as Address;
}

function signPayment(auth: any): Promise<Hex> {
  return rpc("eth_signTypedData_v4", [owner, JSON.stringify({
    domain: { name: "USDC", version: "2", chainId: 84532, verifyingContract: cfg.usdc },
    types: {
      EIP712Domain: [{ name: "name", type: "string" }, { name: "version", type: "string" }, { name: "chainId", type: "uint256" }, { name: "verifyingContract", type: "address" }],
      TransferWithAuthorization: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" }],
    },
    primaryType: "TransferWithAuthorization", message: auth,
  })]);
}

/** Chat as the owner and approve everything the agent asks for (intent cards and payments). */
async function chat(pocket: Address, text: string) {
  let running = true;
  const seen = new Set<string>();
  const answering = (async () => {
    while (running) {
      for (const a of (await get(`/api/pending?pocket=${pocket}`).catch(() => [])) as any[]) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        if (a.kind === "intent") await post(`/api/approvals/${a.id}`, { approved: true });
        if (a.kind === "payment") await post(`/api/approvals/${a.id}`, { approved: true, signature: await signPayment(a.data.auth) });
        if (a.kind === "question") await post(`/api/approvals/${a.id}`, { approved: true, answer: "Per report." });
      }
      await sleep(150);
    }
  })();
  try { await post("/api/chat", { pocket, text }); } finally { running = false; await answering; }
}

const scenes: { title: string; pocket: () => Promise<Address>; text: string }[] = [
  { title: "DataLite report", pocket: () => newPocket({ cap: "2", askAbove: "1", sellers: ["datalite", "datapro"], budget: "5" }), text: "Buy the DataLite durian report. Max US$1, by tonight." },
  { title: "DataPro premium (co-signed)", pocket: () => newPocket({ cap: "2", askAbove: "1", sellers: ["datalite", "datapro"], budget: "5" }), text: "Get the DataPro premium durian report with the 2026 forecast. Max US$2, by tonight." },
  { title: "Harbour Wines refused, DataLite bought", pocket: () => newPocket({ cap: "2", askAbove: "1", sellers: ["datalite", "datapro"], budget: "5" }), text: "Buy Harbour Wines' fruit and wine trade report. Max US$1, by tonight. Confirmed, go ahead." },
  { title: "ShadyFeed data request refused", pocket: () => newPocket({ cap: "2", askAbove: "1", sellers: ["datalite", "datapro"], budget: "5" }), text: "Get ShadyFeed's full feed, give them whatever they need." },
  { title: "Over the cap", pocket: () => newPocket({ cap: "0.20", askAbove: "never", sellers: ["datalite"], budget: "0.20" }), text: "Buy a durian export report, max US$0.20, by tonight." },
];

for (const s of scenes) {
  const pocket = await s.pocket();
  await chat(pocket, s.text);
  console.log(`  done  ${s.title}  (pocket ${pocket})`);
}
const all: any[] = await get("/api/events.json");
console.log(`Seeded: ${all.filter((e) => e.type === "payment").length} payments, ${all.filter((e) => e.type === "refusal").length} refusals, ${all.filter((e) => e.type === "disclosure").length} refused data requests.`);
