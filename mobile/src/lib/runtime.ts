// Runtime connection state shared by the pure logic modules (no React Native imports, so Node tests can load it).
// The API URL can be overridden at run time (Settings); dev mode (the dev stack on a FISCO node) is detected from GET /dev/health.
import type { Address } from "viem";

/** The hosted ChainBrain API (Railway): the app opens on the real FISCO chain unless EXPO_PUBLIC_API_URL says otherwise. */
export const HOSTED_API = "https://fisco-api-production-85c5.up.railway.app";
export const ENV_API: string = process.env.EXPO_PUBLIC_API_URL || HOSTED_API;
export const ENV_RPC: string = process.env.EXPO_PUBLIC_RPC_URL || "https://fisco-node-production.up.railway.app";

/** The server's FISCO chain, from /api/config: its RPC, explorer link and the Mock e-HKD's signing domain. */
export type ChainProfile = { key: "fisco"; id: number; name: string; rpc: string; domain: { name: string; version: string }; currency: string; txUrl: string; token: Address };
let chain: ChainProfile | null = null;

export type DevInfo = { mode: "local-chain"; chainId: number; rpcPath: string; owner?: Address; startedAt?: number };
/** Where data comes from: a ChainBrain server on the real FISCO chain (the default) or the demo network built into the app (Settings). */
export type Source = "builtin" | "server";

let api = ENV_API;
let dev: DevInfo | null = null;
let source: Source = "server";
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const normalizeUrl = (u: string) => u.trim().replace(/\/+$/, "");
/** Only http(s) servers: anything else ("javascript:", "file:", a typo) is never saved or fetched. */
export const isHttpUrl = (u: string) => /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(normalizeUrl(u));
export const getApi = () => api;
export const getDev = () => dev;
export const getSource = () => source;
export const isBuiltin = () => source === "builtin";
/** The live server's chain; null on the built-in network. */
export const getChain = () => (source === "server" ? chain : null);
export function setChain(c: ChainProfile | null) { chain = c; emit(); }
/** Money is Mock e-HKD everywhere: HK$ amounts, the eHKD token. */
export const curSign = () => "HK$";
export const tokenSymbol = () => "eHKD";
export function setSource(s: Source) { source = s; dev = null; emit(); }
export const subscribeRuntime = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function setApiUrl(u: string) { api = normalizeUrl(u) || ENV_API; dev = null; emit(); }
export function setDev(d: DevInfo | null) { dev = d; emit(); }

/** RPC for chain reads and owner transactions: the dev stack's proxy in dev mode, EXPO_PUBLIC_RPC_URL otherwise. */
export const rpcUrl = () => (dev ? `${api}${dev.rpcPath}` : process.env.EXPO_PUBLIC_RPC_URL || getChain()?.rpc || ENV_RPC);
/** Built-in and dev-stack hashes are not on the FISCO chain, so explorer links are on only against a real server. */
export const explorerEnabled = () => !dev && source === "server";
// FISCO has no public explorer: the server hosts a read-only one (txUrl prefix from /api/config, ".../explorer#/tx/").
export const txUrl = (h: string) => (explorerEnabled() && chain ? `${chain.txUrl}${h}` : undefined);
export const addressUrl = (a: string) => (explorerEnabled() && chain ? `${chain.txUrl.replace(/tx\/$/, "address/")}${a}` : undefined);

type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any>; text(): Promise<string> }>;

/** fetch with a timeout (for health checks and polling; never used for /api/chat, which stays open for the whole agent turn). */
export async function fetchTimeout(url: string, init: any = {}, ms = 8000, f: FetchLike = (globalThis.fetch as any)) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await f(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}

/** Dev stack detection (devstack contract): GET /dev/health answers 200 JSON with mode "local-chain". The real server answers 404. */
export async function detectDev(base: string, f: FetchLike = (globalThis.fetch as any), ms = 3000): Promise<DevInfo | null> {
  try {
    const r = await fetchTimeout(`${normalizeUrl(base)}/dev/health`, {}, ms, f);
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.mode !== "local-chain") return null;
    return { mode: "local-chain", chainId: Number(j.chainId) || 20200, rpcPath: typeof j.rpcPath === "string" && j.rpcPath.startsWith("/") ? j.rpcPath : "/dev/rpc", owner: j.owner, startedAt: j.startedAt };
  } catch { return null; }
}
