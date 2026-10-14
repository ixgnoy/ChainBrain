// Dev stack support (local anvil fork, scripted model). Detected by GET /dev/health; absent on the real server.
import type { Address } from "viem";
import { API } from "./shared";

export type DevInfo = { mode: "local-fork"; chainId: number; rpcPath: string; startedAt: number; owner: Address };

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
