import { networkInterfaces } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createPublicClient, createWalletClient, defineChain, http, publicActions, hexToString, toHex, type Address, type Hex, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { scriptedModel } from "../../server/src/agent/scripted";
import { SCENES } from "./scenes";
import { relayApp } from "./relay";

// Well-known public dev keys (Foundry's default accounts): local test chains only. Same as server/test/helpers/env.ts.
export const DEV_KEYS = {
  OWNER_PK: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  AGENT_PK: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  SELLER_DATALITE_PK: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  SELLER_DATAPRO_PK: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  SELLER_HARBOUR_WINES_PK: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  SELLER_SHADYFEED_PK: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  FACILITATOR_PK: "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  FORCE_PK: "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  SENTINEL_PK: "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  // per-card agent keys are derived from this (local test chains only)
  AGENT_MASTER_KEY: "0x636861696e627261696e2d6465762d6167656e742d6d61737465722d6b657921",
} as const;

const ATTACKER: Address = "0x000000000000000000000000000000000000ABC0";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const server = (rel: string) => new URL(`../../server/src/${rel}`, import.meta.url).href;

export type DevStackOptions = {
  apiPort?: number; sellersPort?: number;
  /** the FISCO node's RPC (default FISCO_RPC or the local node from scripts/fisco) */
  rpc?: string; revokeWindowMs?: number; ownerEhkd?: number; log?: (s: string) => void;
};

export function lanIp(): string | undefined {
  const all = Object.entries(networkInterfaces()).flatMap(([n, l]) => (l ?? []).map((i) => ({ n, ...i })));
  const v4 = all.filter((i) => i.family === "IPv4" && !i.internal && !i.address.startsWith("169.254."));
  return (v4.find((i) => /^(en|wlan|wl|eth)/.test(i.n)) ?? v4[0])?.address;
}

async function rpcCall(rpc: string, method: string, params: unknown[] = []) {
  const r = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j: any = await r.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

const fisco = (rpc: string) => defineChain({ id: 20200, name: "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
const artifact = (name: string) => JSON.parse(readFileSync(new URL(`../../contracts/out/${name}.sol/${name}.json`, import.meta.url), "utf8"));
const mintAbi = [{ type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] }] as const;

/**
 * Boots the stack on the FISCO node (default: the local one from scripts/fisco): a fresh Mock e-HKD and factory per run,
 * the real sellers and the real wallet API with a scripted model. Gas is free on FISCO; senders need a native balance,
 * credited the way the server does it (server/src/fund.ts: fund.sh locally, or the node gateway with FUND_URL).
 */
export async function startDevStack(o: DevStackOptions = {}) {
  const apiPort = o.apiPort ?? 8787, sellersPort = o.sellersPort ?? 4021;
  const log = o.log ?? (() => {});
  const startedAt = Date.now();
  const rpc = o.rpc ?? process.env.FISCO_RPC ?? "http://127.0.0.1:8545";
  const id = await rpcCall(rpc, "eth_chainId").catch(() => null);
  if (id !== "0x4ee8") throw new Error(`no FISCO node (chain 20200) at ${rpc}: run scripts/fisco/setup.sh (first time) or scripts/fisco/start.sh`);
  const chain = fisco(rpc);
  const pc = createPublicClient({ chain, transport: http(rpc) }) as PublicClient;

  const lan = lanIp();
  Object.assign(process.env, DEV_KEYS, { FISCO_RPC: rpc, SELLERS_URL: `http://${lan ?? "localhost"}:${sellersPort}` });
  // visitor auth stays on (both apps sign in); a fresh stack keeps its visitors in memory
  process.env.DATA_DIR ??= "memory";
  // exact revert reasons from the local node's native receipt (mutual TLS with the chain's SDK certs), not a replay
  if (!process.env.FISCO_NATIVE_RPC && existsSync(new URL("../../.fisco/nodes/127.0.0.1/sdk/sdk.crt", import.meta.url))) process.env.FISCO_NATIVE_RPC = "https://127.0.0.1:20200";

  const owner = privateKeyToAccount(DEV_KEYS.OWNER_PK);
  const { fundIfEmpty } = await import(server("fund.ts"));
  // every key that sends: owner, facilitator, the forced-transfer submitter, the Sentinel's guardian, the agent (escalation scene)
  const guardian = privateKeyToAccount(DEV_KEYS.SENTINEL_PK).address;
  await fundIfEmpty(pc, [DEV_KEYS.OWNER_PK, DEV_KEYS.FACILITATOR_PK, DEV_KEYS.FORCE_PK, DEV_KEYS.SENTINEL_PK, DEV_KEYS.AGENT_PK].map((k) => privateKeyToAccount(k).address));
  const wallet = createWalletClient({ account: owner, chain, transport: http(rpc) }).extend(publicActions);
  const deploy = async (name: string, args: unknown[]) => {
    const a = artifact(name);
    return (await wallet.waitForTransactionReceipt({ hash: await wallet.deployContract({ abi: a.abi, bytecode: a.bytecode.object, args } as any) })).contractAddress!;
  };
  // one at a time: FISCO does not order a sender's transactions by nonce within a block
  const token = await deploy("MockEHKD", [owner.address]);
  const factory = await deploy("PocketFactory", [token, guardian]);
  Object.assign(process.env, { TOKEN_ADDRESS: token, FACTORY_ADDRESS: factory });

  const mint = async (addr: Address, amount: bigint) => {
    await wallet.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: token, abi: mintAbi, functionName: "mint", args: [addr, amount] }) });
  };
  const ehkdOf = async (addr: Address): Promise<bigint> => BigInt(await rpcCall(rpc, "eth_call", [{ to: token, data: `0x70a08231${addr.slice(2).toLowerCase().padStart(64, "0")}` }, "latest"]));
  await mint(owner.address, BigInt(Math.round((o.ownerEhkd ?? 8000) * 1e6)));

  const { sellersApp } = await import(server("sellers.ts"));
  const { apiApp } = await import(server("index.ts"));
  const sellersServer = serve({ fetch: sellersApp().fetch, port: sellersPort, hostname: "0.0.0.0" });
  const api = apiApp({ model: scriptedModel({ revokeWindowMs: o.revokeWindowMs }) });
  const { startSentinel } = await import(server("sentinel/index.ts"));
  const sentinel = startSentinel();

  // Same origin as the real API: /dev/* is handled here, every other path goes straight to the real Hono app.
  const root = new Hono();
  root.use("/dev/*", cors({ origin: "*" }));
  root.get("/dev/health", (c) => c.json({ mode: "local-chain", chainId: 20200, rpcPath: "/dev/rpc", startedAt, owner: owner.address }));
  root.post("/dev/rpc", async (c) => {
    const r = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: await c.req.text() });
    return c.body(await r.text(), r.status as any, { "content-type": "application/json" });
  });
  root.post("/dev/fund", async (c) => {
    const { address } = (await c.req.json().catch(() => ({}))) as { address?: string };
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return c.json({ error: "BAD_ADDRESS" }, 400);
    const a = address as Address;
    const native = (await fundIfEmpty(pc, [a])).length > 0;
    await mint(a, 160_000_000n);
    return c.json({ address, native, ehkd: "160" });
  });
  root.get("/dev/scenes", (c) => c.json(SCENES));
  const { bus } = await import(server("wallet/events.ts"));
  /** Pocket.canPay(to, value): the code the pocket itself gives for a transfer ("OK" when it is inside the rules). */
  const canPay = async (pocket: Address, to: Address, value: bigint): Promise<string> => {
    try {
      const r = (await wallet.readContract({ address: pocket, abi: [{ type: "function", name: "canPay", stateMutability: "view", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bytes32" }] }], functionName: "canPay", args: [to, value] })) as Hex;
      return hexToString(r, { size: 32 }).replace(/\0+$/, "");
    } catch { return ""; }
  };
  // Scene 5's on-chain backstop, from the browser: the agent key really signs "send 50 eHKD to 0xABC" and a third party
  // submits it straight to the token; the pocket refuses and the tx reverts on-chain. Published as a `forced` event, so the
  // apps can show the reverted hash (the real server has no such route).
  root.post("/dev/force-transfer", async (c) => {
    const { pocket, attacker = ATTACKER } = (await c.req.json().catch(() => ({}))) as { pocket?: string; attacker?: string };
    if (!pocket || !/^0x[0-9a-fA-F]{40}$/.test(pocket)) return c.json({ error: "BAD_ADDRESS" }, 400);
    const { buildAuthorization, transferTypedData, envelope } = await import(server("wallet/scheme.ts"));
    const agent = privateKeyToAccount(DEV_KEYS.AGENT_PK);
    const sender = createWalletClient({ account: privateKeyToAccount(DEV_KEYS.FORCE_PK), chain, transport: http(rpc) }).extend(publicActions);
    const amount = 50_000_000n;
    const auth = buildAuthorization(pocket as Address, attacker as Address, amount, toHex(crypto.getRandomValues(new Uint8Array(32))), 0n);
    const sig = envelope(auth, await agent.signTypedData(transferTypedData(auth)), "0x");
    const before = await ehkdOf(pocket as Address);
    const reason = await canPay(pocket as Address, attacker as Address, amount); // why the pocket will refuse it (SELLER_NOT_ALLOWED…)
    const hash = await sender.writeContract({
      address: token, functionName: "transferWithAuthorization", gas: 200_000n, // explicit gas: the revert lands on-chain as evidence
      abi: [{ type: "function", name: "transferWithAuthorization", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes32" }, { type: "bytes" }], outputs: [] }],
      args: [auth.from, auth.to, BigInt(auth.value), 0n, BigInt(auth.validBefore), auth.nonce, sig],
    });
    const rc = await sender.waitForTransactionReceipt({ hash });
    const reverted = rc.status === "reverted";
    const after = await ehkdOf(pocket as Address);
    const why = reverted && reason && reason !== "OK" ? { reason } : {};
    bus.publish({ type: "forced" as any, pocket, tx: hash, reverted, to: attacker, amount: amount.toString(), balanceBefore: before.toString(), balanceAfter: after.toString(), ...why });
    return c.json({ tx: hash, reverted, balanceBefore: before.toString(), balanceAfter: after.toString(), ...why });
  });
  // the phone's built-in network, mirrored to the console (see relay.ts)
  root.route("/dev/relay", relayApp());
  root.all("*", (c) => api.fetch(c.req.raw));

  const apiServer = serve({ fetch: root.fetch, port: apiPort, hostname: "0.0.0.0" });

  return {
    apiUrl: `http://localhost:${apiPort}`, lanApiUrl: lan ? `http://${lan}:${apiPort}` : undefined,
    sellersUrl: process.env.SELLERS_URL!, rpc, token, factory, owner: owner.address, lan, apiPort, sellersPort,
    async stop() {
      sentinel.stop();
      await Promise.all([apiServer, sellersServer].map((s) => new Promise<void>((r) => { (s as any).closeAllConnections?.(); s.close(() => r()); })));
    },
  };
}
