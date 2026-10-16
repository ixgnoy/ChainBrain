// Activity's first glance: the last 14 days as columns, one small square per payment or refusal, stacked from the bottom
// (ink: paid on its own; powder blue: co-signed by you; vermillion: refused or blocked). The shape says how busy the agents
// were and how often a rule said no, before a single row is read. From the ledger only; today's column is marked.
import React, { useMemo } from "react";
import { View } from "react-native";
import { c, radius } from "../tokens";
import { Card } from "../ui/kit";
import { T } from "../ui/Text";
import type { LedgerRow } from "../lib/events";

const DAYS = 14, MAX = 8, SQ = 9, GAP = 3;
type Kind = "paid" | "cosigned" | "refused";
const COLOR: Record<Kind, string> = { paid: c.ink, cosigned: c.blue, refused: c.vermillion };

export const ActivityPulse = React.memo(function ActivityPulse({ ledger }: { ledger: LedgerRow[] }) {
  const cols = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const t0 = start.getTime() - (DAYS - 1) * 86_400_000;
    const out: { at: number; items: Kind[] }[] = Array.from({ length: DAYS }, (_, i) => ({ at: t0 + i * 86_400_000, items: [] }));
    for (const r of ledger) {
      const k: Kind | null = r.kind === "payment" ? (r.cosigned ? "cosigned" : "paid") : r.kind === "refusal" || r.kind === "blocked" ? "refused" : null;
      if (!k || r.at < t0) continue;
      const i = Math.floor((r.at - t0) / 86_400_000);
      if (i >= 0 && i < DAYS) out[i].items.push(k);
    }
    // within a day, refusals on top, then co-signs, then the plain payments at the bottom
    for (const col of out) col.items.sort((a, b) => ["paid", "cosigned", "refused"].indexOf(a) - ["paid", "cosigned", "refused"].indexOf(b));
    return out;
  }, [ledger]);
  const n = (k: Kind) => cols.reduce((s, col) => s + col.items.filter((x) => x === k).length, 0);
  const paid = n("paid"), cos = n("cosigned"), ref = n("refused");
  if (!paid && !cos && !ref) return null;
  return (
    <Card pad={16} style={{ marginHorizontal: 16, marginTop: 12, gap: 12 }}>
      <View accessible accessibilityLabel={`Last 14 days: ${paid} paid on their own, ${cos} co-signed by you, ${ref} refused or blocked`}
        style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: MAX * (SQ + GAP) + 18 }}>
        {cols.map((col, i) => {
          const today = i === DAYS - 1;
          const shown = col.items.slice(-MAX);
          return (
            <View key={col.at} style={{ alignItems: "center", gap: GAP }}>
              {col.items.length > MAX ? <T v="tab" color="muted" style={{ fontSize: 9, lineHeight: 10 }}>{`+${col.items.length - MAX}`}</T> : null}
              {shown.slice().reverse().map((k, j) => <View key={j} style={{ width: SQ, height: SQ, borderRadius: 2.5, backgroundColor: COLOR[k] }} />)}
              <View style={{ width: SQ, height: 3, borderRadius: 1.5, marginTop: 3, backgroundColor: today ? c.vermillion : c.fill }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Key color={COLOR.paid} label={`${paid} paid`} />
        <Key color={COLOR.cosigned} label={`${cos} co-signed by you`} />
        <Key color={COLOR.refused} label={`${ref} refused`} />
        <T v="cap" color="muted" style={{ marginLeft: "auto" }}>14 days</T>
      </View>
    </Card>
  );
});

function Key({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: radius.tile / 6, backgroundColor: color }} />
      <T v="cap" w="semi">{label}</T>
    </View>
  );
}
