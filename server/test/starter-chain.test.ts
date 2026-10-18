import { it, expect, beforeAll, afterAll, describe } from "vitest";
import { createWalletClient, http, parseEventLogs, publicActions, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { startStack } from "./helpers/stack";
import { loginTypedData, VISITOR_HEADER } from "../../shared/chain/login";

// A new account's starter cards: the visitor's own key makes two cards, then each card's own agent makes real small x402
// payments (POST /v1/starter), once.
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
    const key = generatePrivateKey();
    const token = await signUp(privateKeyToAccount(key));
    const brief = await card(key, token, ["exa", "coingecko"]), watch = await card(key, token, ["nansen"]);
    const other = await signUp(privateKeyToAccount(generatePrivateKey()));
    expect((await post("/v1/starter", { cards: [brief, watch] }, { [VISITOR_HEADER]: other })).status).toBe(403);
    const r = await (await post("/v1/starter", { cards: [brief, watch] }, { [VISITOR_HEADER]: token })).json();
    expect(r.payments.map((p: any) => [p.sellerId, !!p.tx])).toEqual([["exa", true], ["coingecko", true], ["nansen", true]]);
    for (const p of r.payments) expect((await pub().getTransactionReceipt({ hash: p.tx })).status).toBe("success");
    expect(r.balances[brief]).toBe(String(2_000_000 - 56_000 - 80_000));
    expect(r.balances[watch]).toBe(String(2_000_000 - 80_000));
    expect((await post("/v1/starter", { cards: [brief, watch] }, { [VISITOR_HEADER]: token })).status).toBe(409);
  });
});
