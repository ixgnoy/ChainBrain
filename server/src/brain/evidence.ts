import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { formatUsd } from "../wallet/money";
import type { WalletEvent } from "../wallet/events";

type Msg = Anthropic.Beta.Messages.BetaMessageParam;
export type Evidence = { id: string; who: "owner" | "wallet"; text: string };

// Stable across history trimming: the id is a hash of the owner's words.
const mid = (s: string) => `m:${createHash("sha256").update(s).digest("hex").slice(0, 8)}`;

/** One fixed line per event type, built from typed fields only (no seller-provided or agent-written text). */
function line(e: WalletEvent): string | undefined {
  const usd = (v: unknown) => `US$${formatUsd(BigInt(String(v ?? 0)))}`;
  switch (e.type) {
    case "payment": return `paid ${e.sellerId} ${e.sku} ${usd(e.amount)}${e.cosigned ? " (owner co-signed)" : ""}`;
    case "refusal": return `refused ${e.sellerId} ${e.sku}: ${e.reason}`;
    case "disclosure": return `${e.sellerId} asked for data or a signature: refused`;
    case "radar": return e.kind === "screen" ? `radar ${e.counterparty} ${e.score}/10 ${e.verdict}` : e.kind === "alert" ? `radar alert ${(e.alert as any)?.name} now ${(e.alert as any)?.to?.verdict}` : undefined;
    case "intent": case "approval": {
      const a = e.approval as { kind?: string; status?: string; text?: string } | undefined;
      if (!a || a.status === "pending") return undefined;
      // the intent text is ChainBrain's fixed template; a payment request's text is agent-written, so it is left out
      return a.kind === "intent" ? `owner ${a.status} the task: ${String(a.text ?? "").replace(/\n/g, "; ")}` : `owner ${a.status} a payment`;
    }
    default: return undefined;
  }
}

export function evidenceFrom(history: Msg[], events: WalletEvent[], maxEvents = 50): Evidence[] {
  const owner = history.filter((m) => m.role === "user" && typeof m.content === "string")
    .map((m) => ({ id: mid(m.content as string), who: "owner" as const, text: (m.content as string).slice(0, 500) }));
  const wallet = events.slice(-maxEvents).flatMap((e) => {
    const t = line(e);
    return t ? [{ id: `e:${e.at}`, who: "wallet" as const, text: t }] : [];
  });
  return [...owner, ...wallet];
}
