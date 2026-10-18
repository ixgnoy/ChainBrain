import { it, expect, beforeAll, afterAll, describe } from "vitest";
import { createWalletClient, http, keccak256, parseEventLogs, publicActions, toHex, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { startStack } from "./helpers/stack";
import { loginTypedData, VISITOR_HEADER } from "../../shared/chain/login";

// Per-card agent keys on the local FISCO node: each visitor's card names its own derived agent, the server pays with
// that key, a card can't borrow another visitor's agent, and a lost table is rebuilt from the owner's visitor id.
let s: Awaited<ReturnType<typeof startStack>>;
let api: ReturnType<typeof import("../src/index").apiApp>;
let K: typeof import("../src/agentKeys");
let M: typeof import("../src/wallet/pay");
const saved = process.env.VISITOR_AUTH;
const intentHash = keccak256(toHex("agent-keys-test"));

beforeAll(async () => {
  s = await startStack();
  process.env.VISITOR_AUTH = "on";
  api = (await import("../src/index")).apiApp();
  K = await import("../src/agentKeys");
  M = await import("../src/wallet/pay");
});
afterAll(() => { process.env.VISITOR_AUTH = saved; return s?.stop(); });

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  api.request(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

async function signUp(who: PrivateKeyAccount): Promise<string> {
  const ch = await (await post("/v1/challenge", { owner: who.address })).json();
  const signature = await who.signTypedData(loginTypedData(ch) as any);
  return (await (await post("/v1/visitors", { owner: who.address, nonce: ch.nonce, issuedAt: ch.issuedAt, signature })).json()).token;
}
const askAgent = async (token: string) => (await post("/v1/cards/agent", {}, { [VISITOR_HEADER]: token })).json() as Promise<{ cardId: string; agent: Address }>;

/** The owner's own key creates the card (naming `agent`) and funds it with HK$20 from its main wallet. */
async function createCard(pk: Hex, agent: Address): Promise<Address> {
  const { factoryAbi, erc20Abi } = await import("../src/wallet/chain");
  const { cfg } = await import("../src/chains");
  const w = createWalletClient({ account: privateKeyToAccount(pk), chain: cfg().chain, transport: http(s.rpc) }).extend(publicActions);
  const opts = { type: "legacy", gasPrice: 0n } as const;
  const hash = await w.writeContract({ address: s.factory, abi: factoryAbi, functionName: "create",
    args: [agent, 15_000_000n, 2n ** 256n - 1n, BigInt(Math.floor(Date.now() / 1000) + 3600), [s.payTo.datalite]], ...opts } as any);
  const [ev] = parseEventLogs({ abi: factoryAbi, logs: (await w.waitForTransactionReceipt({ hash })).logs, eventName: "PocketCreated" }) as any[];
  await w.waitForTransactionReceipt({ hash: await w.writeContract({ address: s.token, abi: erc20Abi, functionName: "transfer", args: [ev.args.pocket, 20_000_000n], ...opts } as any) });
  return ev.args.pocket;
}

async function pay(card: Address) {
  const q = await M.fetchQuote("datalite", "durian-report");
  if (q.kind !== "priced") throw new Error("expected a priced item");
  return M.settle(card, M.track(card, q.quote), intentHash);
}

describe("per-card agent keys", () => {
  const aKey = generatePrivateKey(), bKey = generatePrivateKey();
  const alice = privateKeyToAccount(aKey), bob = privateKeyToAccount(bKey);
  let aToken = "", bToken = "";

  it("derives a different key per card, deterministically, inside the curve order", () => {
    const m = process.env.AGENT_MASTER_KEY as Hex;
    expect(K.deriveAgentKey(m, "v-1#0")).toBe(K.deriveAgentKey(m, "v-1#0"));
    expect(K.deriveAgentKey(m, "v-1#0")).not.toBe(K.deriveAgentKey(m, "v-1#1"));
    expect(K.deriveAgentKey(m, "v-1#0")).not.toBe(K.deriveAgentKey(("0x" + "11".repeat(32)) as Hex, "v-1#0"));
    expect(BigInt(K.deriveAgentKey(m, "v-2#7"))).toBeLessThan(0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n);
  });

  it("gives each visitor's cards their own agent, and only to a signed-in visitor", async () => {
    aToken = await signUp(alice);
    bToken = await signUp(bob);
    const [a0, a1, b0] = [await askAgent(aToken), await askAgent(aToken), await askAgent(bToken)];
    expect(a0.cardId).toMatch(/^v-[0-9a-f]{16}#0$/);
    expect(a1.cardId).toBe(a0.cardId.replace("#0", "#1"));
    expect(new Set([a0.agent, a1.agent, b0.agent]).size).toBe(3);
    expect(b0.agent).not.toBe(s.agent.address);
    expect((await post("/v1/cards/agent", {})).status).toBe(401);
    const master = process.env.AGENT_MASTER_KEY;
    delete process.env.AGENT_MASTER_KEY;
    try { expect((await post("/v1/cards/agent", {}, { [VISITOR_HEADER]: aToken })).status).toBe(503); } finally { process.env.AGENT_MASTER_KEY = master; }
  });

  it("pays from Alice's card with that card's own derived key (a real x402 settlement)", async () => {
    const { agent } = await askAgent(aToken);
    const card = await createCard(aKey, agent);
    const r = await pay(card);
    expect(r).toMatchObject({ ok: true });
    const { pub } = await import("../src/wallet/chain");
    expect((await pub().getTransactionReceipt({ hash: (r as any).tx })).status).toBe("success");
    expect(await s.balance(card)).toBeLessThan(20_000_000n);
  });

  it("refuses a card that names another visitor's agent (Bob's card, Alice's agent)", async () => {
    const { agent } = await askAgent(aToken);
    const card = await createCard(bKey, agent);
    expect(await pay(card)).toMatchObject({ ok: false, reason: "NOT_THIS_AGENT" });
  });

  it("still signs after the agent table is lost, rebuilt from the owner's visitor id", async () => {
    const { agent } = await askAgent(bToken);
    const card = await createCard(bKey, agent);
    K.resetAgentKeys();
    expect(await pay(card)).toMatchObject({ ok: true });
  });
});
