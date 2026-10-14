// Runtime connection state shared by the pure logic modules (no React Native imports, so Node tests can load it).
// The API URL can be overridden at run time (Settings); dev mode (local anvil fork) is detected from GET /dev/health.
import type { Address } from "viem";

export const ENV_API: string = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";
export const ENV_RPC: string = process.env.EXPO_PUBLIC_RPC_URL || "https://sepolia.base.org";

export type DevInfo = { mode: "local-fork"; chainId: number; rpcPath: string; owner?: Address; startedAt?: number };

let api = ENV_API;
let dev: DevInfo | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const normalizeUrl = (u: string) => u.trim().replace(/\/+$/, "");
export const getApi = () => api;
export const getDev = () => dev;
export const subscribeRuntime = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function setApiUrl(u: string) { api = normalizeUrl(u) || ENV_API; dev = null; emit(); }
export function setDev(d: DevInfo | null) { dev = d; emit(); }

/** RPC for chain reads and owner transactions: the dev stack's proxy in dev mode, EXPO_PUBLIC_RPC_URL otherwise. */
export const rpcUrl = () => (dev ? `${api}${dev.rpcPath}` : ENV_RPC);
/** Fork transaction hashes do not exist on Base Sepolia, so explorer links are off in dev mode. */
export const explorerEnabled = () => !dev;
export const txUrl = (h: string) => (dev ? undefined : `https://sepolia.basescan.org/tx/${h}`);
export const addressUrl = (a: string) => (dev ? undefined : `https://sepolia.basescan.org/address/${a}`);

type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any>; text(): Promise<string> }>;

/** fetch with a timeout (for health checks and polling; never used for /api/chat, which stays open for the whole agent turn). */
export async function fetchTimeout(url: string, init: any = {}, ms = 8000, f: FetchLike = (globalThis.fetch as any)) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await f(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}

/** Dev stack detection (devstack contract): GET /dev/health answers 200 JSON with mode "local-fork". The real server answers 404. */
export async function detectDev(base: string, f: FetchLike = (globalThis.fetch as any), ms = 3000): Promise<DevInfo | null> {
  try {
    const r = await fetchTimeout(`${normalizeUrl(base)}/dev/health`, {}, ms, f);
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.mode !== "local-fork") return null;
    return { mode: "local-fork", chainId: Number(j.chainId) || 84532, rpcPath: typeof j.rpcPath === "string" && j.rpcPath.startsWith("/") ? j.rpcPath : "/dev/rpc", owner: j.owner, startedAt: j.startedAt };
  } catch { return null; }
}
