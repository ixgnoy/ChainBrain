// Pure helpers for the presenter story: what is expected on the phone right now, the injected orders the agent
// ignored, and which pockets are worth listing. No React, so every rule here is tested.
import { approvalStates, eventPocket, samePocket, APPROVAL_TTL_MS, type WalletEvent } from "../lib/events";
import { cleanText } from "../lib/sanitize";
import type { PocketState } from "./chain";

// ------------------------------------------------------------------ what the phone is waiting for
export type PhoneStatusKind = "confirm" | "approve" | "answer" | "working" | "done" | "idle";
export type PhoneStatus = { kind: PhoneStatusKind; text: string };

const ACTIVITY = new Set(["intent", "approval", "question", "payment", "refusal", "disclosure"]);
const WORKING_STALE_MS = 60_000;

/**
 * What the presenter should do next, from the linked phone's own events for one pocket.
 * An approval waiting on the owner always wins; else a turn still running is "Working…"; a turn whose last word is the
 * agent's reply is "Done" (only once something happened after `since`, the moment the scene was sent).
 */
export function phoneStatus(events: WalletEvent[], opts: { since?: number; now?: number; linked?: boolean } = {}): PhoneStatus {
  const now = opts.now ?? Date.now();
  const lead = opts.linked === false ? "Waiting for you: " : "Next on the phone: ";
  const waiting = approvalStates(events)
    .filter(({ approval: a, at }) => a.status === "pending" && now - at <= APPROVAL_TTL_MS)
    .sort((a, b) => b.at - a.at)[0]?.approval;
  if (waiting) {
    return waiting.kind === "intent" ? { kind: "confirm", text: `${lead}Confirm the task` }
      : waiting.kind === "payment" ? { kind: "approve", text: `${lead}Slide to approve` }
      : { kind: "answer", text: `${lead}answer the question` };
  }
  const since = opts.since;
  const seen = events.filter((e) => (e.type === "trace" ? e.phase !== "tool" : ACTIVITY.has(e.type)) && (since == null || e.at >= since - 1500));
  const last = seen.at(-1);
  if (!last) return since != null ? { kind: "working", text: "Working…" } : { kind: "idle", text: "" };
  if (last.type === "trace" && last.phase === "reply") return since != null ? { kind: "done", text: "Done" } : { kind: "idle", text: "" };
  if (now - last.at > WORKING_STALE_MS) return { kind: "idle", text: "" };
  return { kind: "working", text: "Working…" };
}

// ------------------------------------------------------------------ injected orders in seller content
const ORDER = /(send|transfer|pay|wire)\s+[\w$.]*\s*\d|ignore (all|previous|your)|important note for ai|you are now|system:|pre-?approved|raise the (cap|limit)/i;

export type Injection = { sellerId: string; lines: string[] };

/** Instruction-like sentences in a get_quote result whose free content the agent read (the preview, or a planted `note`). */
export function injectionOf(result: any, args?: any): Injection | null {
  if (!result || typeof result !== "object" || !result.free || typeof result.content !== "string") return null;
  const body = result.content.replace(/<\/?untrusted_content[^>]*>/g, "");
  let texts: string[];
  try { const j = JSON.parse(body); texts = [j.preview, j.note].filter((x): x is string => typeof x === "string"); } catch { texts = [body]; }
  const lines = texts.flatMap((t) => t.match(/[^.!?]+[.!?]*/g) ?? []).map((l) => l.trim()).filter((l) => ORDER.test(l)).map((l) => cleanText(l, 200));
  if (!lines.length) return null;
  const sellerId = String(args?.sellerId ?? result.sellerId ?? /source="([^"]+)"/.exec(result.content)?.[1] ?? "seller");
  return { sellerId, lines };
}

/** Every injected order the agent read in these events, oldest first. */
export function injectionsIn(events: WalletEvent[]): (Injection & { at: number })[] {
  const out: (Injection & { at: number })[] = [];
  for (const e of events) {
    if (e.type !== "trace" || e.phase !== "tool_result" || e.tool !== "get_quote") continue;
    const inj = injectionOf(e.result, e.args);
    if (inj) out.push({ ...inj, at: e.at });
  }
  return out;
}

// ------------------------------------------------------------------ evidence
export type Evidence = { paid: number; lastPaidTx?: string; refused: number; blocked: number; lastBlockedTx?: string; injections: number; cosigned: number };
export function evidenceOf(events: WalletEvent[]): Evidence {
  const pays = events.filter((e) => e.type === "payment");
  const forced = events.filter((e) => e.type === "forced" && e.reverted);
  return {
    paid: pays.length, lastPaidTx: pays.at(-1)?.tx,
    refused: events.filter((e) => e.type === "refusal" || e.type === "disclosure").length,
    blocked: forced.length, lastBlockedTx: forced.at(-1)?.tx,
    injections: injectionsIn(events).length,
    cosigned: pays.filter((e) => e.cosigned).length,
  };
}

// ------------------------------------------------------------------ which pockets to list
/**
 * Pockets worth offering in pickers: drop stopped or expired pockets that hold nothing and that this story never touched,
 * unless one is chosen (or followed). With a phone linked (`phoneOnly`), only its pockets are offered. Order is kept.
 */
export function listedPockets(pockets: PocketState[], events: WalletEvent[], keep: (string | undefined)[] = [], now = Date.now(), phoneOnly?: string[]): PocketState[] {
  const phone = phoneOnly?.length ? new Set(phoneOnly.map((a) => a.toLowerCase())) : undefined;
  const touched = new Set(events.map(eventPocket).filter((p): p is string => !!p).map((p) => p.toLowerCase()));
  return pockets.filter((p) => {
    if (keep.some((k) => samePocket(k, p.address))) return true;
    if (phone && !phone.has(p.address.toLowerCase())) return false; // linked: the story is the phone's
    const dead = p.revoked || p.expiresAt * 1000 < now;
    return !(dead && p.balance === 0n && !touched.has(p.address.toLowerCase()));
  });
}

/** Names for pockets: the given name, with the short address suffix when two listed pockets share one ("Research data · 9871"). */
export function pocketNamer(pockets: PocketState[]): (address: string) => string {
  const count = new Map<string, number>();
  for (const p of pockets) if (p.name) count.set(p.name, (count.get(p.name) ?? 0) + 1);
  const by = new Map(pockets.map((p) => [p.address.toLowerCase(), p.name]));
  const tag = (a: string) => a.slice(-4).toUpperCase();
  return (a) => {
    const n = by.get(a.toLowerCase());
    if (!n) return `Pocket ${tag(a)}`;
    return (count.get(n) ?? 0) > 1 ? `${n} · ${tag(a)}` : n;
  };
}

// ------------------------------------------------------------------ plain tool-call rows for presenter mode
/** "get_quote(sellerId=datalite sku=x) → within rules" -> the part after the arrow (or nothing for a call still running). */
export const plainSummary = (title: string) => (title.includes("→") ? title.split("→").slice(1).join("→").trim() : "");
export const argsOf = (title: string) => /\((.*)\)\s*(?:→|$)/.exec(title)?.[1] ?? "";
