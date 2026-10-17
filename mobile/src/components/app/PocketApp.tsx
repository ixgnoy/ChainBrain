// A pocket's app: the blocks its spec names, in its order, rendered by our own components (the spec never carries a value;
// every figure is read from the event stream through shared/sim/pocketAppData.ts). The header says who runs it and how much
// it may do on its own; each block is a white card with a small uppercase label. `assemble="build"` is the creation moment:
// blocks fly up into place one after another; "page" is a calm rise when the pocket opens; Reduce Motion fades only.
import React, { useEffect, useMemo } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { c, motion, radius } from "../../tokens";
import { Button, Card, Press } from "../../ui/kit";
import { T } from "../../ui/Text";
import { Money } from "../../ui/Money";
import { Icon, type IconName } from "../../ui/Icon";
import { Hatch, HatchBar } from "../../ui/Hatch";
import { AgentAvatar } from "../../ui/AgentAvatar";
import { SellerMark, hasSellerMark } from "../../ui/SellerMark";
import { WorkingLine } from "../../ui/WorkingLine";
import { useSettled } from "../../ui/Reveal";
import { EASE_OUT, useReduceMotion } from "../../ui/motion";
import { useLargeText } from "../../ui/fontScale";
import { haptic } from "../../haptics";
import { cleanText } from "../../lib/sanitize";
import { usd } from "../../lib/util";
import { PriceChart } from "./PriceChart";
import { LAYOUT_NAME, agentName } from "./theme";
import { cadenceText, nextRuns, param, type Block, type PocketAppSpec, type Routine } from "../../../../shared/sim/pocketApp";
import {
  budgetOf, haggleOf, monthBySeller, priceChanges, priceSeries, purchasesOf, renewalsOf, runsOf, savingsOf, sourcesOf, upcoming,
} from "../../../../shared/sim/pocketAppData";

type Ev = { type: string; pocket?: string; at: number; [k: string]: any };
export type AppCtx = {
  spec: PocketAppSpec;
  /** the pocket's address; none while the app is a preview (the compose flow) */
  address?: string;
  agentId?: string;
  events: Ev[];
  routine: Routine | null;
  balance: bigint;
  /** everything the owner put in, minus what they took back */
  funded?: bigint;
  rules: { cap: bigint; sellers: string[] };
  now: number;
  preview?: boolean;
  sellerName(id?: string): string;
  itemName(sellerId: string, sku: string): string;
  /** the network's sellers and their items (list prices, which take offers) */
  registry?: { id: string; items: { sku: string; short?: string; description: string; price: string | null; negotiable?: boolean }[] }[];
  running?: { run: number } | null;
  onRunNow?(): void;
  onPause?(paused: boolean): void;
  /** opens the owner's edit of the routine (when it runs, its allowance) */
  onEdit?(): void;
  onReceipt?(tx?: string): void;
  onAsk?(): void;
};

const day = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const hm = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function inWords(ms: number, now: number) {
  const m = Math.round((ms - now) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `in ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "tomorrow" : `in ${d} days`;
}
/** "Smart-money flows" from "Smart-money flows: durian exporters": rows have room for the item, not its subtitle. */
const short = (name: string) => cleanText(name.split(/: | \(/)[0], 40);
const pct = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(Math.round(x * 100))}%`;

// ---------------------------------------------------------------- entrance

function Assemble({ i, mode, children }: { i: number; mode: "build" | "page" | "none"; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(mode === "none" ? 1 : 0);
  const delay = mode === "build" ? 260 + i * 130 : 80 + Math.min(i, 6) * 60;
  const settled = useSettled(delay + 1000, mode === "none");
  useEffect(() => {
    if (mode === "none") return;
    p.value = withDelay(delay, reduce ? withTiming(1, { duration: 180 }) : mode === "build" ? withSpring(1, motion.spring.release) : withSpring(1, motion.spring.smooth));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const dy = mode === "build" ? 46 : 10;
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.4),
    // translate only: a scale on the way in makes the money reels measure their digits too small on web (ui/RollingNumber.tsx)
    transform: [{ translateY: reduce ? 0 : (1 - p.value) * dy }],
  }));
  // settled: a plain style at the resting values, never `undefined` (Reanimated 4 leaves detached animated values applied)
  return <Animated.View style={settled ? REST : a}>{children}</Animated.View>;
}
const REST = { opacity: 1, transform: [{ translateY: 0 }] };

/** A block's card: a small uppercase label, an optional right-hand note, the content. */
function BlockCard({ label, right, children, flush }: { label: string; right?: React.ReactNode; children: React.ReactNode; flush?: boolean }) {
  return (
    <Card pad={18} style={{ marginHorizontal: 16, gap: 14, ...(flush ? { paddingHorizontal: 0 } : null) }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: flush ? 18 : 0 }}>
        {/* a sentence-case Clash title, not a tracked uppercase eyebrow: each block reads as a page of the app, not a template */}
        <T v="head" accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1 }}>{label}</T>
        {typeof right === "string" ? <T v="cap" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{right}</T> : right}
      </View>
      {children}
    </Card>
  );
}

const Mark = ({ id, size = 32 }: { id: string; size?: number }) => (hasSellerMark(id) ? <SellerMark id={id} size={size} radius={size * 0.28} /> : (
  <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name="file" size={size * 0.5} color={c.ink2} /></View>
));

function Empty({ icon, text }: { icon: "clock" | "file" | "chart" | "target"; text: string }) {
  return (
    <View style={{ minHeight: 96, paddingVertical: 14, borderRadius: radius.tile, overflow: "hidden", backgroundColor: c.tile, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 16 }}>
      <Hatch color={c.line} pitch={7} stroke={1.2} opacity={0.6} />
      <Icon name={icon} size={22} color={c.ink2} stroke={1.6} />
      <T v="sub" color="ink2" style={{ textAlign: "center" }}>{text}</T>
    </View>
  );
}

// ---------------------------------------------------------------- the header: who runs it, what it may do on its own

export function AppHeader({ ctx, onOpen }: { ctx: AppCtx; /** opens the agent's page */ onOpen?: () => void }) {
  const { spec, routine } = ctx;
  const who = agentName(ctx.agentId);
  const r = routine;
  const rs = spec.routine;
  const state = ctx.preview ? null : ctx.running ? "Running" : r?.status === "paused" ? "Paused" : rs ? "Active" : null;
  const line = rs
    ? rs.kind === "price-watch"
      ? `Checks ${cadenceText(rs.cadence).replace(/^Every /, "every ").toLowerCase()} · buys at US$${rs.limitPrice} or less`
      : `${cadenceText(rs.cadence)} · on its own inside US$${rs.allowance.amount} a ${rs.allowance.period}`
    : spec.layout === "haggle" ? "Negotiates first, pays only what you allow" : "Buys when you ask, inside the pocket's rules";
  const hm2 = (cd: { hour: number; minute: number }) => `${String(cd.hour).padStart(2, "0")}:${String(cd.minute).padStart(2, "0")}`;
  const when = rs ? (rs.cadence.every === "day" ? "Daily" : rs.cadence.every === "weekday" ? "Weekdays" : rs.cadence.every === "week" ? ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][rs.cadence.weekday ?? 1] : `${rs.cadence.dayOfMonth ?? 1}${(rs.cadence.dayOfMonth ?? 1) === 1 ? "st" : "th"}`) + ` ${hm2(rs.cadence)}` : null;
  // the header's facts as chips: when it runs, the price it buys at, what it may spend on its own
  const chips: [IconName, string][] = rs
    ? [["clock", when!], ...(rs.kind === "price-watch" ? [["target", `Buys ≤ US$${rs.limitPrice}`] as [IconName, string]] : []), ["gauge", `US$${rs.allowance.amount}/${rs.allowance.period === "week" ? "wk" : rs.allowance.period === "month" ? "mo" : "day"}`]]
    : spec.layout === "haggle" ? [["target", "Negotiates first"]] : [["bolt", "When you ask"]];
  const Box = (onOpen ? Press : View) as React.ComponentType<any>;
  return (
    <Box {...(onOpen ? { kind: "row", haptics: "light", onPress: onOpen, accessibilityRole: "button" } : { accessible: true })} accessibilityLabel={`${who} runs this ${LAYOUT_NAME[spec.layout].toLowerCase()}. ${line}.${state ? ` ${state}.` : ""}`}
      style={{ marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4, minHeight: 48 }}>
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AgentAvatar kind={ctx.agentId ?? "chainbrain"} size={32} />
          <T v="head" numberOfLines={1} style={{ flex: 1 }}>{`${who} · ${LAYOUT_NAME[spec.layout]}`}</T>
          {state ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: c.card }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: state === "Paused" ? c.faint : state === "Running" ? c.vermillion : c.green }} />
              <T v="cap" w="semi">{state}</T>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {chips.map(([ic, t]) => (
            <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: c.card }}>
              <Icon name={ic} size={12} color={c.ink2} stroke={2.2} />
              <T v="cap" w="semi" numberOfLines={1}>{t}</T>
            </View>
          ))}
        </View>
      </View>
      {onOpen ? <Icon name="chevronRight" size={18} color={c.mutedOnCanvas} /> : null}
    </Box>
  );
}

// ---------------------------------------------------------------- heroes

function Shelf({ ctx }: { ctx: AppCtx }) {
  const all = ctx.address ? purchasesOf(ctx.events, ctx.address) : [];
  const list = [...all].reverse();
  const total = all.reduce((n, p) => n + p.amount, 0n);
  return (
    <BlockCard label="Library" right={all.length ? `US$${usd(total)} in all` : undefined} flush>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 18 }}>
        <T v="balance" style={{ fontSize: 44, lineHeight: 50 }}>{String(all.length)}</T>
        <T v="sub" color="ink2">{all.length === 1 ? "report bought" : "reports bought"}</T>
      </View>
      {list.length ? (
        <ScrollView horizontal directionalLockEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}>
          {list.slice(0, 8).map((x, i) => <Cover key={`${x.at}-${x.tx ?? x.sku}`} i={i} x={x} ctx={ctx} />)}
        </ScrollView>
      ) : <View style={{ paddingHorizontal: 18 }}><Empty icon="file" text={ctx.routine || ctx.spec.routine ? "Nothing bought yet. The first run fills the shelf." : "Nothing bought yet."} /></View>}
    </BlockCard>
  );
}
/** A report on the shelf: a cover with the seller's mark over hatch, what it is, when, and what it cost. */
function Cover({ x, i, ctx }: { x: ReturnType<typeof purchasesOf>[number]; i: number; ctx: AppCtx }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) p.value = withDelay(180 + Math.min(i, 5) * 70, withSpring(1, motion.spring.smooth)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateX: (1 - p.value) * 28 }] }));
  const name = ctx.itemName(x.sellerId, x.sku);
  return (
    // keyed by the purchase: a new report slides in at the front and the rest glide along the shelf
    <Animated.View style={a} layout={reduce ? undefined : LinearTransition.duration(240)}>
      <Press kind="row" haptics="light" onPress={() => ctx.onReceipt?.(x.tx)} accessibilityRole="button" accessibilityLabel={`${name} from ${ctx.sellerName(x.sellerId)}, US$${usd(x.amount)}, ${day(x.at)}, receipt`}
        style={{ width: 136, minHeight: 176, borderRadius: radius.tile, backgroundColor: i === 0 ? c.ink : c.tile, overflow: "hidden" }}>
        <View style={{ height: 72, alignItems: "flex-start", justifyContent: "flex-end", padding: 12, overflow: "hidden" }}>
          <Hatch color={i === 0 ? "#FFFFFF" : c.line} pitch={7} stroke={1.3} opacity={i === 0 ? 0.16 : 0.9} />
          <View style={{ borderRadius: 11, borderWidth: 2, borderColor: i === 0 ? c.ink : c.tile }}><Mark id={x.sellerId} size={36} /></View>
        </View>
        <View style={{ flex: 1, padding: 12, paddingTop: 8, justifyContent: "space-between", gap: 8 }}>
          <T v="sub" w="semi" numberOfLines={3} style={{ color: i === 0 ? c.white : c.ink, lineHeight: 18 }}>{short(name)}</T>
          <View>
            <T v="cap" numberOfLines={1} style={{ color: i === 0 ? "rgba(255,255,255,0.64)" : c.muted }}>{`${day(x.at)}${x.run ? ` · run ${x.run}` : ""}`}</T>
            <T v="head" style={{ color: i === 0 ? c.white : c.ink, fontVariant: ["tabular-nums"] }}>{`US$${usd(x.amount)}`}</T>
          </View>
        </View>
      </Press>
    </Animated.View>
  );
}

function PriceHero({ ctx, block }: { ctx: AppCtx; block: Block }) {
  const days = param(block, "range") === "7d" ? 7 : 14;
  const limit = ctx.spec.routine?.limitPrice ? BigInt(Math.round(Number(ctx.spec.routine.limitPrice) * 1e6)) : undefined;
  const s = ctx.address ? priceSeries(ctx.events, ctx.address, { now: ctx.now, days, limit }) : null;
  const item = ctx.spec.routine?.items[0];
  const last = s?.last;
  // before any quote: the seller's list price (the catalogue's) against the limit, so the deal is visible from the start
  const lp = item ? ctx.registry?.find((x) => x.id === item.sellerId)?.items.find((i) => i.sku === item.sku)?.price : null;
  const listed = lp ? BigInt(Math.round(Number(lp) * 1e6)) : null;
  return (
    <BlockCard label={item ? `${ctx.sellerName(item.sellerId)} · quoted prices` : "Quoted prices"} right={`${days} days`}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <View style={{ gap: 2 }}>
          <Money v="amount" value={last ? usd(last.price) : "—"} prefix={last ? "US$" : ""} label={last ? `Last quote US$${usd(last.price)}` : "No quote yet"} />
          <T v="cap" color="muted">{last ? `Last quote · ${day(last.at)} ${hm(last.at)}` : item ? cleanText(ctx.itemName(item.sellerId, item.sku), 60) : "No quotes yet"}</T>
        </View>
        {s && s.quotes.length > 1 ? (
          <View style={{ height: 26, paddingHorizontal: 9, borderRadius: 13, justifyContent: "center", backgroundColor: s.change > 0 ? c.vermillionSoft : c.greenSoft }}>
            <T v="cap" w="bold" style={{ color: s.change > 0 ? c.vermillionInk : c.greenInk }}>{`${pct(s.change)} in ${days} days`}</T>
          </View>
        ) : null}
      </View>
      {s && s.quotes.length ? (
        <PriceChart quotes={s.quotes} buys={s.buys} limit={limit} />
      ) : limit != null && listed != null ? <PriceGauge limit={limit} listed={listed} seller={item ? ctx.sellerName(item.sellerId) : "The seller"} />
        : <Empty icon="chart" text={limit != null ? `Every quote lands here. It buys at US$${usd(limit)} or less.` : "Every quote lands here."} />}
      {s && s.quotes.length ? (
        <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
          <Legend swatch={<View style={{ width: 14, height: 0, borderTopWidth: 2, borderColor: c.blueInk, borderStyle: "dashed" }} />} text="Your limit" />
          <Legend swatch={<View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.ink }} />} text={`${s.buys.length} bought`} />
          <Legend swatch={<View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 2.5, borderColor: c.vermillion }} />} text={`${s.quotes.length} quotes`} />
        </View>
      ) : null}
    </BlockCard>
  );
}
const Legend = ({ swatch, text }: { swatch: React.ReactNode; text: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>{swatch}<T v="cap" color="ink2">{text}</T></View>
);

const SEG = [c.ink, c.vermillion, c.blue, c.green];
/** No quotes yet: a price scale with the buy zone (at or under your limit) shaded and the seller's list price marked. */
function PriceGauge({ limit, listed, seller }: { limit: bigint; listed: bigint; seller: string }) {
  const max = Number(listed > limit ? listed : limit) * 1.35;
  const at = (v: bigint) => `${Math.min(96, (Number(v) / max) * 100)}%` as const;
  const inZone = listed <= limit;
  return (
    <View accessible accessibilityLabel={`${seller} lists it at US$${usd(listed)}. It buys at US$${usd(limit)} or less${inZone ? ", so the list price is already in the buy zone" : ", so it waits for the price to drop"}. Every quote will land on this chart.`} style={{ gap: 10 }}>
      <View style={{ height: 96, justifyContent: "center" }}>
        <View style={{ height: 14, borderRadius: 7, backgroundColor: c.fill, overflow: "hidden" }}>
          <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: at(limit), backgroundColor: c.blueSoft }}><Hatch color={c.blueInk} pitch={6} stroke={1} opacity={0.25} /></View>
        </View>
        {/* the limit */}
        <View style={{ position: "absolute", left: at(limit), top: 12, bottom: 12, width: 2, marginLeft: -1, backgroundColor: c.blueInk }} />
        <View style={{ position: "absolute", left: at(limit), bottom: 0, transform: [{ translateX: -30 }], height: 22, paddingHorizontal: 7, borderRadius: 7, backgroundColor: c.blueInk, justifyContent: "center" }}>
          <T v="cap" w="bold" style={{ color: c.white, fontSize: 11 }}>{`≤ ${usd(limit)}`}</T>
        </View>
        {/* the list price */}
        <View style={{ position: "absolute", left: at(listed), top: 0, transform: [{ translateX: -40 }], height: 22, paddingHorizontal: 7, borderRadius: 7, backgroundColor: c.vermillion, justifyContent: "center" }}>
          <T v="cap" w="bold" style={{ color: c.white, fontSize: 11 }}>{`lists ${usd(listed)}`}</T>
        </View>
        <View style={{ position: "absolute", left: at(listed), top: 41, width: 14, height: 14, marginLeft: -7, borderRadius: 7, backgroundColor: c.white, borderWidth: 3, borderColor: c.vermillion }} />
      </View>
      <T v="cap" color="muted">{inZone ? "Already in the buy zone. Every quote lands here." : "It waits for the price to drop into the blue. Every quote lands here."}</T>
    </View>
  );
}

function MonthSpend({ ctx }: { ctx: AppCtx }) {
  const m = ctx.address ? monthBySeller(ctx.events, ctx.address, ctx.now) : { rows: [], total: 0n, window: { start: ctx.now, end: ctx.now } };
  const month = new Date(ctx.now).toLocaleDateString("en-GB", { month: "long" });
  const next = ctx.routine?.status === "active" ? ctx.routine.nextAt : null;
  return (
    <BlockCard label={`Spent in ${month}`} right={next ? `Renews ${day(next)}` : undefined}>
      <Money v="amount" value={usd(m.total)} label={`US$${usd(m.total)} spent in ${month}`} />
      <View style={{ height: 22, borderRadius: 7, overflow: "hidden", flexDirection: "row", backgroundColor: c.fill }}
        accessible accessibilityLabel={m.rows.map((r) => `${ctx.sellerName(r.sellerId)} US$${usd(r.amount)}`).join(", ") || "Nothing spent this month"}>
        {m.rows.length ? m.rows.map((r, k) => (
          <View key={r.sellerId} style={{ flex: Number(r.amount), backgroundColor: SEG[k % SEG.length], borderRightWidth: k < m.rows.length - 1 ? 2 : 0, borderColor: c.card }} />
        )) : <Hatch color={c.line} pitch={6} stroke={1.4} />}
      </View>
      {m.rows.length ? (
        <View style={{ gap: 10 }}>
          {m.rows.map((r, k) => (
            <View key={r.sellerId} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: SEG[k % SEG.length] }} />
              <Mark id={r.sellerId} size={24} />
              <T v="sub" style={{ flex: 1 }} numberOfLines={1}>{ctx.sellerName(r.sellerId)}</T>
              <Money v="sub" value={usd(r.amount)} decorative />
            </View>
          ))}
        </View>
      ) : <T v="sub" color="ink2">Nothing renewed yet this month.</T>}
    </BlockCard>
  );
}

function Ladder({ ctx }: { ctx: AppCtx }) {
  const h = ctx.address ? haggleOf(ctx.events, ctx.address) : null;
  if (!h) {
    // before any deal: the seller's real list price, then three empty rounds (what the agent will try), then the pocket's cap
    const item = ctx.rules.sellers.map((id) => ({ id, it: ctx.registry?.find((x) => x.id === id)?.items.find((i) => i.negotiable && i.price) })).find((x) => x.it);
    const list = item?.it?.price ? Number(item.it.price) : 0;
    return (
      <BlockCard label="The deal" right={item?.it ? short(item.it.short ?? item.it.description) : undefined}>
        {item?.it && list ? (
          <View style={{ gap: 8 }} accessible accessibilityLabel={`${ctx.sellerName(item.id)} lists it at US$${item.it.price}. ${agentName(ctx.agentId)} offers less, up to three rounds, and pays at most US$${usd(ctx.rules.cap)}.`}>
            <LadderRow i={0} label={`${ctx.sellerName(item.id)} lists it at`} price={BigInt(Math.round(list * 1e6))} frac={1} who="seller" />
            {[1, 2, 3].map((r) => (
              <View key={r} style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <T v="cap" color="muted">{`Round ${r}`}</T>
                  <T v="cap" color="faint">{r === 1 ? "first offer" : "if it counters"}</T>
                </View>
                <View style={{ height: 14, borderRadius: 5, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.line }} />
              </View>
            ))}
          </View>
        ) : <Empty icon="target" text={`No deal yet. ${agentName(ctx.agentId)} asks the price and offers less, in up to three rounds.`} />}
        {ctx.onAsk && !ctx.preview ? <Button label={`Ask ${agentName(ctx.agentId)} in chat`} kind="secondary" icon="chat" small onPress={ctx.onAsk} /> : null}
      </BlockCard>
    );
  }
  const rows: { who: "seller" | "agent" | "paid"; label: string; price: bigint }[] = [{ who: "seller", label: `${ctx.sellerName(h.sellerId)} asks`, price: h.list }];
  for (const s of h.steps) {
    if (s.accepting) continue; // taking the seller's counter is not a new offer: the paid row says it
    rows.push({ who: "agent", label: `${agentName(ctx.agentId)} offers`, price: s.offer });
    if (s.reply !== "accept") rows.push({ who: "seller", label: s.final ? `${ctx.sellerName(h.sellerId)}'s final price` : `${ctx.sellerName(h.sellerId)} counters`, price: s.price });
  }
  if (h.paid != null) rows.push({ who: "paid", label: h.cosigned ? "Paid · co-signed by you" : "Paid", price: h.paid });
  const max = Number(h.list) || 1;
  return (
    <BlockCard label="The deal" right={cleanText(ctx.itemName(h.sellerId, h.sku), 40)}>
      <View style={{ gap: 8 }} accessible accessibilityLabel={rows.map((r) => `${r.label} US$${usd(r.price)}`).join(", ")}>
        {rows.map((r, i) => <LadderRow key={i} i={i} label={r.label} price={r.price} frac={Number(r.price) / max} who={r.who} />)}
      </View>
    </BlockCard>
  );
}
function LadderRow({ i, label, price, frac, who }: { i: number; label: string; price: bigint; frac: number; who: "seller" | "agent" | "paid" }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) p.value = withDelay(200 + i * 110, withTiming(1, { duration: 520, easing: EASE_OUT })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const grow = useAnimatedStyle(() => ({ width: `${Math.max(0.08, frac) * 100 * p.value}%` }));
  const bg = who === "paid" ? c.vermillion : who === "agent" ? c.ink : c.fill;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T v="cap" w={who === "paid" ? "bold" : "medium"} color={who === "paid" ? "ink" : "ink2"}>{label}</T>
        <T v="cap" w="bold" style={{ fontVariant: ["tabular-nums"] }}>{`US$${usd(price)}`}</T>
      </View>
      <View style={{ height: 14, borderRadius: 5, backgroundColor: c.tile, overflow: "hidden" }}>
        <Animated.View style={[{ height: "100%", borderRadius: 5, backgroundColor: bg, overflow: "hidden" }, grow]}>
          {who === "seller" ? <Hatch color={c.ink} pitch={6} stroke={1.3} opacity={0.55} /> : null}
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- the rest

function Budget({ ctx }: { ctx: AppCtx }) {
  const b = budgetOf(ctx.events, ctx.address ?? "", { routine: ctx.routine, balance: ctx.balance, funded: ctx.funded, now: ctx.now });
  const preview = ctx.preview && ctx.spec.routine;
  const limit = preview ? BigInt(Math.round(Number(ctx.spec.routine!.allowance.amount) * 1e6)) : b.limit;
  const spent = preview ? 0n : b.spent;
  const period = preview ? ctx.spec.routine!.allowance.period : b.period;
  const scale = Math.max(Number(limit), Number(spent), 1);
  const fill = Math.min(1, Number(spent) / scale), tick = Number(limit) / scale;
  const over = spent > limit && b.kind === "period";
  const resets = b.window ? `resets ${day(b.window.end).split(",")[0]}` : undefined;
  return (
    <BlockCard label={b.kind === "period" || preview ? `This ${period}` : "Budget"} right={b.kind === "period" ? resets : undefined}>
      {/* bottom-aligned, not baseline: a baseline row shifts the money reels by a whole column (ui/RollingNumber.tsx) */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, flexWrap: "wrap" }}>
        <Money v="section" value={usd(preview ? limit : b.kind === "balance" ? b.left : spent)} label={preview ? `US$${usd(limit)} a ${period}` : b.kind === "balance" ? `US$${usd(b.left)} left` : `US$${usd(spent)} spent`} />
        <T v="sub" color="ink2">{preview ? `to spend on its own each ${period}` : b.kind === "balance" ? `left of US$${usd(limit)} put in` : `of US$${usd(limit)} a ${period}`}</T>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel={b.kind === "balance" && !preview ? "Budget used" : `Spent this ${period}`} accessibilityValue={{ min: 0, max: 100, now: Math.round((Number(spent) / Math.max(Number(limit), 1)) * 100) }} style={{ paddingTop: 18 }}>
        <View style={{ height: 18, borderRadius: 6, backgroundColor: c.fill, overflow: "hidden" }}>
          <Hatch color={c.line} pitch={6} stroke={1.5} />
          <MeterFill frac={preview ? 1 : fill} over={over} split={over ? tick : 1} tone={preview ? c.blue : c.ink} />
        </View>
        {b.kind === "period" || preview ? (
          <>
            <View pointerEvents="none" style={{ position: "absolute", top: 12, bottom: -6, left: `${tick * 100}%`, width: 2, marginLeft: -1, backgroundColor: c.ink }} />
            <View pointerEvents="none" style={{ position: "absolute", top: -2, left: `${Math.min(tick * 100, 100)}%`, transform: [{ translateX: tick > 0.75 ? -64 : -4 }] }}>
              <T v="cap" w="bold" numberOfLines={1}>{`US$${usd(limit)}`}</T>
            </View>
          </>
        ) : null}
      </View>
      {over ? <T v="cap" color="vermillionInk">{`US$${usd(spent - limit)} over, co-signed by you on its cheque`}</T> : null}
    </BlockCard>
  );
}
function MeterFill({ frac, over, split, tone }: { frac: number; over: boolean; split: number; tone: string }) {
  const reduce = useReduceMotion();
  const w = useSharedValue(reduce ? frac : 0);
  useEffect(() => { w.value = reduce ? frac : withDelay(240, withTiming(frac, { duration: motion.draw, easing: EASE_OUT })); }, [frac, reduce, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, flexDirection: "row", overflow: "hidden", borderRadius: 6 }, a]}>
      <View style={{ flex: over ? split : 1, backgroundColor: tone }} />
      {over ? <View style={{ flex: Math.max(0.0001, 1 - split), backgroundColor: c.vermillion }} /> : null}
    </Animated.View>
  );
}

function NextRun({ ctx }: { ctx: AppCtx }) {
  const rt = ctx.routine;
  const rs = ctx.spec.routine!;
  const times = rt ? upcoming(rt, 4) : nextRuns(rs.cadence, ctx.now, 4);
  const paused = rt?.status === "paused";
  const who = agentName(ctx.agentId);
  const big = useLargeText();
  return (
    <BlockCard label={rs.kind === "price-watch" ? "Next check" : rs.kind === "renewals" ? "Next renewal" : "Next run"} right={times[0] && !paused ? `${day(times[0])} · ${inWords(times[0], ctx.now)}` : paused ? "Paused" : undefined}>
      {/* four day tiles; at accessibility text sizes they wrap two by two instead of clipping */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(times.length ? times : [0, 1, 2, 3].map(() => 0)).map((t, i) => (
          <View key={i} style={{ flexGrow: 1, flexBasis: big ? "45%" : 0, minHeight: 74, paddingVertical: 10, borderRadius: radius.tile, backgroundColor: i === 0 && t && !paused ? c.ink : c.tile, alignItems: "center", justifyContent: "center", gap: 2, overflow: "hidden" }}>
            {!t ? <Hatch color={c.line} pitch={6} stroke={1.2} /> : null}
            <T v="tab" style={{ textTransform: "uppercase", letterSpacing: 0.8, color: i === 0 && t && !paused ? "rgba(255,255,255,0.7)" : c.muted }}>{t ? new Date(t).toLocaleDateString("en-GB", { weekday: "short" }) : "—"}</T>
            <T v="section" style={{ color: i === 0 && t && !paused ? c.white : c.ink }}>{t ? String(new Date(t).getDate()) : ""}</T>
            <T v="cap" style={{ color: i === 0 && t && !paused ? "rgba(255,255,255,0.7)" : c.muted }}>{t ? hm(t) : ""}</T>
          </View>
        ))}
      </View>
      {ctx.running ? <WorkingLine on label={`Run ${ctx.running.run} is running…`} /> : null}
      {!ctx.preview && rt && ctx.onRunNow ? (
        <View style={{ gap: 4 }}>
          <Button label={`Have ${who} ${rs.kind === "price-watch" ? "check" : rs.kind === "renewals" ? "renew" : "run it"} now`} icon="bolt" auto="routine.runNow" disabled={!!ctx.running || paused} onPress={ctx.onRunNow} />
          {ctx.onPause || ctx.onEdit ? (
            <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap" }}>
              {ctx.onEdit ? (
                <Press haptics="select" onPress={ctx.onEdit} accessibilityRole="button" accessibilityLabel="Edit when it runs and its allowance"
                  style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 }}>
                  <Icon name="edit" size={16} color={c.ink2} />
                  <T v="sub" w="semi" color="ink2">Edit</T>
                </Press>
              ) : null}
              {ctx.onPause ? (
                <Press haptics="select" onPress={() => ctx.onPause!(!paused)} accessibilityRole="button" accessibilityLabel={paused ? "Resume the routine" : "Pause the routine"}
                  style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 }}>
                  <Icon name={paused ? "play" : "pause"} size={16} color={c.ink2} />
                  <T v="sub" w="semi" color="ink2">{paused ? "Resume" : "Pause"}</T>
                </Press>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </BlockCard>
  );
}

function Runs({ ctx, block }: { ctx: AppCtx; block: Block }) {
  const reduce = useReduceMotion();
  const runs = ctx.address ? runsOf(ctx.events, ctx.address).slice(0, param(block, "limit")) : [];
  // the runs there when the page opened stay put; a run that finishes while you watch drops in at the top
  const seen = React.useRef<Set<number> | null>(null);
  if (seen.current === null) seen.current = new Set(runs.map((r) => r.run));
  return (
    <BlockCard label={runs.length || !ctx.spec.routine ? "Recent runs" : "What happens next"} right={runs.length ? `${runs.length} shown` : undefined}>
      {runs.length ? runs.map((r) => {
        const paid = r.outs.filter((o) => o.outcome === "paid" || o.outcome === "cosigned");
        const watching = r.outs.find((o) => o.outcome === "watching");
        const title = paid.length ? `Paid US$${usd(r.paid)}` : watching ? `Watched · US$${watching.amount}` : r.outs.some((o) => o.outcome === "declined") ? "You declined" : "Nothing paid";
        return (
          <Animated.View key={r.run} style={{ gap: 8 }} entering={reduce || seen.current!.has(r.run) ? undefined : FadeInDown.duration(260)} layout={reduce ? undefined : LinearTransition.duration(240)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }} accessible accessibilityLabel={`Run ${r.run}, ${title}, ${day(r.at)}${r.asked ? ", asked you" : ""}`}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: r.asked ? c.vermillionSoft : c.fill, alignItems: "center", justifyContent: "center" }}>
                <T v="head" style={{ color: r.asked ? c.vermillionInk : c.ink }}>{String(r.run)}</T>
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <T v="row">{title}</T>
                <T v="cap" color="muted">{`${day(r.at)} ${hm(r.at)}${r.early ? " · ran early" : ""}${r.asked ? " · asked you" : ""}`}</T>
              </View>
              <View style={{ flexDirection: "row" }}>{paid.slice(0, 3).map((o, k) => <View key={k} style={{ marginLeft: k ? -8 : 0, borderRadius: 9, borderWidth: 2, borderColor: c.card }}><Mark id={o.sellerId} size={24} /></View>)}</View>
            </View>
            {r.ignored.map((x, k) => (
              <View key={k} style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.tile }} accessible accessibilityLabel={`${ctx.sellerName(x.sellerId)}'s delivery tried to change this routine. Nothing changed.`}>
                <Icon name="shieldCheck" size={18} color={c.greenInk} stroke={2} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="cap" w="bold">{`${ctx.sellerName(x.sellerId)} tried to change this routine. Nothing changed.`}</T>
                  {x.excerpt ? <T v="cap" color="muted" numberOfLines={2}>{`“${cleanText(x.excerpt, 110)}”`}</T> : null}
                </View>
              </View>
            ))}
          </Animated.View>
        );
      }) : ctx.spec.routine ? <WhatNext ctx={ctx} rs={ctx.routine ?? ctx.spec.routine} /> : <Empty icon="clock" text="No runs yet." />}
    </BlockCard>
  );
}

// ---------------------------------------------------------------- before the first run: what happens next

/** Instead of "No runs yet": the routine's first run as a timeline (when, who buys what, what it may pay, where it lands,
 *  when it asks you). Read from the spec and the routine only; the prices are the sellers' listed prices. The first node is
 *  dashed: it hasn't happened. Nodes rise one after another; Reduce Motion shows them at once. */
function WhatNext({ ctx, rs }: { ctx: AppCtx; rs: NonNullable<PocketAppSpec["routine"]> }) {
  const reduce = useReduceMotion();
  const who = agentName(ctx.agentId);
  const at = ctx.routine?.nextAt ?? nextRuns(rs.cadence, ctx.now, 1)[0];
  const price = (sid: string, sku: string) => ctx.registry?.find((s) => s.id === sid)?.items.find((i) => i.sku === sku)?.price ?? null;
  const total = rs.items.reduce((n, it) => n + Number(price(it.sellerId, it.sku) ?? 0), 0);
  const watch = rs.kind === "price-watch";
  const sellers = [...new Set(rs.items.map((i) => i.sellerId))];
  const lands = ctx.spec.layout === "deal" ? "The buy is marked on the price chart" : ctx.spec.layout === "subscriptions" ? "The renewal shows under Renewals" : "The reports land on the shelf above";
  const steps: { key: string; title: string; sub: string; lead?: React.ReactNode; dashed?: boolean }[] = [
    { key: "when", title: `First ${watch ? "check" : "run"} ${inWords(at, ctx.now)}`, sub: `${day(at)} · ${hm(at)}, then ${cadenceText(rs.cadence).replace(/^Every/, "every").replace(/^On the/, "on the")}`, dashed: true },
    { key: "buys", title: `${who} ${watch ? "checks" : "buys"} ${rs.items.length === 1 ? short(ctx.itemName(rs.items[0].sellerId, rs.items[0].sku)) : `${rs.items.length} items`}`, sub: sellers.map((s) => ctx.sellerName(s)).join(" · "),
      lead: <View style={{ flexDirection: "row" }}>{sellers.slice(0, 3).map((s, k) => <View key={s} style={{ marginLeft: k ? -8 : 0, borderRadius: 9, borderWidth: 2, borderColor: c.card }}><Mark id={s} size={24} /></View>)}</View> },
    watch
      ? { key: "pays", title: `Buys only at US$${rs.limitPrice} or less`, sub: "" }
      : { key: "pays", title: `Pays US$${total.toFixed(3).replace(/0$/, "")}`, sub: "" },
    { key: "lands", title: lands, sub: "" },
    { key: "asks", title: `Past US$${rs.allowance.amount} a ${rs.allowance.period}, ${who} asks you`, sub: "" },
  ];
  return (
    <View accessibilityRole="list" accessibilityLabel="What happens next">
      {steps.map((s, i) => (
        <Animated.View key={s.key} entering={reduce ? undefined : FadeInDown.delay(120 + i * 90).duration(260)} style={{ flexDirection: "row", gap: 12 }}
          accessible accessibilityLabel={`Step ${i + 1} of ${steps.length}: ${s.title}. ${s.sub}`}>
          <View style={{ alignItems: "center", width: 18 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, marginTop: 3, borderWidth: 2, borderColor: i === 0 ? c.ink : c.line, borderStyle: s.dashed ? "dashed" : "solid", backgroundColor: i === 0 ? c.card : c.fill, alignItems: "center", justifyContent: "center" }}>
              {i === 0 ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.vermillion }} /> : null}
            </View>
            {i < steps.length - 1 ? <View style={{ flex: 1, width: 2, marginVertical: 2, backgroundColor: c.fill }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 14 : 0, flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1, gap: 1 }}>
              <T v="row" w={i === 0 ? "bold" : undefined}>{s.title}</T>
              {s.sub ? <T v="cap" color="muted">{s.sub}</T> : null}
            </View>
            {s.lead}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function Library({ ctx, block }: { ctx: AppCtx; block: Block }) {
  const list = ctx.address ? [...purchasesOf(ctx.events, ctx.address)].reverse().slice(0, param(block, "limit")) : [];
  return (
    <BlockCard label={ctx.spec.layout === "deal" ? "Bought below your limit" : "Bought"}>
      {list.length ? list.map((p, i) => (
        <Press key={i} kind="row" haptics="light" onPress={() => ctx.onReceipt?.(p.tx)} accessibilityRole="button" accessibilityLabel={`${ctx.itemName(p.sellerId, p.sku)}, US$${usd(p.amount)}, ${day(p.at)}, receipt`}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}>
          <Mark id={p.sellerId} size={36} />
          <View style={{ flex: 1, gap: 1 }}>
            <T v="row" numberOfLines={1}>{short(ctx.itemName(p.sellerId, p.sku))}</T>
            <T v="cap" color="muted" numberOfLines={1}>{`${ctx.sellerName(p.sellerId)} · ${day(p.at)} ${hm(p.at)}${p.cosigned ? " · co-signed" : ""}`}</T>
          </View>
          <Money v="sub" value={usd(p.amount)} decorative />
          <Icon name="chevronRight" size={16} color={c.faint} />
        </Press>
      )) : <Empty icon="file" text="Nothing bought yet." />}
    </BlockCard>
  );
}

function Sources({ ctx }: { ctx: AppCtx }) {
  const s = ctx.address ? sourcesOf(ctx.events, ctx.address) : [];
  const allowed = ctx.rules.sellers.filter((id) => !s.some((x) => x.sellerId === id));
  return (
    <BlockCard label="Sources" right={`${ctx.rules.sellers.length} allowed`}>
      {s.map((x) => (
        <View key={x.sellerId} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Mark id={x.sellerId} size={28} />
            <T v="sub" style={{ flex: 1 }} numberOfLines={1}>{ctx.sellerName(x.sellerId)}</T>
            <T v="cap" color="muted">{`${x.count}×`}</T>
            <Money v="sub" value={usd(x.amount)} decorative />
          </View>
          <HatchBar value={x.share} tone={c.ink} height={8} label={`${ctx.sellerName(x.sellerId)} ${Math.round(x.share * 100)}% of spend`} />
        </View>
      ))}
      {allowed.length ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {allowed.map((id) => <View key={id} style={{ opacity: 0.55 }}><Mark id={id} size={24} /></View>)}
          <T v="cap" color="muted">{s.length ? "allowed, not paid yet" : "allowed"}</T>
        </View>
      ) : null}
    </BlockCard>
  );
}

function Renewals({ ctx }: { ctx: AppCtx }) {
  const rt = ctx.routine;
  const rows = rt && ctx.address ? renewalsOf(ctx.events, ctx.address, rt) : (ctx.spec.routine?.items ?? []).map((i) => ({ ...i, nextAt: 0, last: undefined }));
  return (
    <BlockCard label="Renewals" right={rt ? cadenceText(rt.cadence) : undefined}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
          <Mark id={r.sellerId} size={36} />
          <View style={{ flex: 1, gap: 1 }}>
            <T v="row" numberOfLines={1}>{short(ctx.itemName(r.sellerId, r.sku))}</T>
            <T v="cap" color="muted" numberOfLines={1}>{r.nextAt ? `${ctx.sellerName(r.sellerId)} · renews ${day(r.nextAt)}` : ctx.sellerName(r.sellerId)}</T>
          </View>
          {r.last ? <View style={{ alignItems: "flex-end" }}><Money v="sub" value={usd(r.last.amount)} decorative /><T v="cap" color="muted">last time</T></View> : <T v="cap" color="muted">first renewal</T>}
        </View>
      ))}
    </BlockCard>
  );
}

function PriceChanges({ ctx }: { ctx: AppCtx }) {
  const ch = ctx.address ? priceChanges(ctx.events, ctx.address).slice(0, 4) : [];
  return (
    <BlockCard label="Price changes">
      {ch.length ? ch.map((x, i) => {
        const up = x.to > x.from;
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }} accessible accessibilityLabel={`${ctx.sellerName(x.sellerId)} ${up ? "rose" : "fell"} from US$${usd(x.from)} to US$${usd(x.to)}, ${pct(x.pct)}`}>
            <Mark id={x.sellerId} size={36} />
            <View style={{ flex: 1, gap: 1 }}>
              <T v="row" numberOfLines={1}>{short(ctx.itemName(x.sellerId, x.sku))}</T>
              <T v="cap" color="muted" numberOfLines={1}>{`US$${usd(x.from)} → US$${usd(x.to)} · ${day(x.at)}`}</T>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 26, paddingHorizontal: 8, borderRadius: 13, backgroundColor: up ? c.vermillionSoft : c.greenSoft }}>
              <Icon name={up ? "arrowUp" : "arrowDown"} size={13} color={up ? c.vermillionInk : c.greenInk} stroke={2.4} />
              <T v="cap" w="bold" style={{ color: up ? c.vermillionInk : c.greenInk }}>{pct(x.pct).replace(/^[+−]/, "")}</T>
            </View>
          </View>
        );
      }) : <T v="sub" color="ink2">No price has moved yet.</T>}
    </BlockCard>
  );
}

function Savings({ ctx }: { ctx: AppCtx }) {
  const s = ctx.address ? savingsOf(ctx.events, ctx.address) : { saved: 0n, list: 0n, paid: 0n, count: 0 };
  if (!s.count) return (
    <BlockCard label="Saved"><T v="sub" color="ink2">{`Whatever ${agentName(ctx.agentId)} talks the price down by shows here.`}</T></BlockCard>
  );
  const frac = Number(s.paid) / Math.max(Number(s.list), 1);
  return (
    <BlockCard label="Saved" right={`${s.count} deal${s.count === 1 ? "" : "s"}`}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Money v="amount" value={usd(s.saved)} color="positive" label={`Saved US$${usd(s.saved)}`} />
        <T v="sub" color="ink2">{`${Math.round((1 - frac) * 100)}% off the first price`}</T>
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ height: 12, borderRadius: 4, overflow: "hidden", backgroundColor: c.fill }}><Hatch color={c.ink} pitch={6} stroke={1.2} opacity={0.5} /></View>
        <View style={{ height: 12, width: `${frac * 100}%`, borderRadius: 4, backgroundColor: c.ink }} />
        <T v="cap" color="muted">{`${s.count === 1 ? "First price" : "First prices"} US$${usd(s.list)} · paid US$${usd(s.paid)}`}</T>
      </View>
    </BlockCard>
  );
}

function Guard({ ctx }: { ctx: AppCtx }) {
  const rs = ctx.spec.routine!;
  const names = ctx.rules.sellers.map((id) => ctx.sellerName(id));
  const rows: [IconName, string, "Contract" | "ChainBrain"][] = [
    ["ban", "Pay anyone else", "Contract"],
    ["gauge", `Pay over US$${usd(ctx.rules.cap)} at once`, "Contract"],
    ["bell", `Exceed US$${rs.allowance.amount}/${rs.allowance.period === "week" ? "wk" : rs.allowance.period === "month" ? "mo" : "day"} alone`, "ChainBrain"],
    ["shield", "Take orders from a seller", "ChainBrain"],
    ["lock", "Pay after you revoke", "Contract"],
  ];
  return (
    <BlockCard label="Will never">
      {/* each line says who enforces it: the contract on-chain (ink), or the routine's fixed fields (blue) */}
      {rows.map(([ic, t, by], i) => (
        <View key={i} accessible accessibilityLabel={`Will never ${t}. Enforced by ${by === "Contract" ? "the pocket contract, on-chain" : "ChainBrain, before every payment"}`} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c.vermillionSoft, alignItems: "center", justifyContent: "center" }}><Icon name={ic} size={14} color={c.vermillionInk} stroke={2.2} /></View>
          <T v="sub" w="medium" style={{ flex: 1 }} numberOfLines={1}>{t}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, height: 22, borderRadius: 6, backgroundColor: by === "Contract" ? c.ink : c.blueSoft }}>
            <Icon name={by === "Contract" ? "lock" : "brain"} size={11} color={by === "Contract" ? c.white : c.blueInk} stroke={2.4} />
            <T v="tab" w="bold" style={{ color: by === "Contract" ? c.white : c.blueInk, letterSpacing: 0.4 }}>{by.toUpperCase()}</T>
          </View>
        </View>
      ))}
    </BlockCard>
  );
}

// ---------------------------------------------------------------- the renderer

export function BlockView({ block, ctx }: { block: Block; ctx: AppCtx }) {
  switch (block.type) {
    case "shelf": return <Shelf ctx={ctx} />;
    case "price-chart": return <PriceHero ctx={ctx} block={block} />;
    case "month-spend": return <MonthSpend ctx={ctx} />;
    case "ladder": return <Ladder ctx={ctx} />;
    case "budget": return <Budget ctx={ctx} />;
    case "next-run": return ctx.spec.routine ? <NextRun ctx={ctx} /> : null;
    case "runs": return <Runs ctx={ctx} block={block} />;
    case "library": return <Library ctx={ctx} block={block} />;
    case "sources": return <Sources ctx={ctx} />;
    case "renewals": return <Renewals ctx={ctx} />;
    case "price-changes": return <PriceChanges ctx={ctx} />;
    case "savings": return <Savings ctx={ctx} />;
    case "guard": return ctx.spec.routine ? <Guard ctx={ctx} /> : null;
    default: return null; // an unknown block (a newer catalogue) is dropped, never guessed at
  }
}

export function PocketApp({ ctx, assemble = "page" }: { ctx: AppCtx; assemble?: "build" | "page" | "none" }) {
  // a preview (New pocket app) leaves out what its proof card and "What happens next" already say: the sellers and the next run
  const blocks = useMemo(() => (ctx.preview ? ctx.spec.blocks.filter((b) => b.type !== "sources" && b.type !== "next-run") : ctx.spec.blocks), [ctx.spec, ctx.preview]);
  // the payoff: a payment that settles while the app is open gets one success tap (the shelf, the meter and the run row
  // show it; the tap says it happened even when the change is below the fold)
  const paid = ctx.address && !ctx.preview ? purchasesOf(ctx.events, ctx.address).length : 0;
  const before = React.useRef(paid);
  useEffect(() => { if (paid > before.current) haptic.success(); before.current = paid; }, [paid]);
  return (
    <View style={{ gap: 12 }}>
      {blocks.map((b, i) => <Assemble key={b.type} i={i} mode={assemble}><BlockView block={b} ctx={ctx} /></Assemble>)}
    </View>
  );
}
