// The built-in network's brain memory: after each turn it asks the same questions the server's model is asked
// (server/src/brain/reflect.ts) and answers them with fixed rules over the owner's words and typed events, the way the
// scripted agent stands in for the model. Its output goes through the same consolidate() as the server's, so the rules
// (cited sources only, memory may only narrow, bounded size, replace not stack) are the same code.
import { sellerById, sellerName } from "./catalog";
import type { Op, Reflection, Snapshot } from "./memory";
import type { SimEvent } from "./types";
import { formatUsd } from "./util";

export type Evidence = { id: string; who: "owner" | "wallet"; text: string };
export const FIXED_QUESTIONS = ["What did the owner ask for that is still open?", "Which memory item is now wrong, stale or unused?"] as const;

const hash8 = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16).padStart(8, "0"); };
export const ownerEvidence = (text: string): Evidence => ({ id: `m:${hash8(text)}`, who: "owner", text: text.slice(0, 500) });
const eid = (e: SimEvent) => `e:${e.at}`;
const usd = (v: unknown) => { try { return `US$${formatUsd(BigInt(String(v ?? 0)))}`; } catch { return "US$?"; } };
const itemOf = (sellerId: string, sku: string) => sellerById(sellerId)?.items.find((i) => i.sku === sku)?.description ?? sku;
const SELLERS = /\b(exa|coingecko|nansen|tradewire|harbour wines|shadyfeed)\b/i;

/** Answers the questions from evidence and proposes operations on the current snapshot. */
export function scriptedReflection(prev: Snapshot, owner: Evidence[], events: SimEvent[]): { reflection: Reflection; evidence: Evidence[] } {
  const ops: Op[] = [];
  const wallet: Evidence[] = [];
  const has = (kind: string, pred: (t: string) => boolean) => prev.items.find((i) => i.kind === kind && pred(i.text));
  const stale: string[] = [];

  // the owner's own words: preferences and "never" rules (a "never" narrows, so it is always allowed)
  for (const m of owner) {
    const t = m.text;
    const pref = /\bi (?:prefer|like|trust)\s+(exa|coingecko|nansen|tradewire|harbour wines)\b/i.exec(t);
    if (pref) ops.push({ op: "add", kind: "preference", text: `Prefers ${sellerName(pref[1].toLowerCase().replace(" ", "-"))}`, source: m.id, effect: "neutral" });
    const never = /\b(?:never|don'?t ever|do not)\s+(buy|use|pay)\s+([^.,!?]{3,40})/i.exec(t);
    if (never) ops.push({ op: "add", kind: "preference", text: `Never ${never[1].toLowerCase()} ${never[2].trim()}`, source: m.id, effect: "narrow" });
    if (/\bper report\b/i.test(t)) ops.push({ op: "add", kind: "preference", text: "Price limits are per report, not for the whole task", source: m.id, effect: "neutral" });
  }

  // typed events from this turn
  let paid = false;
  for (const e of events) {
    if (e.type === "payment") {
      paid = true;
      const text = `Bought "${itemOf(e.sellerId, e.sku)}" from ${sellerName(e.sellerId)} for ${usd(e.amount)}${e.cosigned ? ", co-signed by the owner" : ""}`;
      wallet.push({ id: eid(e), who: "wallet", text });
      ops.push({ op: "add", kind: "fact", text, source: eid(e), effect: "neutral" });
    } else if (e.type === "radar" && e.kind === "screen" && typeof e.counterparty === "string") {
      const name = e.counterparty;
      const note = has("seller_note", (t) => t.startsWith(`${name}: Radar`));
      if (e.verdict !== "ok") {
        const text = `${name}: Radar ${e.score}/10${e.reasons?.[0] ? ` (${String(e.reasons[0]).toLowerCase()})` : ""}. Avoid.`;
        wallet.push({ id: eid(e), who: "wallet", text: `radar ${name} ${e.score}/10 ${e.verdict}` });
        ops.push(note ? { op: "update", id: note.id, text, source: eid(e), effect: "narrow" } : { op: "add", kind: "seller_note", text, source: eid(e), effect: "narrow" });
      } else if (note) {
        ops.push({ op: "delete", id: note.id });
        stale.push(note.text);
      }
    } else if (e.type === "disclosure" && typeof e.sellerId === "string") {
      const text = `${sellerName(e.sellerId)} asked for personal data or a signature. Avoid.`;
      wallet.push({ id: eid(e), who: "wallet", text: `${e.sellerId} asked for data or a signature: refused` });
      ops.push({ op: "add", kind: "seller_note", text, source: eid(e), effect: "narrow" });
    } else if ((e.type === "intent") && e.approval?.status === "approved") {
      const what = /^Buy: (.+)$/m.exec(String(e.approval.text ?? ""))?.[1] ?? "a task";
      wallet.push({ id: eid(e), who: "wallet", text: `owner approved the task: ${what}` });
      ops.push({ op: "add", kind: "open_task", text: `Task: ${what}`, source: eid(e), effect: "neutral" });
    }
  }
  // Q2: an open task with a payment after it is done; drop it (and say so)
  if (paid) {
    for (const i of prev.items.filter((x) => x.kind === "open_task")) { ops.push({ op: "delete", id: i.id }); stale.push(i.text); }
    for (let k = ops.length - 1; k >= 0; k--) if (ops[k].op === "add" && ops[k].kind === "open_task") ops.splice(k, 1);
  }

  // the answers, from what the snapshot will hold
  const added = (kind: string) => ops.filter((o) => o.op === "add" && o.kind === kind).map((o) => o.text!);
  const keepKind = (kind: string) => prev.items.filter((i) => i.kind === kind && !ops.some((o) => o.op === "delete" && o.id === i.id)).map((i) => i.text);
  const open = [...keepKind("open_task"), ...added("open_task")];
  const avoid = [...new Set([...keepKind("seller_note"), ...added("seller_note")].map((t) => SELLERS.exec(t)?.[1]).filter(Boolean) as string[])];
  const bought = [...new Set([...keepKind("fact"), ...added("fact")].filter((t) => t.startsWith("Bought ")).map((t) => t.toLowerCase()))];
  const prefs = [...keepKind("preference"), ...added("preference")];
  const questions = [
    { q: FIXED_QUESTIONS[0], a: open.length ? open.join("; ") : "Nothing is open." },
    { q: FIXED_QUESTIONS[1], a: stale.length ? `Stale: ${stale.join("; ")}` : "Nothing is stale." },
    { q: "Which sellers should I avoid next time?", a: avoid.length ? avoid.join(", ") : "None so far." },
    { q: "What has the owner already bought?", a: bought.length ? `${bought.length} item${bought.length === 1 ? "" : "s"}` : "Nothing yet." },
  ];
  const summary = [
    prefs.length ? `${prefs.join(". ")}.` : "",
    avoid.length ? `Avoid ${avoid.join(" and ")}.` : "",
    bought.length ? `Already bought ${bought.length} item${bought.length === 1 ? "" : "s"}.` : "",
    open.length ? `Open: ${open.join("; ")}.` : "",
  ].filter(Boolean).join(" ");
  return { reflection: { questions, ops, summary }, evidence: [...owner, ...wallet] };
}
