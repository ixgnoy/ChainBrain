import { it, expect, beforeAll, afterAll, describe } from "vitest";
import { createWalletClient, http, parseEventLogs, publicActions, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { startStack } from "./helpers/stack";
import { loginTypedData, VISITOR_HEADER } from "../../shared/chain/login";

// A new account's starter cards: the visitor's own key makes two cards, then each card's own agent makes real small x402
// payments (POST /v1/starter), once; then the account is made lived-in (a reverted ShadyFeed transfer, a routine, a cheque).
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

describe("starter cards", () => {
  it("each starter card's own agent buys something small, for real, once, and only on the visitor's own cards", async () => {
    const key = generatePrivateKey(), me = privateKeyToAccount(key);
    const token = await signUp(me);
    const brief = await card(key, token, ["exa", "coingecko"]), watch = await card(key, token, ["nansen"]);
    const other = await signUp(privateKeyToAccount(generatePrivateKey()));
    expect((await post("/v1/starter", { cards: [brief, watch] }, { [VISITOR_HEADER]: other })).status).toBe(403);
    const r = await (await post("/v1/starter", { cards: [brief, watch] }, { [VISITOR_HEADER]: token })).json();
    expect(r.payments.map((p: any) => [p.sellerId, !!p.tx])).toEqual([["exa", true], ["exa", true], ["coingecko", true], ["nansen", true]]);
    for (const p of r.payments) expect((await pub().getTransactionReceipt({ hash: p.tx })).status).toBe("success");
    expect(r.balances[brief]).toBe(String(2_000_000 - 56_000 - 56_000 - 80_000));
    expect(r.balances[watch]).toBe(String(2_000_000 - 80_000));
    expect((await post("/v1/starter", { cards: [brief, watch] }, { [VISITOR_HEADER]: token })).status).toBe(409);

    // after the answer the account turns lived-in: ShadyFeed's transfer reverted on chain, a routine, a cheque waiting
    let ask: any;
    for (let i = 0; i < 120 && !ask; i++) { ask = (await (await api.request(`/api/pending?pocket=${brief}`)).json()).find((a: any) => a.kind === "payment"); if (!ask) await new Promise((r) => setTimeout(r, 250)); }
    expect(ask.data).toMatchObject({ sellerId: "coingecko", amount: "0.08", allowance: { run: 1, period: "week", allowance: "0.10", spent: "0.056", after: "0.136" } });
    const { bus } = await import("../src/wallet/events");
    const forced = bus.recent().find((e: any) => e.type === "forced" && e.pocket === watch) as any;
    expect(forced).toMatchObject({ reverted: true, sellerId: "shadyfeed", balanceBefore: forced.balanceAfter });
    expect((await pub().getTransactionReceipt({ hash: forced.tx })).status).toBe("reverted");
    expect(await (await api.request(`/api/routine?pocket=${brief}`)).json()).toMatchObject({ status: "active", allowance: { amount: "0.10", period: "week" } });

    const { transferTypedData } = await import("../src/wallet/scheme");
    expect((await post(`/api/approvals/${ask.id}`, { approved: true, signature: await me.signTypedData(transferTypedData(ask.data.auth) as any) }, { [VISITOR_HEADER]: token })).status).toBe(200);
    const { starterExtras } = await import("../src/starter");
    const run: any = await Promise.all([...starterExtras.values()]).then((x) => x.at(-1));
    expect(run.outs.map((o: any) => [o.sellerId, o.outcome])).toEqual([["exa", "paid"], ["coingecko", "cosigned"]]);
    for (const o of run.outs) expect((await pub().getTransactionReceipt({ hash: o.tx })).status).toBe("success");
  });
});
