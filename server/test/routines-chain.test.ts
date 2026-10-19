import { it, expect, beforeAll, afterAll, describe } from "vitest";
import { createWalletClient, http, parseEventLogs, publicActions, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { startStack } from "./helpers/stack";
import { loginTypedData, VISITOR_HEADER } from "../../shared/chain/login";

// Routines on the real chain: the owner sets a standing order on their card; each run pays through the wallet tools with
// the card's own agent key; a run past the period's allowance waits for the owner's co-sign.
let s: Awaited<ReturnType<typeof startStack>>;
let api: ReturnType<typeof import("../src/index").apiApp>;
let pub: typeof import("../src/wallet/chain").pub;
const saved = process.env.VISITOR_AUTH;

beforeAll(async () => {
  s = await startStack();
  process.env.VISITOR_AUTH = "on";
  const reply = { stop_reason: "end_turn", content: [{ type: "text", text: "I can't do that." }] } as any;
  api = (await import("../src/index")).apiApp({ model: async () => reply });
  pub = (await import("../src/wallet/chain")).pub;
});
afterAll(() => { process.env.VISITOR_AUTH = saved; return s?.stop(); });

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  api.request(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
async function signUp(who: PrivateKeyAccount): Promise<string> {
  const ch = await (await post("/v1/challenge", { owner: who.address })).json();
  return (await (await post("/v1/visitors", { owner: who.address, nonce: ch.nonce, issuedAt: ch.issuedAt, signature: await who.signTypedData(loginTypedData(ch) as any) })).json()).token;
}
async function card(pk: Hex, token: string, sellers: string[] = ["datalite"]): Promise<Address> {
  const { agent } = await (await post("/v1/cards/agent", {}, { [VISITOR_HEADER]: token })).json();
  const { factoryAbi, erc20Abi } = await import("../src/wallet/chain");
  const { cfg } = await import("../src/chains");
  const w = createWalletClient({ account: privateKeyToAccount(pk), chain: cfg().chain, transport: http(s.rpc) }).extend(publicActions);
  const opts = { type: "legacy", gasPrice: 0n } as const;
  const hash = await w.writeContract({ address: s.factory, abi: factoryAbi, functionName: "create", args: [agent, 400_000n, 2n ** 256n - 1n, BigInt(Math.floor(Date.now() / 1000) + 3600), sellers.map((x) => s.payTo[x])], ...opts } as any);
  const [ev] = parseEventLogs({ abi: factoryAbi, logs: (await w.waitForTransactionReceipt({ hash })).logs, eventName: "PocketCreated" }) as any[];
  await w.waitForTransactionReceipt({ hash: await w.writeContract({ address: s.token, abi: erc20Abi, functionName: "transfer", args: [ev.args.pocket, 2_000_000n], ...opts } as any) });
  return ev.args.pocket;
}

const spec = { kind: "schedule", cadence: { every: "day", hour: 8, minute: 0 }, items: [{ sellerId: "exa", sku: "durian-news" }, { sellerId: "coingecko", sku: "eth-price" }], allowance: { amount: "0.20", period: "week" } };

describe("routines on the real chain", () => {
  const key = generatePrivateKey(), me = privateKeyToAccount(key);
  let token = "", pocket: Address;

  it("only the card's owner sets it; run 1 pays both items for real", async () => {
    token = await signUp(me);
    pocket = await card(key, token, ["exa", "coingecko"]);
    const other = await signUp(privateKeyToAccount(generatePrivateKey()));
    expect((await post("/api/routine", { pocket, spec }, { [VISITOR_HEADER]: other })).status).toBe(403);
    const set = await (await post("/api/routine", { pocket, spec }, { [VISITOR_HEADER]: token })).json();
    expect(set).toMatchObject({ pocket: pocket.toLowerCase(), status: "active", runs: 0 });
    const r = await (await post("/api/routine/run", { pocket }, { [VISITOR_HEADER]: token })).json();
    expect(r).toMatchObject({ ok: true, run: 1, paid: "0.136" });
    for (const o of r.outs) expect((await pub().getTransactionReceipt({ hash: o.tx })).status).toBe("success");
  });

  it("a run past the week's allowance asks the owner, and pays once the owner co-signs", async () => {
    const running = Promise.resolve(post("/api/routine/run", { pocket }, { [VISITOR_HEADER]: token })).then((x: Response) => x.json());
    let ask: any;
    for (let i = 0; i < 60 && !ask; i++) { ask = (await (await api.request(`/api/pending?pocket=${pocket}`)).json()).find((a: any) => a.kind === "payment"); if (!ask) await new Promise((r) => setTimeout(r, 250)); }
    expect(ask.data.allowance).toMatchObject({ run: 2, period: "week", allowance: "0.20", spent: "0.192", after: "0.272" });
    const { transferTypedData } = await import("../src/wallet/scheme");
    const signature = await me.signTypedData(transferTypedData(ask.data.auth) as any);
    expect((await post(`/api/approvals/${ask.id}`, { approved: true, signature }, { [VISITOR_HEADER]: token })).status).toBe(200);
    const r = await running;
    expect(r.outs.map((o: any) => o.outcome)).toEqual(["paid", "cosigned"]);
    expect((await pub().getTransactionReceipt({ hash: r.outs[1].tx })).status).toBe("success");
  });

  it("pause stops it, the scheduler runs it when due, and the apps read it back from the events", async () => {
    expect((await post("/api/routine/pause", { pocket, paused: true }, { [VISITOR_HEADER]: token })).status).toBe(200);
    expect(await (await post("/api/routine/run", { pocket }, { [VISITOR_HEADER]: token })).json()).toMatchObject({ ok: false, reason: "ROUTINE_PAUSED" });
    expect((await post("/api/routine/pause", { pocket, paused: false }, { [VISITOR_HEADER]: token })).status).toBe(200);
    const { tickRoutines, routineOf } = await import("../src/routines");
    const before = routineOf(pocket)!;
    process.env.APPROVAL_WAIT_MS = "1500"; // run 3 is past the allowance again: nobody co-signs, so it is declined, not paid
    try {
      const out = await tickRoutines(before.nextAt + 1);
      expect(out.find((x: any) => x.run === 3)).toBeTruthy();
    } finally { delete process.env.APPROVAL_WAIT_MS; }
    const { bus } = await import("../src/wallet/events");
    const { routineFromEvents } = await import("../../shared/sim/pocketAppData");
    const rt = routineFromEvents(bus.recent() as any, pocket);
    expect([rt?.runs, rt?.status]).toEqual([3, "active"]);
    expect((await (await api.request(`/api/routine?pocket=${pocket}`)).json()).runs).toBe(3);
  });

  it("past the card's on-chain allowance (OVER_PERIOD) a run asks the owner instead of refusing, and pays once co-signed", async () => {
    const key2 = generatePrivateKey(), owner2 = privateKeyToAccount(key2);
    const t2 = await signUp(owner2);
    const card2 = await card(key2, t2, ["exa", "coingecko"]);
    const { cfg } = await import("../src/chains");
    const { pocketAbi } = await import("../src/wallet/chain");
    const w = createWalletClient({ account: owner2, chain: cfg().chain, transport: http(s.rpc) }).extend(publicActions);
    // the card itself allows HK$0.10 a week (kind 2); the routine's own allowance is a roomy HK$1.00
    await w.waitForTransactionReceipt({ hash: await w.writeContract({ address: card2, abi: pocketAbi, functionName: "setPeriodLimit", args: [2, 100_000n], type: "legacy", gasPrice: 0n } as any) });
    expect((await post("/api/routine", { pocket: card2, spec: { ...spec, allowance: { amount: "1.00", period: "week" } } }, { [VISITOR_HEADER]: t2 })).status).toBe(200);
    const running = Promise.resolve(post("/api/routine/run", { pocket: card2 }, { [VISITOR_HEADER]: t2 })).then((x: Response) => x.json());
    let ask: any;
    for (let i = 0; i < 80 && !ask; i++) { ask = (await (await api.request(`/api/pending?pocket=${card2}`)).json()).find((a: any) => a.kind === "payment"); if (!ask) await new Promise((r) => setTimeout(r, 250)); }
    expect(ask?.text).toMatch(/past the allowance this card holds on-chain/);
    const { transferTypedData } = await import("../src/wallet/scheme");
    expect((await post(`/api/approvals/${ask.id}`, { approved: true, signature: await owner2.signTypedData(transferTypedData(ask.data.auth) as any) }, { [VISITOR_HEADER]: t2 })).status).toBe(200);
    const r = await running;
    expect(r.outs.map((o: any) => o.outcome)).toEqual(["paid", "cosigned"]);
    expect((await pub().getTransactionReceipt({ hash: r.outs[1].tx })).status).toBe("success");
    const { bus } = await import("../src/wallet/events");
    const pays = bus.recent().filter((e: any) => e.type === "payment" && e.pocket?.toLowerCase() === card2.toLowerCase());
    expect(pays.every((e: any) => e.routine?.run === 1)).toBe(true); // the apps' period meter counts these
  });
});
