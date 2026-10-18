import { it, expect, beforeAll, afterAll, describe } from "vitest";
import { createWalletClient, http, parseEventLogs, publicActions, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { startStack } from "./helpers/stack";
import { loginTypedData, VISITOR_HEADER } from "../../shared/chain/login";

// Visitor accounts on the local FISCO node: a Login signature over a server nonce signs up (funded with real
// transactions) or signs in; mutating routes need the token and, for a card, that the visitor's key owns it.
let s: Awaited<ReturnType<typeof startStack>>;
let api: ReturnType<typeof import("../src/index").apiApp>;
let pub: typeof import("../src/wallet/chain").pub;
const saved = { ...process.env };

beforeAll(async () => {
  s = await startStack();
  Object.assign(process.env, { VISITOR_AUTH: "on", VISITOR_STARTER: "500" });
  const reply = { stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] } as any;
  api = (await import("../src/index")).apiApp({ model: async () => reply });
  pub = (await import("../src/wallet/chain")).pub;
});
afterAll(() => {
  for (const k of ["VISITOR_AUTH", "VISITOR_STARTER", "VISITORS_PER_HOUR", "RATE_LIMIT_PER_MIN"]) process.env[k] = saved[k];
  return s?.stop();
});

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  api.request(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

async function signed(who: PrivateKeyAccount, signer: PrivateKeyAccount = who) {
  const ch = await (await post("/v1/challenge", { owner: who.address })).json();
  const signature = await signer.signTypedData(loginTypedData(ch) as any);
  return { owner: who.address, nonce: ch.nonce, issuedAt: ch.issuedAt, signature };
}

async function signUp(who: PrivateKeyAccount) {
  const r = await post("/v1/visitors", await signed(who));
  return { status: r.status, body: await r.json() };
}

/** The visitor's own key creates a card through the factory (the server never signs for the owner). */
async function createCard(pk: Hex): Promise<Address> {
  const { factoryAbi } = await import("../src/wallet/chain");
  const { cfg } = await import("../src/chains");
  const w = createWalletClient({ account: privateKeyToAccount(pk), chain: cfg().chain, transport: http(s.rpc) }).extend(publicActions);
  const hash = await w.writeContract({ address: s.factory, abi: factoryAbi, functionName: "create",
    args: [s.agent.address, 1_000_000n, 2n ** 256n - 1n, BigInt(Math.floor(Date.now() / 1000) + 3600), [s.payTo.datalite]], type: "legacy", gasPrice: 0n } as any);
  const [ev] = parseEventLogs({ abi: factoryAbi, logs: (await w.waitForTransactionReceipt({ hash })).logs, eventName: "PocketCreated" }) as any[];
  return ev.args.pocket;
}

describe("visitor accounts", () => {
  const aliceKey = generatePrivateKey(), bobKey = generatePrivateKey();
  const alice = privateKeyToAccount(aliceKey), bob = privateKeyToAccount(bobKey);
  let aliceToken = "", bobToken = "";

  it("signs up with one Login signature: native balance and the starter HK$ arrive as real transactions", async () => {
    const { status, body } = await signUp(alice);
    expect(status).toBe(201);
    expect(body).toMatchObject({ created: true, owner: alice.address, funding: { nativeFunded: true, minted: "500.00" } });
    expect(body.visitorId).toMatch(/^v-[0-9a-f]{16}$/);
    const rc = await pub().getTransactionReceipt({ hash: body.funding.mintTx });
    expect(rc.status).toBe("success");
    expect(await s.balance(alice.address)).toBe(500_000_000n);
    expect(await pub().getBalance({ address: alice.address })).toBeGreaterThan(0n);
    expect(body.explorer).toContain(body.funding.mintTx);
    aliceToken = body.token;
  });

  it("signing up again is the same account: no second mint, a fresh token", async () => {
    const { status, body } = await signUp(alice);
    expect(status).toBe(200);
    expect(body.created).toBe(false);
    expect(await s.balance(alice.address)).toBe(500_000_000n);
    expect(body.token).not.toBe(aliceToken);
    const me = await api.request("/v1/me", { headers: { [VISITOR_HEADER]: body.token } });
    expect((await me.json()).owner).toBe(alice.address);
    expect((await api.request("/v1/me")).status).toBe(401);
  });

  it("refuses a replayed nonce, a signature from another key and an unknown visitor's login", async () => {
    const good = await signed(alice);
    expect((await post("/v1/login", good)).status).toBe(200);
    expect(await (await post("/v1/login", good)).json()).toEqual({ error: "CHALLENGE_EXPIRED" }); // single use
    expect(await (await post("/v1/login", await signed(alice, bob))).json()).toEqual({ error: "BAD_SIGNATURE" });
    expect((await post("/v1/login", await signed(bob))).status).toBe(404);
    expect((await post("/v1/visitors", { owner: alice.address, nonce: "0x" + "00".repeat(32), issuedAt: Date.now(), signature: "0x00" })).status).toBe(401);
  });

  it("a card's routes answer only its owner's token", async () => {
    bobToken = (await signUp(bob)).body.token;
    const card = await createCard(aliceKey);
    const chat = (h: Record<string, string>) => post("/api/chat", { pocket: card, text: "hello" }, h);
    expect((await chat({})).status).toBe(401);
    expect(await (await chat({ [VISITOR_HEADER]: bobToken })).json()).toEqual({ error: "NOT_YOUR_CARD" });
    expect((await chat({ [VISITOR_HEADER]: aliceToken })).status).toBe(200);
    const forget = (h: Record<string, string>) => post("/api/memory/forget", { pocket: card, id: "nope" }, h);
    expect((await forget({ [VISITOR_HEADER]: bobToken })).status).toBe(403);
    expect((await forget({ [VISITOR_HEADER]: aliceToken })).status).toBe(404); // past the guard: no such memory
    expect((await post("/api/rules/compile", { sentence: "HK$5 a day" })).status).toBe(401);
    expect((await post("/api/radar/ask", { question: "who?" })).status).toBe(401);
  });

  it("caps sign-ups per hour (existing visitors still sign in) and writes per IP per minute", async () => {
    process.env.VISITORS_PER_HOUR = "0";
    try {
      expect(await (await post("/v1/visitors", await signed(privateKeyToAccount(generatePrivateKey())))).json()).toMatchObject({ error: "SIGNUPS_FULL" });
      expect((await post("/v1/visitors", await signed(alice))).status).toBe(200);
    } finally { delete process.env.VISITORS_PER_HOUR; }
    const { resetLimits } = await import("../src/limits");
    resetLimits();
    process.env.RATE_LIMIT_PER_MIN = "3";
    try {
      const hit = (ip: string) => post("/v1/challenge", { owner: alice.address }, { "x-real-ip": ip });
      expect([(await hit("203.0.113.9")).status, (await hit("203.0.113.9")).status, (await hit("203.0.113.9")).status]).toEqual([200, 200, 200]);
      expect((await hit("203.0.113.9")).status).toBe(429);
      expect((await hit("203.0.113.10")).status).toBe(200);
    } finally { process.env.RATE_LIMIT_PER_MIN = "1000000"; resetLimits(); }
  });
});
