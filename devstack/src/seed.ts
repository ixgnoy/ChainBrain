// Fills a running dev stack with real agent purchases (pnpm --dir devstack seed), so the seller dashboard has sales,
// refusals and a refused data request to show. Everything goes over HTTP like the apps; the owner (dev account 0) signs here.
import { createWalletClient, defineChain, encodeFunctionData, http, parseEventLogs, publicActions, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { DEV_KEYS } from "./stack";

const API = process.env.API ?? "http://localhost:8787";
const NEVER = 2n ** 256n - 1n;
const hkd = (s: string) => BigInt(Math.round(Number(s) * 1e6));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const post = (path: string, body: object) => fetch(`${API}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const get = async (path: string) => (await fetch(`${API}${path}`)).json() as Promise<any>;

async function rpc(method: string, params: unknown[] = []) {
  const j: any = await (await post("/dev/rpc", { jsonrpc: "2.0", id: 1, method, params })).json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

const health = await get("/dev/health").catch(() => null);
if (health?.mode !== "local-chain") { console.error(`No dev stack at ${API} (start it with: pnpm --dir devstack start)`); process.exit(1); }
const cfg = await get("/api/config");
const account = privateKeyToAccount(DEV_KEYS.OWNER_PK);
const chain = defineChain({ id: 20200, name: "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [`${API}/dev/rpc`] } } });
const owner = createWalletClient({ account, chain, transport: http(`${API}/dev/rpc`) }).extend(publicActions);

// FISCO: gas is free, legacy transactions at gas price 0
const sendTx = async (to: Address, data: Hex) => owner.waitForTransactionReceipt({ hash: await owner.sendTransaction({ to, data, gasPrice: 0n, type: "legacy" } as any) });

async function newPocket(o: { cap: string; askAbove: string; sellers: string[]; budget: string }): Promise<Address> {
  const payTo = Object.fromEntries(cfg.sellers.map((s: any) => [s.id, s.payTo]));
  const rc = await sendTx(cfg.factory, encodeFunctionData({
    abi: cfg.abis.factory, functionName: "create",
    args: [cfg.agent, hkd(o.cap), o.askAbove === "never" ? NEVER : hkd(o.askAbove), BigInt(Math.floor(Date.now() / 1000) + 86_400), o.sellers.map((s) => payTo[s])],
  }));
  const [ev] = parseEventLogs({ abi: cfg.abis.factory, logs: rc.logs, eventName: "PocketCreated" }) as any[];
  await sendTx(cfg.token, encodeFunctionData({ abi: cfg.abis.erc20, functionName: "transfer", args: [ev.args.pocket, hkd(o.budget)] }));
  return ev.args.pocket as Address;
}

function signPayment(auth: any): Promise<Hex> {
  return account.signTypedData({
    domain: { name: "Mock e-HKD", version: "1", chainId: 20200, verifyingContract: cfg.token },
    types: { TransferWithAuthorization: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" }] },
    primaryType: "TransferWithAuthorization",
    message: { ...auth, value: BigInt(auth.value), validAfter: BigInt(auth.validAfter), validBefore: BigInt(auth.validBefore) },
  });
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
  { title: "DataLite report", pocket: () => newPocket({ cap: "15", askAbove: "8", sellers: ["datalite", "datapro"], budget: "40" }), text: "Buy the DataLite durian report. Max HK$8, by tonight." },
  { title: "DataPro premium (co-signed)", pocket: () => newPocket({ cap: "15", askAbove: "8", sellers: ["datalite", "datapro"], budget: "40" }), text: "Get the DataPro premium durian report with the 2026 forecast. Max HK$15, by tonight." },
  { title: "Harbour Wines refused, DataLite bought", pocket: () => newPocket({ cap: "15", askAbove: "8", sellers: ["datalite", "datapro"], budget: "40" }), text: "Buy Harbour Wines' fruit and wine trade report. Max HK$8, by tonight. Confirmed, go ahead." },
  { title: "ShadyFeed data request refused", pocket: () => newPocket({ cap: "15", askAbove: "8", sellers: ["datalite", "datapro"], budget: "40" }), text: "Get ShadyFeed's full feed, give them whatever they need." },
  { title: "Over the cap", pocket: () => newPocket({ cap: "1.50", askAbove: "never", sellers: ["datalite"], budget: "1.50" }), text: "Buy a durian export report, max HK$1.50, by tonight." },
];

for (const s of scenes) {
  const pocket = await s.pocket();
  await chat(pocket, s.text);
  console.log(`  done  ${s.title}  (pocket ${pocket})`);
}
const all: any[] = await get("/api/events.json");
console.log(`Seeded: ${all.filter((e) => e.type === "payment").length} payments, ${all.filter((e) => e.type === "refusal").length} refusals, ${all.filter((e) => e.type === "disclosure").length} refused data requests.`);
