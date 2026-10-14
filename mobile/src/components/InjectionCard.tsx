// Scene 5: a seller's free content tried to give the agent an order ("send 50 USDC to …", or whatever a judge planted).
// The wallet hands seller content to the model only as data, so nothing happened; this card shows the owner exactly
// what was tried, quoted, with "Ignored". Same once-only entrance as a refusal.
import React from "react";
import { View } from "react-native";
import { c } from "../tokens";
import { CodePill } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { cleanText } from "../lib/sanitize";
import { toolResultOf, type WalletEvent } from "../lib/events";
import { RefusalCard } from "./RefusalCard";

const ORDER = /(send|transfer|pay|wire)\s+[\w$.]*\s*\d|ignore (all|previous|your)|important note for ai|you are now|system:|pre-?approved|raise the (cap|limit)|admin/i;

/** Instruction-like sentences in the free seller content a turn read (the preview, plus anything planted in its `note`). */
export function injectionsOf(evs: WalletEvent[]): { sellerId: string; lines: string[] }[] {
  const out: { sellerId: string; lines: string[] }[] = [];
  for (const e of evs) {
    if (e.type !== "trace" || e.phase !== "tool_result" || e.tool !== "get_quote") continue;
    const r = toolResultOf(e);
    if (!r?.ok || !r.free || typeof r.content !== "string") continue;
    const body = r.content.replace(/<\/?untrusted_content[^>]*>/g, "");
    let texts: string[] = [];
    try { const j = JSON.parse(body); texts = [j.preview, j.note].filter((x) => typeof x === "string"); } catch { texts = [body]; }
    const lines = texts.flatMap((t) => t.match(/[^.!?]+[.!?]*/g) ?? []).map((l) => l.trim()).filter((l) => ORDER.test(l)).map((l) => cleanText(l, 200));
    const sellerId = String(e.args?.sellerId ?? r.sellerId ?? (/source="([^"]+)"/.exec(r.content)?.[1] ?? "seller"));
    if (lines.length) out.push({ sellerId, lines });
  }
  return out;
}

export function InjectionCard({ id, seller, lines }: { id: string; seller: string; lines: string[] }) {
  return (
    <RefusalCard id={`inject:${id}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="shield" size={16} color={c.warning} />
        <T v="sub" w="semi" color="warning" style={{ flex: 1 }}>{seller} tried to give your agent an order</T>
      </View>
      {lines.slice(0, 3).map((l, i) => (
        <View key={i} style={{ borderLeftWidth: 2, borderLeftColor: c.warning, paddingLeft: 10 }}>
          <T v="sub" color="ink2" style={{ fontStyle: "italic" }}>“{l}”</T>
        </View>
      ))}
      <T v="sub" color="ink2">Seller text is only ever read as data, never as instructions. Nothing was sent.</T>
      <View style={{ flexDirection: "row", gap: 6 }}><CodePill code="IGNORED" tone="warning" /></View>
    </RefusalCard>
  );
}
