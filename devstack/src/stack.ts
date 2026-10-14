import { spawn, type ChildProcess } from "node:child_process";
import { networkInterfaces } from "node:os";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createWalletClient, http, publicActions, keccak256, encodeAbiParameters, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { scriptedModel } from "./model";
import { SCENES } from "./scenes";

// Anvil's well-known dev keys (public; never use outside a local fork). Same as server/test/helpers/env.ts.
export const DEV_KEYS = {
  OWNER_PK: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  AGENT_PK: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  SELLER_DATALITE_PK: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  SELLER_DATAPRO_PK: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  SELLER_HARBOUR_WINES_PK: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  SELLER_SHADYFEED_PK: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  FACILITATOR_PK: "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  FORCE_PK: "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
} as const;

const USDC: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_BALANCE_SLOT = 9n; // FiatTokenV2_2 balanceAndBlacklistStates mapping (as in server/test/helpers/fork.ts)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const server = (rel: string) => new URL(`../../server/src/${rel}`, import.meta.url).href;

export type DevStackOptions = {
  apiPort?: number; sellersPort?: number; anvilPort?: number;
  forkUrl?: string; revokeWindowMs?: number; ownerUsdc?: number; log?: (s: string) => void;
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

/** Start anvil forking Base Sepolia; retries with backoff when the public RPC rate-limits or hiccups. */
async function startAnvil(port: number, forkUrl: string, log: (s: string) => void): Promise<ChildProcess> {
  const rpc = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PATH: `${process.env.PATH}:${homedir()}/.foundry/bin` };
  let lastErr = "";
  for (let attempt = 1; attempt <= 5; attempt++) {
    const child = spawn("anvil", ["--fork-url", forkUrl, "--host", "127.0.0.1", "--port", String(port), "--chain-id", "84532", "--silent"], { stdio: ["ignore", "ignore", "pipe"], env });
    let stderr = "";
    let exited = false;
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("exit", () => (exited = true));
    child.on("error", (e) => { stderr += String(e); exited = true; });
    for (let i = 0; i < 150 && !exited; i++) {
      const ok = await rpcCall(rpc, "eth_chainId").then(() => true, () => false);
      if (ok) return child;
      await sleep(200);
    }
    lastErr = stderr.trim().split("\n").slice(-3).join(" | ");
    child.kill();
    if (/ENOENT/.test(lastErr)) throw new Error("anvil not found: install Foundry (curl -L https://foundry.paradigm.xyz | bash, then foundryup)");
    if (/in use/i.test(lastErr)) throw new Error(`port ${port} is already in use (is another dev stack running?)`);
    log(`anvil attempt ${attempt} failed (${lastErr || "timeout"}); retrying`);
    await sleep(1000 * attempt);
  }
  throw new Error(`anvil could not fork ${forkUrl}: ${lastErr}`);
}

/** Boots anvil (fork), the factory, the real sellers and the real wallet API with a scripted model. */
export async function startDevStack(o: DevStackOptions = {}) {
  const apiPort = o.apiPort ?? 8787, sellersPort = o.sellersPort ?? 4021, anvilPort = o.anvilPort ?? 8546;
  const log = o.log ?? (() => {});
  const startedAt = Date.now();
  const rpc = `http://127.0.0.1:${anvilPort}`;
  const anvil = await startAnvil(anvilPort, o.forkUrl ?? process.env.FORK_URL ?? "https://sepolia.base.org", log);

  const lan = lanIp();
  Object.assign(process.env, DEV_KEYS, {
    BASE_SEPOLIA_RPC: rpc, FACILITATOR: "local", SELLERS_URL: `http://${lan ?? "localhost"}:${sellersPort}`,
  });

  const { factoryArtifact, factoryAbi } = await import(server("wallet/chain.ts"));
  const owner = privateKeyToAccount(DEV_KEYS.OWNER_PK);
  const wallet = createWalletClient({ account: owner, chain: baseSepolia, transport: http(rpc) }).extend(publicActions);
  const deployHash = await wallet.deployContract({ abi: factoryAbi, bytecode: factoryArtifact.bytecode.object as Hex, args: [USDC] });
  const factory = (await wallet.waitForTransactionReceipt({ hash: deployHash })).contractAddress!;
  process.env.FACTORY_ADDRESS = factory;

  const setUsdc = async (addr: Address, amount: bigint) => {
    const slot = keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [addr, USDC_BALANCE_SLOT]));
    await rpcCall(rpc, "anvil_setStorageAt", [USDC, slot, toHex(amount, { size: 32 })]);
  };
  const usdcOf = async (addr: Address): Promise<bigint> => BigInt(await rpcCall(rpc, "eth_call", [{ to: USDC, data: `0x70a08231${addr.slice(2).toLowerCase().padStart(64, "0")}` }, "latest"]));
  await setUsdc(owner.address, BigInt(Math.round((o.ownerUsdc ?? 1000) * 1e6)));

  const { sellersApp } = await import(server("sellers.ts"));
  const { apiApp } = await import(server("index.ts"));
  const sellersServer = serve({ fetch: sellersApp().fetch, port: sellersPort, hostname: "0.0.0.0" });
  const api = apiApp({ model: scriptedModel({ revokeWindowMs: o.revokeWindowMs }) });

  // Same origin as the real API: /dev/* is handled here, every other path goes straight to the real Hono app.
  const root = new Hono();
  root.use("/dev/*", cors({ origin: "*" }));
  root.get("/dev/health", (c) => c.json({ mode: "local-fork", chainId: 84532, rpcPath: "/dev/rpc", startedAt, owner: owner.address }));
  root.post("/dev/rpc", async (c) => {
    const r = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: await c.req.text() });
    return c.body(await r.text(), r.status as any, { "content-type": "application/json" });
  });
  root.post("/dev/fund", async (c) => {
    const { address } = (await c.req.json().catch(() => ({}))) as { address?: string };
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return c.json({ error: "BAD_ADDRESS" }, 400);
    const a = address as Address;
    const eth = BigInt(await rpcCall(rpc, "eth_getBalance", [a, "latest"]));
    await rpcCall(rpc, "anvil_setBalance", [a, toHex(eth + 10n ** 18n)]);
    await setUsdc(a, (await usdcOf(a)) + 20_000_000n);
    return c.json({ address, eth: "1", usdc: "20" });
  });
  root.get("/dev/scenes", (c) => c.json(SCENES));
  root.all("*", (c) => api.fetch(c.req.raw));

  const apiServer = serve({ fetch: root.fetch, port: apiPort, hostname: "0.0.0.0" });

  return {
    apiUrl: `http://localhost:${apiPort}`, lanApiUrl: lan ? `http://${lan}:${apiPort}` : undefined,
    sellersUrl: process.env.SELLERS_URL!, rpc, factory, owner: owner.address, lan, apiPort, sellersPort, anvilPort,
    async stop() {
      await Promise.all([apiServer, sellersServer].map((s) => new Promise<void>((r) => { (s as any).closeAllConnections?.(); s.close(() => r()); })));
      anvil.kill();
    },
  };
}
