// Dev stack support (fresh contracts on a FISCO node, scripted model). Detected by GET /dev/health; absent on the real server.
import type { Address } from "viem";

export type DevInfo = { mode: "local-chain"; chainId: number; rpcPath: string; startedAt: number; owner: Address };

type Fetch = typeof fetch;

/** null = not the dev stack (404, other mode, unreachable, or not the contract's JSON). */
export async function detectDev(api: string, f: Fetch = fetch): Promise<DevInfo | null> {
  try {
    const r = await f(`${api}/dev/health`, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.mode !== "local-chain" || typeof j.rpcPath !== "string" || typeof j.owner !== "string") return null;
    return { mode: "local-chain", chainId: Number(j.chainId) || 20200, rpcPath: j.rpcPath, startedAt: Number(j.startedAt) || 0, owner: j.owner as Address };
  } catch {
    return null;
  }
}
