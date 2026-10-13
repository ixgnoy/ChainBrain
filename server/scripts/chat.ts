// Terminal chat with the agent against a pocket (scenes 1–2 before the app exists).
// You play the owner: confirm intents, approve payments (signed with OWNER_PK), answer questions.
// Usage: pnpm chat <pocket>   (with `pnpm sellers` running)
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import { runTurn, type TurnResult } from "../src/agent/loop";
import { bus } from "../src/wallet/events";
import { approvals, type Approval } from "../src/wallet/approvals";
import { transferTypedData } from "../src/wallet/scheme";

const pocket = process.argv[2] as Address;
if (!pocket) throw new Error("usage: pnpm chat <pocket>");
const owner = privateKeyToAccount(process.env.OWNER_PK as Hex);
const rl = createInterface({ input: stdin, output: stdout });
let busy = false, closed = false;
rl.on("close", () => (busy ? (closed = true) : process.exit(0))); // end of input (Ctrl-D, piped stdin) ends the session after the current turn

bus.subscribe(async (e) => {
  if (e.type === "trace" && e.phase === "tool_call") console.log(`  → ${e.tool} ${JSON.stringify(e.args)}`);
  if (e.type === "trace" && e.phase === "tool_result") console.log(`  ← ${JSON.stringify(e.result).slice(0, 220)}`);
  if (e.type === "payment") console.log(`  ✓ paid ${e.sellerId} tx https://sepolia.basescan.org/tx/${e.tx}`);
  const a = e.approval as Approval | undefined;
  if (!a || a.status !== "pending") return;
  if (a.kind === "intent") {
    console.log(`\nINTENT\n${a.text}`);
    approvals.resolve(a.id, { approved: (await rl.question("confirm? (y/n) ")).trim() === "y" });
  }
  if (a.kind === "payment") {
    const d = a.data as any;
    console.log(`\nAPPROVAL: ${d.amount} to ${d.sellerId} (${d.description})\nagent: ${a.text}`);
    const yes = (await rl.question("approve and sign? (y/n) ")).trim() === "y";
    approvals.resolve(a.id, yes ? { approved: true, signature: await owner.signTypedData(transferTypedData(d.auth)) } : { approved: false });
  }
});

let history: TurnResult["history"] = [];
for (;;) {
  const text = await rl.question("\nyou> ");
  if (!text.trim()) continue;
  for (const q of approvals.pending(pocket).filter((x) => x.kind === "question")) approvals.resolve(q.id, { approved: true, answer: text });
  busy = true;
  const out = await runTurn({ pocket }, history, text);
  history = out.history;
  console.log(`agent> ${out.reply}`);
  busy = false;
  if (closed) process.exit(0);
}
