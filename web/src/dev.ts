// Dev stack support (local anvil fork, scripted model). Detected by GET /dev/health; absent on the real server.
import type { Address } from "viem";
import { API } from "./shared";

export type DevInfo = { mode: "local-fork"; chainId: number; rpcPath: string; startedAt: number; owner: Address };
export type DevScene = { id: string; title: string; text: string; preset: string | null; note: string };

type Fetch = typeof fetch;

/** null = not the dev stack (404, other mode, unreachable, or not the contract's JSON). */
export async function detectDev(api = API, f: Fetch = fetch): Promise<DevInfo | null> {
  try {
    const r = await f(`${api}/dev/health`, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.mode !== "local-fork" || typeof j.rpcPath !== "string" || typeof j.owner !== "string") return null;
    return { mode: "local-fork", chainId: Number(j.chainId) || 84532, rpcPath: j.rpcPath, startedAt: Number(j.startedAt) || 0, owner: j.owner as Address };
  } catch {
    return null;
  }
}

export const devRpcUrl = (info: Pick<DevInfo, "rpcPath">, api = API) => `${api.replace(/\/$/, "")}${info.rpcPath.startsWith("/") ? "" : "/"}${info.rpcPath}`;

export async function loadScenes(api = API, f: Fetch = fetch): Promise<DevScene[]> {
  try {
    const r = await f(`${api}/dev/scenes`);
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j.filter((s) => s && typeof s.text === "string").map((s) => ({ id: String(s.id), title: String(s.title ?? ""), text: s.text, preset: s.preset ?? null, note: String(s.note ?? "") })) : [];
  } catch {
    return [];
  }
}

/** 1 ETH and 20 USDC for the dev signer, so it can create and fund pockets. */
export async function fundDevSigner(address: Address, api = API, f: Fetch = fetch): Promise<void> {
  const r = await f(`${api}/dev/fund`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address }) });
  if (!r.ok) throw new Error(`dev fund failed: HTTP ${r.status}`);
}
