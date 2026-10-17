// The Brain tab: one place that shows, for the active pocket, what the agent's AI understood, how it planned and adapted,
// what it resisted, what Radar found about each seller, and what it remembers (with Forget). Everything here is derived from
// the same event stream as the chat, so it is the same on the built-in network and a real server.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useApp } from "../../store";
import { c } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { Card, Details, Press } from "../../ui/kit";
import { Money } from "../../ui/Money";
import { SellerMark, hasSellerMark } from "../../ui/SellerMark";
import { initials } from "../../components/ActivityRow";
import Svg, { Circle } from "react-native-svg";
import { Eyebrow, Figure, T } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import { Rise } from "../../ui/Rise";
import { useLargeText } from "../../ui/fontScale";
import { haptic } from "../../haptics";
import { cleanText } from "../../lib/sanitize";
import { money, usd } from "../../lib/util";
import { plainReason } from "../../lib/plain";
import { isExpired } from "../../components/PocketCard";
import { brainOf, MEMORY_KIND, sourceWords, type MemoryItem, type MemorySnapshot } from "../../lib/brain";
import { aiName, preflightBy, sameAddr } from "../../lib/events";
import { UnfreezeButton } from "../../components/SentinelCard";
import { NEVER } from "../../lib/shared";
import * as api from "../../lib/api";
import { parseIntent } from "../../components/IntentCard";
import { injectionsOf } from "../../components/InjectionCard";
import { ScoreBar } from "../../components/RadarCard";
import { PocketFace, toneFor } from "../../components/PocketFace";
import { stripFor } from "../../components/PocketWallet";
import { cadenceText } from "../../../../shared/sim/pocketApp";
import { budgetOf, runsOf } from "../../../../shared/sim/pocketAppData";

const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** A brain card: a Clash title and an optional status pill on the right, then a visual body. No icon discs, no paragraphs. */
function Panel({ title, pill, pillTone = "fill", children, delay = 0, a11y }: { title: string; pill?: string; pillTone?: "fill" | "green" | "vermillion" | "blue"; children?: React.ReactNode; delay?: number; a11y?: string }) {
  const tone = { fill: [c.fill, c.ink2], green: [c.greenSoft, c.greenInk], vermillion: [c.vermillionSoft, c.vermillionInk], blue: [c.blueSoft, c.blueInk] }[pillTone];
  return (
    <Rise dy={10} delay={delay} style={{ marginTop: 12, marginHorizontal: 16 }}>
      <Card pad={18}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 6 }} accessible accessibilityRole="header" accessibilityLabel={a11y ?? `${title}${pill ? `. ${pill}` : ""}`}>
          <T v="head" style={{ flexGrow: 1, flexShrink: 0, maxWidth: "100%" }}>{title}</T>
          {pill ? <View style={{ paddingHorizontal: 10, minHeight: 24, paddingVertical: 2, borderRadius: 12, backgroundColor: tone[0], justifyContent: "center" }}><T v="cap" w="semi" style={{ color: tone[1] }}>{pill}</T></View> : null}
        </View>
        {children ? <View style={{ gap: 12, marginTop: 14 }}>{children}</View> : null}
      </Card>
    </Rise>
  );
}

/** A seller's face: its official logo, or initials for the demo's fictional sellers. */
function Face({ id, name, size = 28 }: { id?: string; name: string; size?: number }) {
  if (id && hasSellerMark(id)) return <SellerMark id={id} size={size} radius={Math.round(size * 0.27)} />;
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}>
      <T v="cap" w="bold" allowFontScaling={false} style={{ fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.48) }}>{initials(name)}</T>
    </View>
  );
}

/** One horizontal bar with its count: the shopping funnel. */
function FunnelBar({ label, n, max, color }: { label: string; n: number; max: number; color: string }) {
  return (
    <View style={{ gap: 4 }} accessible accessibilityLabel={`${label}: ${n}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T v="sub" color="ink2">{label}</T>
        <T v="row">{String(n)}</T>
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: c.fill, overflow: "hidden" }}>
        <View style={{ width: `${max ? Math.max(4, (n / max) * 100) : 0}%`, height: "100%", borderRadius: 5, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** A counter for one kind of attack: four sit in a row; a non-zero one turns ink, zero stays quiet. */
function Counter({ icon, n, label, a11y }: { icon: IconName; n: number; label: string; a11y: string }) {
  const on = n > 0;
  const big = useLargeText();
  return (
    <View style={{ flexGrow: 1, flexBasis: big ? "45%" : 0, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14, backgroundColor: on ? c.ink : c.fill, alignItems: "center", gap: 4 }} accessible accessibilityLabel={`${n} ${a11y}`}>
      <Icon name={icon} size={16} color={on ? c.white : c.faint} stroke={1.75} />
      <T v="head" style={{ color: on ? c.white : c.faint, fontSize: 20, lineHeight: 24 }}>{String(n)}</T>
      <T v="cap" numberOfLines={big ? 2 : 1} adjustsFontSizeToFit={!big} minimumFontScale={0.8} style={{ color: on ? "rgba(255,255,255,0.7)" : c.muted, fontSize: 11, textAlign: "center" }}>{label}</T>
    </View>
  );
}

/** A thin ring that fills to `share` (pre-flight accuracy). */
function Ring({ share, size = 56 }: { share: number; size?: number }) {
  const r = size / 2 - 4, len = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.fill} strokeWidth={6} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.green} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - share)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </Svg>
  );
}

/** A remembered item you can remove. A purchase reads as the seller's logo, what was bought and the price. */
function MemoryChip({ m, onForget, idOf }: { m: MemoryItem; onForget(): void; idOf(name: string): string | undefined }) {
  // shared/sim/reflect.ts writes: Bought "<item>" from <seller> for US$<amount>[, co-signed by the owner]
  const buy = /^Bought "(.+)" from (.+) for (US\$[\d.]+)(, co-signed by the owner)?$/.exec(m.text);
  const big = useLargeText();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: buy ? 6 : 12, paddingRight: 4, paddingVertical: 4, minHeight: 40, borderRadius: 20, backgroundColor: c.fill, maxWidth: "100%" }}>
      {buy ? <Face id={idOf(buy[2])} name={buy[2]} size={28} /> : null}
      <T v="sub" numberOfLines={big ? 2 : 1} style={{ flexShrink: 1 }}>{cleanText(buy ? buy[1] : m.text, 90)}</T>
      {buy ? <Figure text={buy[3]} size={13} color="muted" /> : null}
      <Press kind="icon" haptics="select" onPress={onForget} accessibilityRole="button" accessibilityLabel={`Forget: ${m.text}`} hitSlop={8}
        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
        <Icon name="x" size={14} color={c.muted} stroke={2.2} />
      </Press>
    </View>
  );
}

// the spending bar's segments, VaultBank's palette in order
const SEG = [c.ink, c.vermillion, c.blue, c.line, c.green];

export default function BrainTab() {
  const { active, events, sellerName, setPickerOpen, pockets, cfg } = useApp();
  const mine = useMemo(() => (active ? events.filter((e) => sameAddr(e.pocket, active.address)) : []), [events, active]);
  const injections = useMemo(() => injectionsOf(mine).length, [mine]);
  const b = useMemo(() => (active ? brainOf(events, active.address, sellerName, injections) : null), [events, active, sellerName, injections]);
  const [mem, setMem] = useState<MemorySnapshot | null>(null);
  const [stripW, setStripW] = useState(0);
  const [memState, setMemState] = useState<"loading" | "ok" | "none">("loading");

  const memAt = b?.memory?.at ?? 0;
  const loadMem = useCallback(async () => {
    if (!active) return;
    const r = await api.fetchMemory(active.address).catch(() => null);
    setMem(r?.snapshot ?? null);
    setMemState(r ? "ok" : "none");
  }, [active]);
  useEffect(() => { void loadMem(); }, [loadMem, memAt]);
  const forget = async (id: string) => {
    if (!active) return;
    haptic.medium();
    await api.forgetMemory(active.address, id);
    await loadMem();
  };

  if (!active || !b) {
    return (
      <Screen>
        <PageTitle title="Brain" sub="Create a pocket first: the brain works per pocket." />
      </Screen>
    );
  }
  const task = b.task ? parseIntent(b.task.text) : [];
  const groups = (Object.keys(MEMORY_KIND) as MemoryItem["kind"][]).map((k) => ({ k, items: (mem?.items ?? []).filter((i) => i.kind === k) })).filter((g) => g.items.length);
  const blocked = b.radar.filter((r) => r.verdict !== "ok").length;
  const sellerList = cfg?.sellers ?? [];
  const idOf = (name: string) => sellerList.find((s) => s.name === name)?.id;
  const allowed = active.allowed.map((id) => ({ id, name: sellerList.find((x) => x.id === id)?.name ?? id }));
  const off = active.revoked || !!active.frozen || isExpired(active);
  // spending by seller, from this pocket's payments
  const bySeller = new Map<string, bigint>();
  for (const e of mine) if (e.type === "payment" && e.sellerId) { try { bySeller.set(e.sellerId, (bySeller.get(e.sellerId) ?? 0n) + BigInt(e.amount ?? 0)); } catch { /* malformed amount */ } }
  const spend = [...bySeller.entries()].sort((a, z) => (z[1] > a[1] ? 1 : -1));
  const spendTotal = spend.reduce((n, [, v]) => n + v, 0n);
  const quotes = mine.filter((e) => e.type === "trace" && e.phase === "tool_result" && e.tool === "get_quote").length;
  const refusals = mine.filter((e) => e.type === "refusal").length;
  const funnelMax = Math.max(quotes, b.paid, refusals, 1);
  const pfOk = b.preflight.filter((x) => x.matched).length;
  // the pocket's routine (built-in network): runs without being asked, inside fixed fields a seller's text can't change
  const routine = api.routineOf(active.address);
  const runs = routine ? runsOf(mine, active.address) : [];
  const ignored = runs.reduce((n, r) => n + r.ignored.length, 0);
  const rb = routine ? budgetOf(mine, active.address, { routine, balance: active.balance, now: Date.now() }) : null;
  const sentinelNow = active.frozen ? "Froze the pocket" : b.sentinel.at(-1)?.kind === "hold" ? "Waiting for you" : b.sentinel.some((v) => v.kind !== "clear") ? "Watching" : "All clear";

  return (
    <Screen>
      <PageTitle title="Brain" sub="What your agent understood, checked and remembers" />
      {/* the pocket this brain is about, as its own card strip (the same as Home's stack): tap to choose another */}
      <Press kind="row" haptics="select" disabled={pockets.length < 2} onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel={`Pocket: ${active.name}. Change pocket`}
        style={{ marginTop: 8, marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, height: stripFor(stripW), borderRadius: 18, overflow: "hidden" }} onLayout={(e) => setStripW(e.nativeEvent.layout.width)}>
          {stripW ? <PocketFace pocket={active} width={stripW} tone={toneFor(pockets, active.address)} still peek /> : null}
        </View>
        {pockets.length > 1 ? <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name="chevronDown" size={18} color={c.ink} stroke={2.2} /></View> : null}
      </Press>

      <Panel title="Understood" pill={b.task ? (b.task.status === "approved" ? "Confirmed" : b.task.status === "pending" ? "Waiting for you" : "Declined") : "No task yet"} pillTone={b.task?.status === "approved" ? "green" : b.task?.status === "pending" ? "blue" : "fill"} delay={50}>
        {task.length ? <>
          {task.filter((r) => r.k === "Buy" || !r.k).slice(0, 1).map((r, i) => <T key={i} v="row">{cap1(r.v)}</T>)}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {task.filter((r) => r.k && r.k !== "Buy").map((r, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, minHeight: 30, borderRadius: 15, backgroundColor: c.fill, maxWidth: "100%" }}>
                <Icon name={r.k === "Deadline" ? "clock" : "gauge"} size={13} color={c.muted} />
                <T v="cap" w="medium" style={{ flexShrink: 1 }}>{r.v}</T>
              </View>
            ))}
          </View>
        </> : null}
        {b.lastQuestion ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <Icon name="help" size={16} color={c.blueInk} />
            <T v="sub" color="ink2" style={{ flex: 1 }}>{`Asked instead of guessing: "${cleanText(b.lastQuestion, 100)}"`}</T>
          </View>
        ) : null}
      </Panel>

      {/* how it shopped: a funnel, then each re-plan drawn as seller -> seller */}
      <Panel title="How it shopped" pill={b.cosigned ? `${b.cosigned} co-signed by you` : undefined} pillTone="blue" delay={70}>
        <FunnelBar label="Prices asked" n={quotes} max={funnelMax} color={c.blue} />
        <FunnelBar label="Paid" n={b.paid} max={funnelMax} color={c.ink} />
        <FunnelBar label="Refused by your rules" n={refusals} max={funnelMax} color={c.vermillion} />
        {b.negotiated ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 14, backgroundColor: c.fill }} accessible accessibilityLabel={`Negotiated ${b.negotiated === 1 ? "a price" : `${b.negotiated} prices`} down, ${money(b.saved)} saved`}>
            <Icon name="arrowDown" size={14} color={c.greenInk} stroke={2.4} />
            <T v="cap" color="ink2" style={{ flex: 1 }}>{`Negotiated ${b.negotiated === 1 ? "a price" : `${b.negotiated} prices`} down: ${money(b.saved)} saved, numbers only`}</T>
          </View>
        ) : null}
        {b.adapted.slice(-3).map((a, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 14, backgroundColor: c.fill }} accessible accessibilityLabel={`${a.from} refused, ${plainReason(a.reason)}${a.to ? `, bought from ${a.to} instead` : ", stopped"}`}>
            <View style={{ opacity: 0.55 }}><Face id={idOf(a.from)} name={a.from} size={30} /></View>
            <Icon name="x" size={14} color={c.vermillionInk} stroke={2.4} />
            <T v="cap" color="muted" numberOfLines={2} style={{ flex: 1 }}>{plainReason(a.reason)}</T>
            <Icon name="arrowUpRight" size={14} color={c.muted} />
            {a.to ? <Face id={idOf(a.to)} name={a.to} size={30} /> : <Icon name="stop" size={18} color={c.muted} />}
          </View>
        ))}
      </Panel>

      {/* what guarded it: what it refused, the Sentinel and Pre-flight, and each seller's Radar score, in one card */}
      <Panel title="Guarded" pill={b.resisted.total ? `${b.resisted.total} stopped · no money moved` : "Nothing tried yet"} pillTone={b.resisted.total ? "green" : "fill"} delay={70}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <Counter icon="shield" n={b.resisted.injections} label="Orders" a11y="hidden orders in seller pages ignored" />
          <Counter icon="lock" n={b.resisted.dataRequests} label="Data" a11y="requests for your data or a signature refused" />
          <Counter icon="alert" n={b.resisted.attacks} label="Attacks" a11y="chat attacks refused" />
          <Counter icon="ban" n={b.resisted.forcedBlocked} label="Forced" a11y="forced transfers refused on-chain" />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View accessible accessibilityLabel={b.preflight.length ? `Pre-flight predicted ${pfOk} of ${b.preflight.length} attempts` : "Pre-flight: no payments yet"} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, backgroundColor: c.fill }}>
            <Ring share={b.preflight.length ? pfOk / b.preflight.length : 0} size={36} />
            <View><T v="head">{b.preflight.length ? `${pfOk}/${b.preflight.length}` : "–"}</T><T v="tab" color="muted">Pre-flight</T></View>
          </View>
          <View accessible accessibilityLabel={`Sentinel: ${sentinelNow}`} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, backgroundColor: active.frozen ? c.vermillionSoft : c.greenSoft }}>
            <Icon name={active.frozen ? "freeze" : "eye"} size={20} color={active.frozen ? c.vermillionInk : c.greenInk} />
            <View style={{ flexShrink: 1 }}><T v="head" numberOfLines={1} style={{ color: active.frozen ? c.vermillionInk : c.greenInk }}>{sentinelNow}</T><T v="tab" color="muted">Sentinel</T></View>
          </View>
        </View>
        {active.frozen ? <UnfreezeButton pocket={active.address} /> : null}
        {b.radar.map((r) => (
          <View key={r.key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessible accessibilityLabel={`Radar, ${r.counterparty}: risk ${r.score} of 10, ${r.verdict === "ok" ? "clean" : r.verdict === "review" ? "needs your OK" : "blocked"}`}>
            <Face id={r.sellerId} name={r.counterparty} size={28} />
            <View style={{ flex: 1 }}><ScoreBar score={r.score} verdict={r.verdict} /></View>
            <T v="cap" w="semi" style={{ width: 64, textAlign: "right", color: r.verdict === "ok" ? c.greenInk : r.verdict === "review" ? c.blueInk : c.vermillionInk }}>{r.verdict === "ok" ? "Clean" : r.verdict === "review" ? "Ask you" : "Blocked"}</T>
          </View>
        ))}
        <View>
        <Details compact title="How Pre-flight and the Sentinel decide" rows={[
          ["Pre-flight", b.preflight.length ? `Checked with ${preflightBy(b.preflight.at(-1)?.predicted.by)} before any money moved` : "Predicts each payment before sending it"],
          ["Sentinel rules", "3 payments outside your rules in a minute, money leaving with no payment, a refusal right after a seller page gave orders"],
          ["Sentinel AI", (() => { const by = b.sentinel.filter((v) => v.ai).at(-1)?.ai?.by; return by ? aiName(by) : "Not asked yet: it is asked only when a rule fires"; })()],
          ["Its power", "Freeze only, with its own key. It can't move money or change your rules"],
        ]} />
        </View>

      </Panel>

      {/* memory: what it keeps, as chips you can remove */}
      <Panel title="Remembers" pill={memState === "none" ? "Not on this server" : mem?.version ? `Version ${mem.version}` : "Nothing yet"} delay={150}>
        {groups.map((g) => (
          <View key={g.k} style={{ gap: 6 }}>
            <Eyebrow>{MEMORY_KIND[g.k]}</Eyebrow>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {g.items.map((m) => <MemoryChip key={m.id} m={m} idOf={idOf} onForget={() => void forget(m.id)} />)}
            </View>
          </View>
        ))}
        {mem?.summary || b.memory ? (
          <Details compact title="How it decided what to keep" rows={b.memory ? [["Last change", `${b.memory.added} new · ${b.memory.removed} dropped${b.memory.rejected.length ? ` · ${b.memory.rejected.length} refused` : ""}`]] : []}>
            {mem?.summary ? <T v="cap" color="ink2">{cleanText(mem.summary, 400)}</T> : null}
            {b.memory?.questions.map((q, i) => (
              <View key={i} style={{ gap: 1 }}>
                <T v="cap" w="semi" color="ink2">{cleanText(q, 160)}</T>
                {b.memory!.answers[i] ? <T v="cap" color="muted">{cleanText(b.memory!.answers[i], 300)}</T> : null}
              </View>
            ))}
            <T v="cap" color="faint">Answered only from your words and your wallet's record, never from seller pages. Memory never changes your pocket's rules: only you can, by signing.</T>
          </Details>
        ) : null}
      </Panel>
      <View style={{ height: 24 }} />
    </Screen>
  );
}
