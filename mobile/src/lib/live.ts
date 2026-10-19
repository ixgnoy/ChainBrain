// The Live tab's stream: the decision points of every agent, newest first, from the same events as everything else (the
// Smashing Magazine "transparency moments" idea: show decisions by impact, hide routine reads). One card per decision:
// paid (on its own or co-signed), refused by the contract or the wallet, a seller's text that tried to give the agent
// orders (ignored), a chat attack refused, the Sentinel freezing a pocket, a price watch that checked and waited, a routine
// run. Requests waiting for the owner are pinned on top by the screen, from `pending`. Nothing here is invented: each card
// carries the event it came from.
import type { WalletEvent } from "./events";
import { sentinelEvents, toolResultOf } from "./events";
import { plainReason } from "./plain";
import { curSign } from "./runtime";

export type LiveKind = "paid" | "cosigned" | "refused" | "ignored" | "attack" | "freeze" | "watched" | "run";
export type LiveCard = {
  key: string; at: number; kind: LiveKind; pocket?: string; agent?: string; sellerId?: string; amount?: string;
  /** the headline, a few words */ title: string; /** one plain line */ why?: string;
  /** what the seller or the chat said (quoted, never obeyed) */ quote?: string; tx?: string; reason?: string;
};

// HK$ with 2 decimals (3 below HK$0.10, trimmed to 2 when the third is 0): HK$2.30, HK$0.056, HK$0.08
const amt = (units: unknown) => { try { const n = Number(BigInt(String(units ?? 0))) / 1e6; return `${curSign()}${n < 0.1 ? n.toFixed(3).replace(/0$/, "") : n.toFixed(2)}`; } catch { return ""; } };

export function liveCards(events: WalletEvent[], o: { agentOf(pocket?: string): string | undefined; sellerName(id?: string): string; days?: number; now?: number }): LiveCard[] {
  const since = (o.now ?? Date.now()) - (o.days ?? 14) * 86_400_000;
  const out: LiveCard[] = [];
  const sn = (id?: string) => o.sellerName(id);
  for (const e of events) {
    if (e.at < since) continue;
    const base = { at: e.at, pocket: e.pocket, agent: o.agentOf(e.pocket), sellerId: e.sellerId };
    if (e.type === "payment") out.push({ ...base, key: `pay:${e.tx ?? e.at}`, kind: e.cosigned ? "cosigned" : "paid", amount: amt(e.amount), tx: e.tx,
      title: `Paid ${sn(e.sellerId)}`, why: e.cosigned ? "You co-signed it" : e.routine ? `Routine run ${e.routine.run}, inside its allowance` : "Inside the card's rules" });
    else if (e.type === "refusal") out.push({ ...base, key: `ref:${e.at}:${e.sellerId}`, kind: "refused", amount: e.amount ? amt(e.amount) : undefined, reason: e.reason,
      title: `${sn(e.sellerId)} refused`, why: plainReason(String(e.reason ?? "")) });
    else if (e.type === "forced" && e.reverted) out.push({ ...base, key: `forced:${e.tx}`, kind: "refused", amount: amt(e.amount), tx: e.tx,
      title: "Transfer blocked on-chain", why: "Money to an address not on the list: the contract reverted it" });
    else if (e.type === "routine" && e.kind === "ignored") out.push({ ...base, key: `ign:${e.at}:${e.sellerId}`, kind: "ignored", quote: e.excerpt,
      title: `${sn(e.sellerId)} tried to give orders`, why: "Ignored: a routine is fixed fields you signed" });
    else if (e.type === "attack") out.push({ ...base, key: `atk:${e.at}`, kind: e.verdict === "fooled" ? "refused" : "attack", quote: e.text,
      title: e.verdict === "fooled" ? "A fooled agent tried to send money" : "A chat message tried to take over", why: e.verdict === "fooled" ? "The card contract refused it" : "Refused: only your key changes the rules" });
    else if (e.type === "quote" && e.limit != null && !e.below) out.push({ ...base, key: `q:${e.at}`, kind: "watched", amount: amt(e.price),
      title: `Checked ${sn(e.sellerId)}'s price`, why: `Above your ${amt(e.limit)} limit, so it waited` });
    else if (e.type === "routine" && e.kind === "run" && !(Array.isArray(e.outs) && e.outs.length)) out.push({ ...base, key: `run:${e.routineId}:${e.run}`, kind: "run",
      title: `Routine run ${e.run}`, why: "Nothing to pay" });
  }
  // the ignored seller orders found in quote results (the injection the wallet quoted and dropped)
  for (const e of events) {
    if (e.at < since || e.type !== "trace" || e.phase !== "tool_result" || e.tool !== "get_quote") continue;
    const r = toolResultOf(e);
    const content = typeof r?.content === "string" ? r.content : typeof r?.text === "string" ? r.text : "";
    const m = /(ignore (?:all |your |previous )?(?:instructions|rules)[^.<"]*|send \d+ ?(?:USDC|eHKD|HKD)[^.<"]*)/i.exec(content);
    if (m) out.push({ at: e.at, pocket: e.pocket, agent: o.agentOf(e.pocket), sellerId: e.args?.sellerId, key: `inj:${e.at}`, kind: "ignored", quote: m[1].slice(0, 140),
      title: `${sn(e.args?.sellerId)}'s page tried to give orders`, why: "Ignored: seller text is data, never an instruction" });
  }
  for (const v of sentinelEvents(events)) if (v.kind === "freeze" && v.at >= since) out.push({ key: v.key, at: v.at, kind: "freeze", pocket: v.pocket, agent: o.agentOf(v.pocket), tx: v.tx,
    title: "Sentinel froze the card", why: v.signals[0]?.text ?? "Payments stopped on-chain until you unfreeze" });
  return out.sort((a, b) => b.at - a.at);
}

/** One line for "now": who is doing what, or what is coming. */
export function nowLine(o: { asks: { agent?: string; amount?: string; seller?: string }[]; busy: boolean; running: { agent?: string; pocket: string }[]; watching: number; next?: { name: string; when: string }; agentName(id?: string): string }) {
  const a = o.asks[0];
  if (a) return { agent: a.agent ?? "chainbrain", tone: "wait" as const, text: `${o.agentName(a.agent)} is waiting for your co-signature${a.amount ? ` · ${a.amount}` : ""}` };
  if (o.running[0]) return { agent: o.running[0].agent ?? "chainbrain", tone: "live" as const, text: `${o.agentName(o.running[0].agent)} is running ${o.running[0].pocket}'s routine` };
  if (o.busy) return { agent: "chainbrain", tone: "live" as const, text: "ChainBrain is working on your task" };
  return { agent: "chainbrain", tone: "idle" as const, text: `Watching ${o.watching} ${o.watching === 1 ? "card" : "cards"}${o.next ? ` · next: ${o.next.name} ${o.next.when}` : ""}` };
}

