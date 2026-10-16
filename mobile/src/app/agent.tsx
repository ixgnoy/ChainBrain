import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedKeyboard, useAnimatedReaction, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp, type Turn } from "../store";
import { c, F, hairline, level1, lift, radius } from "../tokens";
import { Avatar, Button, Press, type PressTap } from "../ui/kit";
import { autoplayAlive, autoplayRun, typeOut, useAutoplayTarget } from "../lib/autoplayTargets";
import { StatusDot, type DotState } from "../ui/StatusDot";
import { AgentAvatar } from "../ui/AgentAvatar";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { useReduceMotion } from "../ui/motion";
import { TraceBlock, STEP } from "../components/TraceBlock";
import { parseIntent } from "../components/IntentCard";
import { DeadEndCard } from "../components/DeadEndCard";
import { SellerRefusal, refusalsOf } from "../components/RefusalCard";
import { EventCard } from "../components/EventCard";
import { StoppedCard } from "../components/StoppedCard";
import { Rise, useStagger, firstTime } from "../ui/Rise";
import { StreamText } from "../ui/StreamText";
import { PaidCard } from "../components/PaidCard";
import { AttackCard, isAttackEvent } from "../components/AttackCard";
import { InjectionCard, injectionsOf } from "../components/InjectionCard";
import { RadarAlertCard, RadarBlock } from "../components/RadarCard";
import { SentinelCard } from "../components/SentinelCard";
import { SendButton } from "../ui/SendButton";
import { WorkingLine } from "../ui/WorkingLine";
import { cleanText } from "../lib/sanitize";
import { devScenes, type Scene } from "../lib/api";
import { sameAddr, sliceTurn, replyOf, toolResultOf, summarizeTool, traceLines, radarScreens, radarAlerts, sentinelEvents, type WalletEvent } from "../lib/events";
import { deadEndOf } from "../lib/deadend";
import { money, usd } from "../lib/util";
import { isTightCap } from "../lib/presets";
import { plainAsks } from "../lib/plain";
import { haptic } from "../haptics";
import { useGrowCap } from "../ui/fontScale";

type ChipItem = { label: string; text: string };
// a server without /dev/scenes: tasks that name no seller (real provider names belong to the built-in network only)
const DEFAULTS: ChipItem[] = [
  { label: "A durian market report", text: "Get me a market report on durian exports, under US$2, by tonight." },
  { label: "Research a durian deal", text: "Research a durian import deal for me: export news, the USDC price and a check on the exporter's wallet. Under US$0.10, by tonight." },
];

/** "US$2 in total or per report?" -> ["US$2 in total", "US$2 per report"]: the two answers a one-tap reply needs. */
export function answerOptions(q: string): string[] {
  const m = /^(.+?)\s+or\s+(.+?)\?$/i.exec(q.trim());
  if (!m) return [];
  let [a, b] = [m[1].trim(), m[2].trim()];
  const amount = /US\$\d+(?:\.\d+)?/.exec(a)?.[0];
  if (amount && !/US\$/.test(b)) b = `${amount} ${b}`;
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  return a.length <= 24 && b.length <= 24 ? [cap(a), cap(b)] : [];
}

/** The task waits for the owner: one compact card in the chat (the sheet holds the full task). */
function TaskWaiting({ text, onOpen, id }: { text: string; onOpen(): void; id: string }) {
  const what = parseIntent(text).find((r) => r.k === "Buy")?.v ?? "A new task";
  return (
    <EventCard tone="waiting" title="Confirm the task" body={cleanText(what, 80)} onPress={onOpen} a11y={`Review task: ${what}`}
      onEnter={() => { if (firstTime(`intent:${id}`)) haptic.medium(); }} amount="Review" />
  );
}

/** After a task the brain rewrites its memory: one quiet line, a tap opens the Brain tab. */
function MemoryLine({ e }: { e: WalletEvent }) {
  const applied: { op: string }[] = Array.isArray(e.applied) ? e.applied : [];
  const add = applied.filter((a) => a.op === "add").length, drop = applied.filter((a) => a.op === "delete").length;
  const what = [add ? `${add} new` : "", drop ? `${drop} dropped` : ""].filter(Boolean).join(", ") || "checked";
  return (
    <Press kind="row" haptics="select" onPress={() => router.navigate("/brain")} accessibilityRole="button" accessibilityLabel={`Memory updated to version ${e.version}, ${what}. Open the Brain tab`}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32, alignSelf: "flex-start" }}>
      <Icon name="brain" size={16} color={c.vermillion} />
      <T v="cap" color="muted">Memory updated · v{String(e.version)} · {what}</T>
      <Icon name="chevronRight" size={14} color={c.faint} />
    </Press>
  );
}

/** The reply of a finished turn: streams in the first time it is seen, then stays still. */
function Reply({ id, text }: { id: string; text: string }) {
  const fresh = useRef(firstTime(`reply:${id}`)).current;
  return <StreamText text={text} play={fresh} />;
}

/** The owner's message: a black bubble (Stitch). Optimistic copies rise from the composer (24 pt, snappy); the real turn that replaces it does not re-animate. */
function UserBubble({ text, fresh }: { text: string; fresh: boolean }) {
  return (
    <Rise instant={!fresh} dy={24} spring="snappy" style={{ alignSelf: "flex-end", maxWidth: "84%" }}>
      <View style={{ backgroundColor: c.ink, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18, borderBottomRightRadius: 6, borderCurve: "continuous" }}>
        <T v="body" style={{ color: c.white }}>{cleanText(text, 1000)}</T>
      </View>
    </Rise>
  );
}

/** The agent's words for a turn: a white card with the ChainBrain eyebrow (Stitch "CHAINBRAIN ENGINE"), the reply, its steps. */
function AgentCardBlock({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <AgentAvatar kind="chainbrain" size={30} />
      <View style={{ flex: 1, backgroundColor: c.card, borderRadius: radius.card, borderTopLeftRadius: 6, borderCurve: "continuous", borderWidth: 1, borderColor: hairline, padding: 16, gap: 8, ...level1 }}>
        <T v="tab" color="muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>ChainBrain</T>
        {children}
      </View>
    </View>
  );
}

/** "Paid Exa US$0.007" or "Asked for a price: US$0.007": the latest finished step in the pocket's events. */
export function lastStepText(events: WalletEvent[], sellerName: (id?: string) => string): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "payment") return `Paid ${cleanText(sellerName(e.sellerId), 30)} US$${usd(BigInt(e.amount ?? 0))}`;
    if (e.type === "trace" && e.phase === "tool_result" && e.tool === "pay") {
      const p = events.slice(0, i + 2).reverse().find((x) => x.type === "payment");
      if (p) return `Paid ${cleanText(sellerName(p.sellerId), 30)} US$${usd(BigInt(p.amount ?? 0))}`;
    }
    if (e.type === "trace" && e.phase === "tool_result" && e.tool) {
      const sum = summarizeTool(e.tool, toolResultOf(e));
      const plain = sum.replace(/,\s*[A-Z][A-Z_]{3,}$/, ""); // reason codes live under "Why", never in a sentence
      return `${STEP[e.tool] ?? "Took a step"}${plain && !/^[A-Z][A-Z_]{3,}$/.test(plain) ? `: ${cleanText(plain, 60)}` : ""}`;
    }
  }
  return null;
}

/** Bottom padding that follows the keyboard's animated height (iOS). Elsewhere a static value (web has no keyboard API; Android resizes). */
function useRideKeyboard(base: number) {
  const ios = Platform.OS === "ios";
  const keyboard = ios ? useAnimatedKeyboard() : null; // eslint-disable-line react-hooks/rules-of-hooks -- the platform never changes at runtime
  const full = useSharedValue(336);
  useAnimatedReaction(() => keyboard?.height.value ?? 0, (h) => { if (h > full.value) full.value = h; });
  return useAnimatedStyle(() => {
    const h = keyboard?.height.value ?? 0;
    const t = Math.min(1, h / full.value);
    return { paddingBottom: 8 + h + (base - 8) * (1 - t) };
  });
}

export default function AgentChat() {
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { active, turns, sendChat, chatBusy, agentState, events, pending, answer, dev, source, setApprovalOpen, openApproval, setQuestionOpen, sellerName, setAction, ownerTxs, wallet, pockets, setPickerOpen, autoplay, cfg } = useApp();
  const [text, setText] = useState("");
  const grow = useGrowCap("body");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [kb, setKb] = useState(false);
  // optimistic bubble: shown the instant the owner sends, until the store has the real turn (it polls once before adding it)
  const [sent, setSent] = useState<{ text: string; n: number } | null>(null);
  // a long session keeps the latest exchanges in view; older ones fold behind one quiet row
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [active?.address]);
  const scroll = useRef<ScrollView>(null);
  const stick = useRef(true);
  const dragging = useRef(false); // the owner is scrolling by hand: only then does the position decide following / "Jump to latest"
  const [away, setAway] = useState(false); // scrolled well above the latest message: show "Jump to latest"
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (dev || source === "builtin") devScenes().then(setScenes).catch(() => {}); else setScenes([]); }, [dev, source]);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  // the composer rides the keyboard (iOS): padding follows the keyboard's height frame by frame, no jump between "tab bar room" and "keyboard room"
  const base = insets.bottom + 10; // a pushed screen: no tab bar under the composer
  const ride = useRideKeyboard(base);

  const mine = useMemo(() => (active ? events.filter((e) => sameAddr(e.pocket, active.address)) : []), [events, active]);
  const mineLen = mine.length;
  // a turn ends with its reply: what happens after it (a forced transfer, the Sentinel freezing the pocket, Radar re-screening
  // a seller) is shown between the messages where it happened, or after the conversation, where the owner is looking; it is
  // never folded into the last answer above its reply
  const endOf = (t: Turn) => t.endAt ?? t.toAt;
  const inTurn = (at: number) => turns.some((t) => { const end = endOf(t); return at > t.fromAt && (end == null || at <= end); });
  const idle = useMemo(() => {
    const alerts = active ? radarAlerts(mine, active.address).filter((a) => !inTurn(a.at)).map((a) => ({ key: a.key, at: a.at, node: <RadarAlertCard key={a.key} a={a} /> })) : [];
    const sentinel = sentinelEvents(mine).filter((v) => !inTurn(v.at)).map((v) => ({ key: v.key, at: v.at, node: <SentinelCard key={v.key} v={v} /> }));
    // attacks outside a chat turn (the console sets them off through the relay, a forced transfer from the laptop)
    const attacks = mine.filter((e) => isAttackEvent(e) && !inTurn(e.at)).map((e, k) => ({ key: `idle${e.type}${e.at}${k}`, at: e.at, node: <AttackCard key={`idle${e.type}${e.at}${k}`} e={e} /> }));
    return [...alerts, ...sentinel, ...attacks].sort((a, b) => a.at - b.at);
  }, [mine, turns, active]); // eslint-disable-line react-hooks/exhaustive-deps

  // follow the conversation: smooth scroll to the end while the owner is at (or near) the bottom; content growing (steps, cards) retriggers it
  const toEnd = () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => { if (stick.current) scroll.current?.scrollToEnd({ animated: !reduce }); }, 70);
  };
  useEffect(() => { toEnd(); }, [turns, mineLen, pending.length, reduce, active?.revoked, sent]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (scrollTimer.current) clearTimeout(scrollTimer.current); }, []);

  useEffect(() => {
    if (sent && turns.length > sent.n) setSent(null); // the real turn takes the same place, without a second entrance
  }, [turns, sent]);

  const here = (a: { pocket: string }) => !!active && sameAddr(a.pocket, active.address);
  const intent = pending.find((a) => a.kind === "intent" && here(a));
  const pay = pending.find((a) => a.kind === "payment" && here(a));
  const question = pending.find((a) => a.kind === "question" && here(a));

  const send = (v: string) => {
    if (!v.trim() || chatBusy || !active) return;
    haptic.light(); setText("");
    stick.current = true;
    setSent({ text: v.trim(), n: turns.length });
    void sendChat(v).finally(() => setSent(null));
  };
  // ---- hidden auto-play (long-press the header ~1.5 s): the composer types the sentence, then presses send like a finger
  const sendRef = useRef(send);
  sendRef.current = send;
  const sendTap = useRef<PressTap | null>(null);
  useAutoplayTarget("composer", async (arg) => {
    const run = autoplayRun();
    const v = String(arg?.text ?? "");
    if (!sendTap.current) return false; // not laid out yet: the driver retries
    stick.current = true;
    setText("");
    await typeOut(v, setText, { cancelled: () => !autoplayAlive(run) });
    if (!autoplayAlive(run)) return false;
    await new Promise((r) => setTimeout(r, 450));
    if (!autoplayAlive(run)) { setText(""); return false; }
    // the send press starts only once the text is in: the disc dips, the message leaves, then the input clears
    return await sendTap.current(() => sendRef.current(v));
  }, !!active);
  const answerTaps = useRef<Record<string, React.MutableRefObject<PressTap | null>>>({});
  const answerTap = (o: string) => (answerTaps.current[o] ??= { current: null });
  useAutoplayTarget("question.answer", async (arg) => {
    const opts = question ? answerOptions(question.text) : [];
    const want = String(arg ?? "").toLowerCase();
    const pick = opts.find((o) => o.toLowerCase().includes(want)) ?? opts[0];
    if (pick) { const t = answerTap(pick).current; return t ? await t() : false; }
    if (want) { sendRef.current(String(arg)); return true; }
    return false;
  }, !!question);
  // hidden auto-play: a 1.5 s hold on the header. It lives on the header button itself: on iOS the Pressable takes the touch,
  // so a long-press gesture wrapped around it never fires
  const HOLD_MS = 1500;

  const follow: ChipItem[] = question ? scenes.filter((s) => s.followUp).map((s) => ({ label: s.followChip ?? s.followUp!, text: s.followUp! })) : [];
  // a tight pocket (cap US$0.20 or less) leads with the dead-end task; otherwise the scenes in story order
  const tight = !!active && isTightCap(active.cap, (cfg?.sellers ?? []).map((s) => s.id));
  const ordered = tight ? [...scenes.filter((s) => s.preset === "one-purchase"), ...scenes.filter((s) => s.preset !== "one-purchase")] : scenes;
  // used suggestions go away; while the agent works only the answer to its question is offered
  const used = new Set(turns.map((t) => t.text.trim()));
  const offers = (scenes.length ? ordered.map((s) => ({ label: s.chip ?? s.text, text: s.text })) : DEFAULTS).filter((x) => !used.has(x.text));
  const chipItems = (question ? follow : chatBusy ? [] : offers).slice(0, 12);
  const prompts = chipItems.slice(0, 3); // the empty chat leads with full-width prompt rows instead of chips
  const chips = chipItems.map((x) => x.label);
  const chipDelay = useStagger(chips, 40, 8);
  const last = turns.at(-1);
  // the same planted order is shown once: a later turn that reads the same seller text again does not repeat the card
  const seenInj = useMemo(() => {
    const out = new Map<string, Set<string>>();
    const shown = new Set<string>();
    for (const t of turns) {
      const dup = new Set<string>();
      for (const x of injectionsOf(sliceTurn(mine, t.fromAt, endOf(t)))) { const k = JSON.stringify(x); if (shown.has(k)) dup.add(k); shown.add(k); }
      out.set(t.id, dup);
    }
    return out;
  }, [turns, mine]);
  const hidden = showAll ? 0 : Math.max(0, turns.length - 3);
  const canStop = !!active && active.owned && !!wallet && !active.revoked && Number(active.expiresAt) * 1000 > Date.now();
  // the last step of THIS task only (an earlier task's payment must not read as this one's)
  const stopped = active?.revoked ? lastStepText(last ? sliceTurn(mine, last.fromAt, endOf(last)) : [], sellerName) : null;
  const stopTx = active ? ownerTxs.filter((t) => t.kind === "revoke" && sameAddr(t.pocket, active.address)).at(-1) : undefined;
  const waitingHere = !!(intent || pay || question);
  const busyHere = chatBusy || waitingHere;
  const dot: DotState = active?.revoked || active?.frozen ? "stopped" : waitingHere ? "waiting" : chatBusy ? "working" : "ready";
  const headStatus = !active ? "Create a pocket first" : active.revoked ? "Stopped · this pocket is off" : active.frozen ? "Frozen by the Sentinel · only you can unfreeze"
    : waitingHere ? "Waiting for you" : chatBusy ? "Working…" : `Ready · ${money(active.balance)} left`;
  const ready = !!text.trim() && !chatBusy;
  // the stop path is revoking the pocket (confirmed by the hold-to-revoke sheet); without one, send simply hides while the agent works
  const showStop = canStop && chatBusy;
  const typing = text.trim().length > 0;
  const empty = turns.length === 0 && !sent;

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Press kind="round" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityRole="button" accessibilityLabel="Back"
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: hairline, alignItems: "center", justifyContent: "center", ...level1 }}>
          <Icon name="chevronLeft" size={22} stroke={2.2} />
        </Press>
        <Press kind="row" haptics="select" auto="picker.open" onPress={() => { if (pockets.filter((p) => (p.agentId ?? "chainbrain") === "chainbrain").length > 1) setPickerOpen(true); }} onLongPress={() => autoplay.toggle()} delayLongPress={HOLD_MS} hitSlop={6}
          accessibilityRole="button" accessibilityLabel={active ? `${active.name}, ${headStatus}. Change pocket` : "No pocket yet"}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: c.card, borderWidth: 1, borderColor: hairline }}>
          <AgentAvatar kind="chainbrain" size={38} badge={dot === "ready" ? c.green : dot === "stopped" ? c.faint : c.vermillion} />
          <View style={{ flex: 1, gap: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <T v="head" numberOfLines={1} accessibilityRole="header" style={{ flexShrink: 1 }}>ChainBrain Agent</T>
              <Icon name="circleCheck" size={14} color={c.vermillion} stroke={2.2} />
            </View>
            <T v="cap" color="muted" numberOfLines={1}>{active ? `Pocket: ${cleanText(active.name, 22)} · ${headStatus}` : "Create a pocket first"}</T>
          </View>
          <Icon name="chevronDown" size={16} color={c.muted} />
        </Press>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 20, flexGrow: 1 }} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => { const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent; const gap = contentSize.height - (contentOffset.y + layoutMeasurement.height); if (gap < 80) { stick.current = true; setAway(false); } else if (dragging.current) { stick.current = false; setAway(gap > 140); } }}
          onScrollBeginDrag={() => { dragging.current = true; }} onScrollEndDrag={() => { setTimeout(() => { dragging.current = false; }, 400); }}
          onContentSizeChange={toEnd}
        >
          {empty && (
            <Rise dy={8} duration={260}>
              <View style={{ flex: 1, justifyContent: "center", gap: 20, paddingVertical: 24 }}>
                <View style={{ gap: 8 }}>
                  <T v="display">{active ? "What should I buy?" : "Create a pocket first"}</T>
                  <T v="body" color="ink2">{active ? "I only spend from the pocket you funded, within the limits you set. For bigger payments I wait for your OK." : "Your agent works inside a pocket. Create one on Home, then come back."}</T>
                </View>
                {active && prompts.length ? (
                  <View style={{ gap: 8 }}>
                    {prompts.map(({ label, text: say }, i) => (
                      <Rise key={label} delay={80 + i * 50} dy={8}>
                        <Press kind="row" haptics="select" onPress={() => send(say)} disabled={chatBusy} accessibilityRole="button" accessibilityLabel={cleanText(say, 160)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, paddingHorizontal: 16, borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: c.card, borderWidth: 1, borderColor: c.tileStroke }}>
                          <Icon name={i === 0 ? "chat" : "bolt"} size={20} color={c.vermillion} />
                          <T v="row" style={{ flex: 1, fontSize: 15, lineHeight: 22 }} numberOfLines={2}>{cleanText(label, 80)}</T>
                          <Icon name="chevronRight" size={16} color={c.faint} />
                        </Press>
                      </Rise>
                    ))}
                  </View>
                ) : null}
              </View>
            </Rise>
          )}
          {hidden > 0 ? (
            <Press kind="row" haptics="select" onPress={() => setShowAll(true)} accessibilityRole="button" accessibilityLabel={`Show ${hidden} earlier messages`}
              style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.fill }}>
              <Icon name="chevronUp" size={14} color={c.ink2} />
              <T v="cap" w="medium" color="ink2">{hidden} earlier {hidden === 1 ? "message" : "messages"}</T>
            </Press>
          ) : null}
          {turns.slice(hidden).map((t: Turn, k) => {
            const i = hidden + k;
            const evs = sliceTurn(mine, t.fromAt, endOf(t));
            const disclosures = evs.filter((e) => e.type === "disclosure");
            const reply = t.reply ?? replyOf(evs);
            const isLast = i === turns.length - 1;
            const dead = t.done && active ? deadEndOf(evs, active) : null;
            const refusals = dead ? [] : refusalsOf(evs);
            // what happened between the previous message and this one (a freeze, a forced transfer), in its place in time
            const since = turns[i - 1]?.fromAt ?? -Infinity;
            return (
              <View key={t.id} style={{ gap: 10 }}>
                {idle.filter((x) => x.at > since && x.at <= t.fromAt).map((x) => x.node)}
                <UserBubble text={t.text} fresh={false} />
                {disclosures.map((d, k) => (
                  <EventCard key={k} tone="refused" alert={`${t.id}:d${k}`} title={`${cleanText(sellerName(d.sellerId), 40)} asked for more data`}
                    body={`It asked for ${plainAsks(d.asked ?? [], !!d.signRequest)}. Your wallet refused and nothing was shared.`}
                    why={{ codes: (d.refused ?? []).map((r: string) => cleanText(r, 40)) }} />
                ))}
                {refusals.map((r) => <SellerRefusal key={r.sellerId} id={`${t.id}:r${r.sellerId}`} seller={sellerName(r.sellerId)} reasons={r.reasons} />)}
                {active ? radarAlerts(evs, active.address).filter((a) => !radarScreens(evs).some((v) => v.verdict !== "ok" && v.counterparty === a.name)).map((a) => <RadarAlertCard key={a.key} a={a} />) : null}
                <RadarBlock list={radarScreens(evs)} turnId={t.id} />
                {sentinelEvents(evs).map((v) => <SentinelCard key={v.key} v={v} />)}
                {injectionsOf(evs).filter((x) => !(seenInj.get(t.id) ?? new Set()).has(JSON.stringify(x))).map((x, k) => <InjectionCard key={`${t.id}:i${k}`} id={`${t.id}:${k}`} seller={sellerName(x.sellerId)} lines={x.lines} />)}
                {evs.filter(isAttackEvent).map((e, k) => <AttackCard key={`${e.type}${e.at}${k}`} e={e} />)}
                {!t.done ? (
                  <View style={{ gap: 10 }}>
                    <AgentCardBlock>
                      {pending.length ? <T v="body" color="muted">Waiting for you…</T> : !traceLines(evs).length && !(active?.revoked && isLast) ? <WorkingLine on /> : null}
                      <TraceBlock events={evs} live={!pending.length && !(active?.revoked && isLast)} />
                    </AgentCardBlock>
                    {evs.filter((e) => e.type === "payment").map((e) => <PaidCard key={e.tx} e={e} />)}
                  </View>
                ) : (
                  <Rise dy={8} layout style={{ gap: 10 }}>
                    {evs.filter((e) => e.type === "payment").map((e) => <PaidCard key={e.tx} e={e} />)}
                    <AgentCardBlock>
                      {t.error ? <T v="body" color="negative">{t.error}</T> : <Reply id={t.id} text={cleanText(reply, 3000) || "Done."} />}
                      {t.stopped && t.stopped !== "refusal" ? <T v="cap" color="muted">Stopped early.</T> : null}
                      <TraceBlock events={evs} />
                    </AgentCardBlock>
                  </Rise>
                )}
                {t.done ? evs.filter((e) => e.type === "trace" && e.phase === "memory").slice(-1).map((e) => <MemoryLine key={`mem${e.at}`} e={e} />) : null}
                {t.done && active ? <DeadEndCard id={t.id} task={t.text} evs={evs} pocket={active} sellerName={sellerName} onRetry={isLast && !chatBusy ? send : undefined}
                  resolved={t.toAt != null && mine.some((e) => e.type === "payment" && e.at > t.toAt!)} /> : null}
                {isLast && intent ? <TaskWaiting text={intent.text} onOpen={() => openApproval(intent.id)} id={intent.id} /> : null}
              </View>
            );
          })}
          {idle.filter((x) => !last || x.at > last.fromAt).map((x) => x.node)}
          {sent ? <View style={{ gap: 14 }}><UserBubble text={sent.text} fresh /></View> : null}
          {!last && intent ? <TaskWaiting text={intent.text} onOpen={() => openApproval(intent.id)} id={intent.id} /> : null}
          {active?.revoked && turns.length > 0 ? (
            <StoppedCard codes={["POCKET_REVOKED"]} last={stopped} tx={stopTx?.hash} canReturn={active.owned && active.balance > 0n} onReturn={() => setAction({ mode: "return", pocket: active.address })} />
          ) : null}
          {pay && (
            <EventCard tone="waiting" title="Waiting for your OK" body={`${cleanText(sellerName(pay.data?.sellerId), 40)} · US$${cleanText(pay.data?.amount, 10)}`}>
              <Button label="Review and approve" small onPress={() => openApproval(pay.id)} />
            </EventCard>
          )}
          {question && (
            <EventCard tone="waiting" title="Your agent has a question" body="One tap to answer, or type your own below.">
              {answerOptions(question.text).length ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {answerOptions(question.text).map((o, i) => <Button key={o} label={o} kind={i === 0 ? "danger" : "blue"} icon={i === 0 ? "target" : "file"} small tapRef={answerTap(o)} onPress={() => send(o)} style={{ flex: 1, paddingHorizontal: 12 }} />)}
                </View>
              ) : <Button label="Answer" kind="secondary" small onPress={() => setQuestionOpen(true)} />}
            </EventCard>
          )}
        </ScrollView>

        {away ? (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", right: 16, bottom: 12, zIndex: 5 }} pointerEvents="box-none">
            <Press kind="icon" haptics="select" onPress={() => { stick.current = true; setAway(false); scroll.current?.scrollToEnd({ animated: !reduce }); }} accessibilityRole="button" accessibilityLabel="Jump to latest"
              style={{ width: 40, height: 40, borderRadius: 12, borderCurve: "continuous", backgroundColor: c.card, alignItems: "center", justifyContent: "center", ...lift }}>
              <Icon name="arrowDown" size={18} color={c.ink} stroke={2} />
            </Press>
          </Animated.View>
        ) : null}
      </View>

      <Animated.View style={[{ gap: 10, backgroundColor: c.canvas, paddingTop: 6 }, Platform.OS === "ios" ? ride : { paddingBottom: kb ? 8 : base }]}>
        {/* suggestions: whole phrases only, faded (not cut) at the right edge, gone while the owner types */}
        {!typing && !empty && chipItems.length ? (
          <Animated.View exiting={FadeOut.duration(120)} style={{ height: 40 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, gap: 8 }} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
              {chipItems.map(({ label, text: say }) => (
                <Rise key={label} delay={Math.max(chipDelay[label] ?? 0, 0)} instant={(chipDelay[label] ?? 0) < 0} dy={6}>
                  <Press haptics="select" scale={0.96} onPress={() => send(say)} disabled={chatBusy || !active} accessibilityRole="button" accessibilityLabel={cleanText(say, 160)} style={{ height: 40, maxWidth: 280, paddingHorizontal: 16, borderRadius: 9999, justifyContent: "center", backgroundColor: c.card, borderWidth: 1, borderColor: c.tileStroke, opacity: chatBusy ? 0.5 : 1 }}>
                    <T v="sub" w="semi" numberOfLines={1}>{cleanText(label, 60)}</T>
                  </Press>
                </Rise>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}
        <View style={{ paddingHorizontal: 16 }}>
          {/* grows with the message (up to ~5 lines, then scrolls inside); the send button stays on the last line */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", paddingLeft: 16, paddingRight: 6, paddingVertical: 3, borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: c.card, borderWidth: 1, borderColor: hairline, minHeight: 56, ...level1 }}>
            <TextInput
              maxFontSizeMultiplier={grow} value={text} onChangeText={setText} placeholder={text ? "" : question ? "Answer ChainBrain" : "Ask ChainBrain to buy something"} placeholderTextColor={c.faint}
              multiline submitBehavior="submit" onSubmitEditing={() => send(text)} returnKeyType="send" accessibilityLabel="Message" editable={!!active}
              style={[{ flex: 1, color: c.ink, fontFamily: F.medium, fontSize: 16, lineHeight: 22, minHeight: 48, maxHeight: 124, paddingTop: 13, paddingBottom: 13, textAlignVertical: "center" }, Platform.OS === "web" ? ({ outlineStyle: "none", resize: "none" } as object) : null]}
            />
            <View style={{ marginBottom: 2 }}>
              <SendButton ready={ready} stop={showStop} tapRef={sendTap} onPress={() => send(text)}
                onStop={() => { if (autoplay.running) autoplay.stop(); else if (active) setAction({ mode: "revoke", pocket: active.address }); }}
                onAutoStop={() => active && setAction({ mode: "revoke", pocket: active.address })} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
