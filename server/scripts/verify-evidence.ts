// Re-fetches every recorded tx hash from the chain and checks it: the tx exists, its receipt has the expected status,
// its block exists and contains it, the tx calls the recorded contract, and the expected event came from that contract.
// Nothing is trusted from the file.
// Usage: pnpm tsx scripts/verify-evidence.ts [../docs/submission/evidence/evidence-fisco.json]
import { readFileSync } from "node:fs";
import { keccak256, toHex, type Hex } from "viem";
import { pub } from "../src/wallet/chain";
import { cfg } from "../src/chains";

type Entry = { label: string; tx: Hex; expect: "success" | "reverted"; event?: string; contract?: Hex };
const file = process.argv[2] ?? new URL("../../docs/submission/evidence/evidence-fisco.json", import.meta.url).pathname;
const ev = JSON.parse(readFileSync(file, "utf8")) as { chain: string; chainId: number; entries: Entry[] };

const c = pub();
const chainId = await c.getChainId();
if (ev.chain !== cfg().key || ev.chainId !== chainId) throw new Error(`evidence is for ${ev.chain}/${ev.chainId}, RPC is ${cfg().key}/${chainId}`);

let bad = 0;
for (const e of ev.entries) {
  const problems: string[] = [];
  const tx = await c.getTransaction({ hash: e.tx }).catch(() => undefined);
  const rc = await c.getTransactionReceipt({ hash: e.tx }).catch(() => undefined);
  if (!tx) problems.push("tx not found");
  if (!rc) problems.push("receipt not found");
  else {
    if (rc.status !== e.expect) problems.push(`status ${rc.status}, expected ${e.expect}`);
    const block = await c.getBlock({ blockNumber: rc.blockNumber }).catch(() => undefined);
    if (!block) problems.push(`block ${rc.blockNumber} not found`);
    else if (!block.transactions.some((h) => (typeof h === "string" ? h : (h as any).hash).toLowerCase() === e.tx.toLowerCase())) problems.push(`block ${rc.blockNumber} does not list the tx`);
    // the tx must call the recorded contract, and the event must be emitted by it (not by some other contract)
    const target = (e.contract ?? tx?.to)?.toLowerCase();
    if (e.contract && tx?.to?.toLowerCase() !== target) problems.push(`tx calls ${tx?.to}, expected ${e.contract}`);
    if (e.event) {
      const topic = keccak256(toHex(e.event));
      if (!rc.logs.some((l) => l.topics[0] === topic && l.address.toLowerCase() === target)) problems.push(`no ${e.event} event from ${target}`);
    }
  }
  if (problems.length) bad++;
  console.log(`${problems.length ? "FAIL" : "ok  "} ${e.tx} ${rc ? `block ${rc.blockNumber}` : ""} ${e.label}${problems.length ? `: ${problems.join("; ")}` : ""}`);
}
console.log(`${ev.entries.length - bad}/${ev.entries.length} hashes valid on ${cfg().key} (chain id ${chainId})`);
process.exit(bad ? 1 : 0);
