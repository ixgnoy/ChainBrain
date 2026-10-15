// The Brain tab: one place that shows, for the active pocket, what the agent's AI understood, how it planned and adapted,
// what it resisted, what Radar found about each seller, and what it remembers (with Forget). Everything here is derived from
// the same event stream as the chat, so it is the same on the built-in network and a real server.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useApp } from "../../store";
import { c } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { Card, Details, Press } from "../../ui/kit";
import { T } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import { Rise } from "../../ui/Rise";
import { haptic } from "../../haptics";
import { cleanText } from "../../lib/sanitize";
import { money } from "../../lib/util";
import { plainReason } from "../../lib/plain";
import { brainOf, MEMORY_KIND, sourceWords, type MemoryItem, type MemorySnapshot } from "../../lib/brain";
import { sameAddr } from "../../lib/events";
import * as api from "../../lib/api";
import { parseIntent } from "../../components/IntentCard";
import { injectionsOf } from "../../components/InjectionCard";
import { ScoreBar } from "../../components/RadarCard";

const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** One brain section: icon disc, title, a one-line status, then its body. */
function Section({ icon, title, status, children, delay = 0 }: { icon: IconName; title: string; status: string; children?: React.ReactNode; delay?: number }) {
  return (
    <Rise dy={10} delay={delay} style={{ marginTop: 12, marginHorizontal: 16 }}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }} accessible accessibilityRole="header" accessibilityLabel={`${title}. ${status}`}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={20} color={c.accent} stroke={2} /></View>
          <View style={{ flex: 1, gap: 1 }}>
            <T v="row" w="semi">{title}</T>
            <T v="sub" color="muted">{status}</T>
          </View>
        </View>
        {children ? <View style={{ gap: 10, marginTop: 14 }}>{children}</View> : null}
      </Card>
    </Rise>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2, padding: 12, borderRadius: 16, backgroundColor: c.card }} accessible accessibilityLabel={`${value} ${label}`}>
      <T v="section">{value}</T>
      <T v="cap" color="muted" numberOfLines={2}>{label}</T>
    </View>
  );
}

function Line({ icon, text, tone = "ink2" }: { icon: IconName; text: string; tone?: "ink2" | "muted" | "warning" | "accent" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <View style={{ paddingTop: 2 }}><Icon name={icon} size={16} color={tone === "warning" ? c.warning : tone === "accent" ? c.accent : c.muted} /></View>
      <T v="sub" color={tone} style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

function MemoryRow({ m, onForget }: { m: MemoryItem; onForget(): void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
      <View style={{ flex: 1, gap: 1 }}>
        <T v="sub">{cleanText(m.text, 160)}</T>
        <T v="cap" color="faint">{sourceWords(m.source)}</T>
      </View>
      <Press kind="icon" haptics="select" onPress={onForget} accessibilityRole="button" accessibilityLabel={`Forget: ${m.text}`} hitSlop={8}
        style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.fill, justifyContent: "center" }}>
        <T v="cap" w="semi" color="ink2">Forget</T>
      </Press>
    </View>
  );
}

export default function BrainTab() {
  const { active, events, sellerName, setPickerOpen, pockets } = useApp();
  const mine = useMemo(() => (active ? events.filter((e) => sameAddr(e.pocket, active.address)) : []), [events, active]);
  const injections = useMemo(() => injectionsOf(mine).length, [mine]);
  const b = useMemo(() => (active ? brainOf(events, active.address, sellerName, injections) : null), [events, active, sellerName, injections]);
  const [mem, setMem] = useState<MemorySnapshot | null>(null);
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

  return (
    <Screen>
      <PageTitle title="Brain" sub="What your agent's AI understood, checked and remembers" />
      <Press kind="row" haptics="select" disabled={pockets.length < 2} onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel={`Pocket: ${active.name}. Change pocket`}
        style={{ marginTop: 8, marginHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.fill }}>
        <T v="cap" w="semi" color="ink2">{cleanText(active.name, 28)}</T>
        {pockets.length > 1 ? <Icon name="chevronDown" size={14} color={c.muted} /> : null}
      </Press>

      <Rise dy={8} style={{ flexDirection: "row", gap: 8, marginTop: 16, marginHorizontal: 16 }}>
        <Stat value={String(b.paid)} label={`paid · ${money(b.spent)}`} />
        <Stat value={String(b.resisted.total + blocked)} label="attacks and risky sellers stopped" />
        <Stat value={mem?.version ? `v${mem.version}` : "–"} label="memory version" />
      </Rise>

      <Section icon="target" title="Understood" delay={40} status={b.task ? (b.task.status === "approved" ? "The task you confirmed" : b.task.status === "pending" ? "Waiting for you to confirm" : "You declined the last task") : "No task yet. Ask your agent to buy something."}>
        {task.length ? task.map((r, i) => (
          <View key={i} style={{ gap: 1 }}>
            {r.k ? <T v="cap" color="muted">{r.k === "Price" ? "Limits" : r.k}</T> : null}
            <T v="sub" w={r.k === "Buy" ? "semi" : "regular"}>{r.v}</T>
          </View>
        )) : null}
        {b.lastQuestion ? <Line icon="help" text={`It asked you ${b.questionsAsked === 1 ? "one question" : `${b.questionsAsked} questions`} instead of guessing: "${cleanText(b.lastQuestion, 120)}"`} /> : null}
        {b.task ? <T v="cap" color="faint">Shown from a fixed template, never reworded by the AI.</T> : null}
      </Section>

      <Section icon="checks" title="Planned and bought" delay={80} status={b.steps ? `${b.steps} steps over ${b.turns} ${b.turns === 1 ? "task" : "tasks"}` : "Nothing yet"}>
        {b.steps ? <>
          <Line icon="layers" text={`Compared ${b.sellersCompared} ${b.sellersCompared === 1 ? "seller" : "sellers"} by asking each for a price first`} />
          <Line icon="check" tone="accent" text={b.paid ? `Paid ${b.paid} ${b.paid === 1 ? "time" : "times"}, ${money(b.spent)} in total${b.cosigned ? `, ${b.cosigned} co-signed by you` : ""}` : "No payment yet"} />
        </> : null}
      </Section>

      <Section icon="refresh" title="Adapted" delay={120} status={b.adapted.length ? `${b.adapted.length} ${b.adapted.length === 1 ? "time" : "times"} it hit a rule and changed plan` : "No refusals to work around yet"}>
        {b.adapted.map((a, i) => (
          <Line key={i} icon="refresh" text={`${cleanText(a.from, 30)}: ${plainReason(a.reason)}${a.to ? ` → bought from ${cleanText(a.to, 30)} instead` : " → stopped and told you"}`} />
        ))}
      </Section>

      <Section icon="shield" title="Resisted" delay={160} status={b.resisted.total ? `${b.resisted.total} ${b.resisted.total === 1 ? "attempt" : "attempts"} stopped. No money moved.` : "No attacks on this pocket yet"}>
        {b.resisted.injections ? <Line icon="shield" text={`${b.resisted.injections} hidden ${b.resisted.injections === 1 ? "order" : "orders"} in seller pages, ignored`} /> : null}
        {b.resisted.dataRequests ? <Line icon="shield" text={`${b.resisted.dataRequests} ${b.resisted.dataRequests === 1 ? "request" : "requests"} for your data or a signature, refused`} /> : null}
        {b.resisted.attacks ? <Line icon="shield" text={`${b.resisted.attacks} chat ${b.resisted.attacks === 1 ? "attack" : "attacks"} (rule changes, key requests, "send money"), refused`} /> : null}
        {b.resisted.forcedBlocked ? <Line icon="lock" text={`${b.resisted.forcedBlocked} forced ${b.resisted.forcedBlocked === 1 ? "transfer" : "transfers"} refused on-chain by your pocket`} /> : null}
      </Section>

      <Section icon="radar" title="Radar" delay={200} status={b.radar.length ? `Checked ${b.radar.length} ${b.radar.length === 1 ? "seller" : "sellers"} on-chain${blocked ? `, ${blocked} risky` : ", all clean"}` : "Checks each seller's money before paying"}>
        {b.radar.map((r) => (
          <View key={r.key} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <T v="sub" w="semi">{cleanText(r.counterparty, 30)}</T>
              <T v="cap" w="semi" color={r.verdict === "ok" ? "accent" : r.verdict === "review" ? "warning" : "ink"}>{r.verdict === "ok" ? "Clean" : r.verdict === "review" ? "Needs your OK" : "Blocked"}</T>
            </View>
            <ScoreBar score={r.score} verdict={r.verdict} />
            {r.verdict !== "ok" && r.trail.length > 1 ? <T v="cap" color="muted">Money from {r.trail.slice(0, -1).map((n) => cleanText(n, 24)).join(" → ")}</T> : null}
          </View>
        ))}
      </Section>

      <Section icon="brain" title="Memory" delay={240} status={memState === "none" ? "This server has no brain memory yet" : mem?.version ? `Version ${mem.version}: rewritten after each task, never stacked` : "Nothing remembered yet"}>
        {mem?.summary ? <T v="sub" color="ink2">{cleanText(mem.summary, 600)}</T> : null}
        {groups.map((g) => (
          <View key={g.k} style={{ gap: 2 }}>
            <T v="cap" w="semi" color="muted" style={{ marginTop: 4 }}>{MEMORY_KIND[g.k]}</T>
            {g.items.map((m) => <MemoryRow key={m.id} m={m} onForget={() => void forget(m.id)} />)}
          </View>
        ))}
        {b.memory ? (
          <Details compact title="How it decided what to keep" rows={[["Last change", `${b.memory.added} new · ${b.memory.removed} dropped${b.memory.rejected.length ? ` · ${b.memory.rejected.length} refused` : ""}`]]}>
            {b.memory.questions.map((q, i) => (
              <View key={i} style={{ gap: 1 }}>
                <T v="cap" w="semi" color="ink2">{cleanText(q, 160)}</T>
                {b.memory!.answers[i] ? <T v="cap" color="muted">{cleanText(b.memory!.answers[i], 300)}</T> : null}
              </View>
            ))}
            <T v="cap" color="faint">It asks itself these after each task and answers only from your words and your wallet's record, never from seller pages. A memory can only make your agent more careful.</T>
          </Details>
        ) : null}
      </Section>
      <View style={{ height: 24 }} />
    </Screen>
  );
}
