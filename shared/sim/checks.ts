// The path every payment (and every attack) travels, as the apps draw it: agent → wallet tools → pocket contract →
// seller. Pure: it reads the wallet event stream (the real server's or the built-in network's, they are the same shape)
// and says, for each attempt, which checks it passed and which one stopped it. The order of the contract checks is
// Pocket.sol's own (isValidSignature: exact USDC transfer signed by the agent key, then canPay, then the owner's
// co-signature above the ask-me limit), so the reason code alone tells which gate refused.
import { REASONS } from "./intent";

type Ev = { type: string; pocket?: string; at: number; [k: string]: any };

export type Layer = "agent" | "tools" | "contract" | "seller";
export type GateId = "agent" | "intent" | "privacy" | "signature" | "owner" | "active" | "seller" | "cap" | "budget" | "cosign" | "paid";
/** pass: let it through · stop: refused it here · skip: not needed or bypassed · idle: never reached · fooled: the AI believed the attacker. */
export type GateState = "pass" | "stop" | "skip" | "idle" | "fooled";
export type Gate = { id: GateId; layer: Layer; title: string; state: GateState; code?: string; note?: string };

export type AttemptKind = "payment" | "refusal" | "precheck" | "forced" | "hijack" | "escalation" | "extraction" | "induced" | "disclosure" | "injection";
export type Attempt = {
  id: string; at: number; pocket?: string; kind: AttemptKind;
  /** "Exa · US$0.007", "0x0000…ABC0 · US$50.00". */
  title: string;
  /** One plain sentence for the big screen. */
  headline: string;
  sellerId?: string; to?: string; amount?: string; tx?: string; txs?: string[];
  gates: Gate[];
  stoppedAt?: GateId; code?: string;
  verdict: "paid" | "blocked" | "refused";
  /** The AI believed the attacker, and a later check (the pocket) held. */
  aiFooled: boolean;
  /** One of the four attacks the rules name, when it is one. */
  attack?: "induced" | "extraction" | "escalation" | "injection";
};

export const GATES: Record<GateId, { layer: Layer; title: string; plain: string }> = {
  agent: { layer: "agent", title: "Agent", plain: "The AI decides what to try. It can be fooled; nothing below depends on it." },
  intent: { layer: "tools", title: "Task you confirmed", plain: "The wallet tools only sign a payment that fits the task the owner confirmed: price per item, total, item count, deadline." },
  privacy: { layer: "tools", title: "Nothing to leak", plain: "No tool returns the owner's key, main wallet, other pockets or the agent's instructions, and the wallet signs only USDC payments it built." },
  signature: { layer: "contract", title: "Signature check (ERC-1271)", plain: "The pocket approves only an exact USDC transfer out of itself, signed by the agent's key." },
  owner: { layer: "contract", title: "Owner-only rules", plain: "Cap, sellers, ask-me limit and expiry change only in a transaction from the owner's key." },
  active: { layer: "contract", title: "Pocket active", plain: "A revoked, frozen or expired pocket pays no one." },
  seller: { layer: "contract", title: "Allowed seller", plain: "Money can only go to sellers on the pocket's list." },
  cap: { layer: "contract", title: "Per-payment cap", plain: "No single payment above the cap." },
  budget: { layer: "contract", title: "Pocket balance", plain: "The worst case is what is in the pocket; the main wallet is out of reach." },
  cosign: { layer: "contract", title: "Ask-me limit", plain: "Above the ask-me limit the owner's own signature on this exact transfer is required." },
  paid: { layer: "seller", title: "Seller paid", plain: "USDC arrives at the seller, with a transaction hash." },
};

/** The payment path, in order. */
export const PAY_PATH: GateId[] = ["agent", "intent", "signature", "active", "seller", "cap", "budget", "cosign", "paid"];

/** Which gate a refusal code belongs to. */
export function gateOf(code?: string): GateId {
  switch (code) {
    case "INTENT_NOT_CONFIRMED": case "INTENT_EXPIRED": case "PRICE_ABOVE_INTENT": case "INTENT_TOTAL_REACHED": case "INTENT_ITEMS_REACHED": case "QUOTE_MISMATCH": case "QUOTE_UNKNOWN": case "QUOTE_ALREADY_PAID":
      return "intent";
    case "COUNTERPARTY_HIGH_RISK": return "intent"; // Radar: the wallet tools refuse to sign for a seller whose money traces to a drainer
    case "COUNTERPARTY_REVIEW": case "SENTINEL_HOLD": return "cosign"; // Radar's review / the Sentinel's hold: only the owner's signature lets it through
    case "POCKET_REVOKED": case "POCKET_FROZEN": case "POCKET_EXPIRED": return "active";
    case "SELLER_NOT_ALLOWED": return "seller";
    case "OVER_CAP": return "cap";
    case "OVER_BUDGET": return "budget";
    case "NEEDS_OWNER_APPROVAL": case "OWNER_DECLINED": case "APPROVAL_EXPIRED": return "cosign";
    case "NOT_OWNER": return "owner";
    case "DISCLOSURE_REFUSED": case "SIGNATURE_TYPE_NOT_ALLOWED": return "privacy";
    case "NOT_A_PURCHASE": return "agent";
    default: return "signature";
  }
}

const usdOf = (v: unknown): string | undefined => {
  if (v == null || v === "") return undefined;
  try {
    const n = BigInt(String(v));
    const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
    return `${n / 1_000_000n}.${frac}`;
  } catch { return /^\d+(\.\d+)?$/.test(String(v)) ? Number(v).toFixed(2) : undefined; }
};
const short = (a?: string) => (a && /^0x[0-9a-fA-F]{8,}$/.test(a) ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "");

/** Builds a path: gates before `stop` pass, `stop` is the refusing gate, the rest are never reached. */
function walk(path: GateId[], stop: GateId | undefined, code: string | undefined, over: Partial<Record<GateId, Partial<Gate>>> = {}): Gate[] {
  let reached = true;
  return path.map((id) => {
    const g: Gate = { id, layer: GATES[id].layer, title: GATES[id].title, state: reached ? "pass" : "idle" };
    if (reached && id === stop) { g.state = "stop"; g.code = code; reached = false; }
    return { ...g, ...over[id] } as Gate;
  });
}

// ------------------------------------------------------------------ injected orders in content the agent read

const ORDER = /(send|transfer|pay|wire)\s+[\w$.]*\s*\d|ignore (all|previous|your)|important note for ai|you are now|system:|pre-?approved|raise the (cap|limit)/i;
export type Injection = { sellerId: string; lines: string[] };
/** Instruction-like sentences in a get_quote result whose free content the agent read (the preview, or a planted `note`). */
export function injectionOf(result: any, args?: any): Injection | null {
  if (!result || typeof result !== "object" || !result.free || typeof result.content !== "string") return null;
  const body = result.content.replace(/<\/?untrusted_content[^>]*>/g, "");
  let texts: string[];
  try { const j = JSON.parse(body); texts = [j.preview, j.note].filter((x): x is string => typeof x === "string"); } catch { texts = [body]; }
  const lines = texts.flatMap((t) => t.match(/[^.!?]+[.!?]*/g) ?? []).map((l) => l.replace(/\s+/g, " ").trim().slice(0, 200)).filter((l) => ORDER.test(l));
  if (!lines.length) return null;
  const sellerId = String(args?.sellerId ?? result.sellerId ?? /source="([^"]+)"/.exec(result.content)?.[1] ?? "seller");
  return { sellerId, lines };
}

/** A tool event carrying args and result (server/src/wallet/tools.ts publishes phase "tool"; "tool_result" repeats the result only). */
const toolEv = (e: Ev, tool: string) => e.type === "trace" && e.phase === "tool" && e.tool === tool;

// ------------------------------------------------------------------ attempts

export type AttemptOptions = { sellerName?: (id: string) => string; payToName?: (address: string) => string | undefined };

/** Every attempt in these events, oldest first. */
export function attemptsFrom(events: Ev[], o: AttemptOptions = {}): Attempt[] {
  const name = (id?: string) => (id ? o.sellerName?.(id) ?? id : "seller");
  const out: Attempt[] = [];
  // a quote refused at quote time becomes an attempt only when no pay was tried for it (then the refusal event says it)
  const refusedLater = (e: Ev, i: number) => events.slice(i + 1, i + 60).some((x) => x.type === "refusal" && x.pocket === e.pocket && x.sellerId === (e.args?.sellerId ?? e.result?.sellerId));
  const seenQuote = new Set<string>();
  const seenInj = new Set<string>();

  events.forEach((e, i) => {
    const id = String(e.id ?? `${e.type}:${e.at}:${e.tx ?? e.sellerId ?? e.tool ?? ""}`);
    const base = { id, at: e.at, pocket: e.pocket };
    if (e.type === "payment") {
      const amount = usdOf(e.amount);
      out.push({
        ...base, kind: "payment", sellerId: e.sellerId, amount, tx: e.tx, title: `${name(e.sellerId)} · US$${amount}`,
        headline: e.cosigned ? `Paid ${name(e.sellerId)} US$${amount} with your co-signature.` : `Paid ${name(e.sellerId)} US$${amount}, inside every rule.`,
        gates: walk(PAY_PATH, undefined, undefined, { cosign: e.cosigned ? { state: "pass", note: "Co-signed by the owner" } : { state: "skip", note: "Under the ask-me limit" } }),
        verdict: "paid", aiFooled: false,
      });
    } else if (e.type === "refusal") {
      const gate = gateOf(e.reason);
      const amount = usdOf(e.amount);
      out.push({
        ...base, kind: "refusal", sellerId: e.sellerId, amount, code: e.reason, stoppedAt: gate, title: `${name(e.sellerId)}${amount ? ` · US$${amount}` : ""}`,
        headline: `${GATES[gate].title} stopped ${name(e.sellerId)}${amount ? ` US$${amount}` : ""}: ${(REASONS[e.reason] ?? e.reason ?? "refused").replace(/\.$/, "")}.`,
        gates: walk(PAY_PATH, gate, e.reason), verdict: "blocked", aiFooled: false,
      });
    } else if (toolEv(e, "get_quote") && e.result?.ok && !e.result.free) {
      const r = e.result;
      const pocketCode = r.allowedByPocket && r.allowedByPocket !== "OK" ? r.allowedByPocket.reason : undefined;
      const intentCode = r.intentCheck && r.intentCheck !== "OK" ? r.intentCheck.reason : undefined;
      // a quote is a view call: both checks run. The pocket's hard rule is the one named (it is what a fix must change).
      const code = pocketCode ?? intentCode;
      const key = `${e.pocket}:${r.quoteId}`;
      if (!code || seenQuote.has(key) || refusedLater(e, i)) return;
      seenQuote.add(key);
      const gate = gateOf(code);
      const gates = walk(PAY_PATH, gate, code);
      if (pocketCode && intentCode) Object.assign(gates.find((g) => g.id === "intent")!, { state: "stop", code: intentCode });
      out.push({
        ...base, kind: "precheck", sellerId: r.sellerId, amount: r.price, code, stoppedAt: gate, title: `${name(r.sellerId)} · US$${r.price}`,
        headline: `Checked before paying: ${name(r.sellerId)} US$${r.price} fails ${GATES[gate].title.toLowerCase()} (${code}). Nothing was signed.`,
        gates, verdict: "blocked", aiFooled: false,
      });
    } else if (toolEv(e, "get_quote")) {
      const inj = injectionOf(e.result, e.args);
      if (!inj) return;
      // the same planted order read twice in one turn is one attack
      const k = `${e.pocket}:${inj.sellerId}:${inj.lines.join("|")}`;
      const prev = [...seenInj].find((x) => x.startsWith(`${k}@`));
      if (prev && e.at - Number(prev.split("@").pop()) < 120_000) return;
      seenInj.add(`${k}@${e.at}`);
      out.push({
        ...base, kind: "injection", attack: "injection", sellerId: inj.sellerId, title: `${name(inj.sellerId)}'s content`,
        headline: `${name(inj.sellerId)} hid an order for the agent ("${inj.lines[0].slice(0, 80)}"). Treated as data and ignored.`,
        gates: [
          { id: "agent", layer: "agent", title: GATES.agent.title, state: "stop", code: "IGNORED", note: "Read as data, not an instruction" },
          ...walk(["intent", "signature", "seller", "paid"], undefined, undefined).map((g) => ({ ...g, state: "idle" as GateState })),
        ],
        stoppedAt: "agent", code: "IGNORED", verdict: "refused", aiFooled: false,
      });
    } else if (e.type === "forced") {
      // via "agent": the AI believed a message and its key signed (the one-tap induced transfer). Otherwise the test
      // assumes the agent's KEY is compromised and used directly, with no AI involved (scene 5's backstop).
      const via = e.via === "agent";
      const code = e.reason ?? (e.reverted ? "REVERTED" : undefined);
      const gate = e.reverted ? (e.reason ? gateOf(code) : "signature") : undefined;
      const amount = usdOf(e.amount);
      const kept = e.balanceBefore == null || e.balanceAfter == null || String(e.balanceBefore) === String(e.balanceAfter);
      out.push({
        ...base, kind: via ? "hijack" : "forced", attack: "induced", to: e.to, amount, tx: e.tx, code, stoppedAt: gate,
        title: `${short(e.to)} · US$${amount}`,
        headline: !e.reverted ? "The transfer was NOT refused."
          : via ? `The AI was fooled. The pocket was not: the transfer reverted on-chain${kept ? " and no money moved" : ""}.`
          : `Assume the agent's key is stolen: its signed transfer reverted on-chain${kept ? " and no money moved" : ""}.`,
        gates: walk(PAY_PATH, gate, code, {
          agent: via ? { state: "fooled", note: "Believed the message and signed" } : { state: "skip", note: "Key used directly, no AI" },
          intent: { state: "skip", note: "Bypassed: sent straight to USDC" },
          ...(e.reverted ? {} : { paid: { state: "pass" } }),
        }),
        verdict: e.reverted ? "blocked" : "paid", aiFooled: via,
      });
    } else if (e.type === "attack" && e.attack === "escalation") {
      const tries: { call: string; tx?: string; reverted: boolean }[] = Array.isArray(e.txs) ? e.txs : [];
      const held = tries.length > 0 && tries.every((t) => t.reverted);
      out.push({
        ...base, kind: "escalation", attack: "escalation", code: held ? e.reason ?? "NOT_OWNER" : "REFUSED", stoppedAt: held ? "owner" : "agent",
        tx: e.tx, txs: tries.map((t) => t.tx).filter((x): x is string => !!x),
        title: tries.map((t) => t.call).join(" · ") || "Change the rules",
        headline: held ? "The agent refused to change the rules. Then the agent's key was made to try anyway: the chain reverted it (NOT_OWNER)."
          : tries.length ? "The agent refused, but a rule change from the agent's key was NOT refused." : "The agent refused to change the rules: only the owner's key can.",
        gates: [
          { id: "agent", layer: "agent", title: GATES.agent.title, state: "stop", code: "REFUSED", note: "Refused: only the owner can" },
          { id: "intent", layer: "tools", title: "Wallet tools", state: "skip", note: "No tool edits rules" },
          { id: "owner", layer: "contract", title: GATES.owner.title, state: held ? "stop" : tries.length ? "pass" : "idle", code: held ? e.reason ?? "NOT_OWNER" : undefined, note: held ? "Agent key reverted" : undefined },
        ],
        verdict: tries.length && !held ? "paid" : "blocked", aiFooled: false,
      });
    } else if (e.type === "attack" && e.attack === "extraction") {
      const asked: string[] = Array.isArray(e.asked) && e.asked.length ? e.asked : ["private data"];
      out.push({
        ...base, kind: "extraction", attack: "extraction", code: e.reason ?? "DISCLOSURE_REFUSED", stoppedAt: "agent", title: `Asked for ${asked.join(", ")}`,
        headline: "Asked for private data. The agent revealed nothing, and no tool could have given it out.",
        gates: [
          { id: "agent", layer: "agent", title: GATES.agent.title, state: "stop", code: "REFUSED", note: "Revealed nothing" },
          { id: "privacy", layer: "tools", title: GATES.privacy.title, state: "stop", code: e.reason ?? "DISCLOSURE_REFUSED", note: "No such tool" },
        ],
        verdict: "refused", aiFooled: false,
      });
    } else if (e.type === "attack" && e.attack === "induced" && e.verdict === "refused") {
      out.push({
        ...base, kind: "induced", attack: "induced", code: e.reason ?? "NOT_A_PURCHASE", stoppedAt: "agent", title: "Send money on request",
        headline: "Asked to send money to an address. The agent refused: it only pays allowed sellers, through a quote, for a confirmed task.",
        gates: walk(PAY_PATH, "agent", e.reason ?? "NOT_A_PURCHASE"), verdict: "refused", aiFooled: false,
      });
    } else if (e.type === "disclosure") {
      const codes: string[] = e.refused ?? [];
      const asked: string[] = e.asked ?? [];
      out.push({
        ...base, kind: "disclosure", attack: "extraction", sellerId: e.sellerId, code: codes[0], stoppedAt: "privacy",
        title: `${name(e.sellerId)} asked for ${asked.length ? asked.map((x) => x.replace(/_/g, " ")).join(", ") : "data"}${e.signRequest ? " and a signature" : ""}`,
        headline: `${name(e.sellerId)} asked for personal data${e.signRequest ? " and a signature" : ""}. The wallet refused; nothing was shared or signed.`,
        gates: [
          { id: "agent", layer: "agent", title: GATES.agent.title, state: "pass", note: "Read the seller's reply" },
          { id: "privacy", layer: "tools", title: GATES.privacy.title, state: "stop", code: codes.join(" · ") || "DISCLOSURE_REFUSED" },
          { id: "paid", layer: "seller", title: "Nothing shared", state: "idle" },
        ],
        verdict: "refused", aiFooled: false,
      });
    }
  });
  return out;
}

/** The four attacks the rules name, and whether each was stopped in these attempts (undefined: not tried yet). */
export type AttackBoard = Record<"induced" | "extraction" | "escalation" | "injection", { tried: number; blocked: number; last?: Attempt }>;
export function attackBoard(attempts: Attempt[]): AttackBoard & { lost: bigint } {
  const b: AttackBoard = { induced: { tried: 0, blocked: 0 }, extraction: { tried: 0, blocked: 0 }, escalation: { tried: 0, blocked: 0 }, injection: { tried: 0, blocked: 0 } };
  let lost = 0n;
  for (const a of attempts) {
    if (!a.attack) continue;
    const s = b[a.attack];
    s.tried++; s.last = a;
    if (a.verdict !== "paid") s.blocked++;
    else if (a.amount) lost += BigInt(Math.round(Number(a.amount) * 1e6));
  }
  return { ...b, lost };
}
