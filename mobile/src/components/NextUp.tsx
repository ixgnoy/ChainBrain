// Home's "Next up": every routine's next run across the pockets, soonest first, as a row of tiles you can flick through.
// Each tile: when (the day, the time big, how long until), who runs it (the agent's mark), what it buys (the sellers'
// marks), and what it costs: the items' listed prices, or a price watch's limit. When the run would pass what is left of
// this period's allowance, the tile says the agent will ask you (the runner raises the cheque then). Everything is read
// from the routine and the events (shared/sim/pocketAppData.ts); paused routines and revoked pockets are left out.
import React from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { c, radius } from "../tokens";
import { Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { AgentAvatar } from "../ui/AgentAvatar";
import { SellerMark, hasSellerMark } from "../ui/SellerMark";
import { cleanText } from "../lib/sanitize";
import { money } from "../lib/util";
import type { Routine } from "../../../shared/sim/pocketApp";
import { budgetOf } from "../../../shared/sim/pocketAppData";
import { agentInfo } from "../../../shared/sim/agents";
import type { Pocket } from "../store";
import type { Seller } from "../lib/shared";

export type NextRun = { pocket: Pocket; routine: Routine; at: number; cost: bigint | null; limit: bigint | null; asks: boolean };

const units = (s?: string | null) => (s ? BigInt(Math.round(Number(s) * 1e6)) : 0n);

/** The runs to show, soonest first: one per live pocket with an active routine. */
export function nextRuns(pockets: Pocket[], routineOf: (a: string) => Routine | null, events: { type: string; at: number }[], sellers: Seller[], now: number): NextRun[] {
  const out: NextRun[] = [];
  for (const p of pockets) {
    if (p.revoked) continue;
    const rt = routineOf(p.address);
    if (!rt || rt.status !== "active") continue;
    const item = (s: string, k: string) => sellers.find((x) => x.id === s)?.items.find((i) => i.sku === k);
    const watch = rt.kind === "price-watch";
    const limit = watch && rt.limitPrice ? units(rt.limitPrice) : null;
    const cost = watch ? null : rt.items.reduce((n, it) => n + units(item(it.sellerId, it.sku)?.price), 0n);
    const b = budgetOf(events as never, p.address, { routine: rt, balance: p.balance, now });
    const need = cost ?? limit ?? 0n;
    out.push({ pocket: p, routine: rt, at: rt.nextAt, cost, limit, asks: need > 0n && need > b.left });
  }
  return out.sort((a, b) => a.at - b.at);
}

const hm = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function dayWord(ms: number, now: number) {
  const d = new Date(ms), n = new Date(now);
  if (d.toDateString() === n.toDateString()) return "Today";
  const t = new Date(now + 86_400_000);
  if (d.toDateString() === t.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "long" });
}
function until(ms: number, now: number) {
  const m = Math.max(0, Math.round((ms - now) / 60_000));
  if (m < 60) return `in ${m} min`;
  const h = Math.round(m / 60);
  if (h < 36) return `in ${h} h`;
  return `in ${Math.round(h / 24)} days`;
}

const TILE = 176;

export function NextUp({ runs, now }: { runs: NextRun[]; now: number }) {
  if (!runs.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} directionalLockEnabled decelerationRate="fast" snapToInterval={TILE + 10} snapToAlignment="start"
      contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }} accessibilityRole="list">
      {runs.map((r, i) => <RunTile key={r.pocket.address} r={r} first={i === 0} now={now} />)}
    </ScrollView>
  );
}

function RunTile({ r, first, now }: { r: NextRun; first: boolean; now: number }) {
  const ink = first ? c.white : c.ink;
  const sub = first ? "rgba(255,255,255,0.66)" : c.muted;
  const agent = agentInfo(r.pocket.agentId ?? "")?.name ?? "ChainBrain";
  const sellers = [...new Set(r.routine.items.map((x) => x.sellerId))];
  const what = r.routine.kind === "price-watch" ? "check" : r.routine.kind === "renewals" ? "renewal" : "run";
  const name = cleanText(r.pocket.name, 24);
  const price = r.limit != null ? `At ${money(r.limit)} or less` : r.cost != null ? money(r.cost) : "";
  const label = `${name}: next ${what} ${dayWord(r.at, now)} at ${hm(r.at)}, ${until(r.at, now)}, by ${agent}. ${price}.${r.asks ? ` Passes what is left this ${r.routine.allowance.period}, so ${agent} will ask you.` : ""}`;
  return (
    <Press kind="row" haptics="select" onPress={() => router.push({ pathname: "/pocket/[id]", params: { id: r.pocket.address } })}
      accessibilityRole="button" accessibilityLabel={label}
      style={{ width: TILE, padding: 14, borderRadius: radius.card, backgroundColor: first ? c.ink : c.card, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T v="tab" style={{ color: sub, textTransform: "uppercase", letterSpacing: 0.8 }} numberOfLines={1}>{dayWord(r.at, now)}</T>
        <AgentAvatar kind={r.pocket.agentId ?? "chainbrain"} size={22} />
      </View>
      <View>
        <T v="balance" style={{ color: ink, fontSize: 34, lineHeight: 38, fontVariant: ["tabular-nums"] }}>{hm(r.at)}</T>
        <T v="cap" style={{ color: sub }}>{until(r.at, now)}</T>
      </View>
      <T v="cap" w="semi" numberOfLines={1} style={{ color: ink }}>{name}</T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flexDirection: "row" }}>
          {sellers.filter(hasSellerMark).slice(0, 3).map((s, i) => (
            <View key={s} style={{ marginLeft: i ? -6 : 0, borderRadius: 7, borderWidth: 2, borderColor: first ? c.ink : c.card }}><SellerMark id={s} size={22} radius={6} /></View>
          ))}
        </View>
        {r.asks ? (
          <View style={{ minHeight: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: c.vermillion, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="bell" size={11} color={c.white} stroke={2.4} />
            <T v="tab" w="bold" style={{ color: c.white }}>Asks you</T>
          </View>
        ) : (
          <T v="cap" style={{ color: sub, flex: 1 }} numberOfLines={2}>{price}</T>
        )}
      </View>
    </Press>
  );
}
