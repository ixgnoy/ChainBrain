// Appends a tx hash to EVIDENCE_FILE (when set) for scripts/verify-evidence.ts to re-check on-chain. Never edited by hand.
// `contract`: the contract the tx must call and the event must come from (none for contract creations).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { cfg } from "../src/chains";

export function record(label: string, tx: string, expect: "success" | "reverted", event?: string, contract?: string) {
  const f = process.env.EVIDENCE_FILE;
  if (!f) return;
  const ev = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { chain: cfg().key, chainId: cfg().chain.id, entries: [] };
  ev.entries.push({ label, tx, expect, ...(event ? { event } : {}), ...(contract ? { contract } : {}) });
  writeFileSync(f, JSON.stringify(ev, null, 2) + "\n");
}
