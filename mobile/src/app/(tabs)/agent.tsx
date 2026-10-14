import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedReaction, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, type Turn } from "../../store";
import { c, F } from "../../tokens";
import { Avatar, Button, Press } from "../../ui/kit";
import { StatusDot, type DotState } from "../../ui/StatusDot";
import { GLASS_TAB_SPACE as TAB_H } from "../../ui/glass/GlassTabBar";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { useReduceMotion } from "../../ui/motion";
import { TraceBlock, STEP } from "../../components/TraceBlock";
import { parseIntent } from "../../components/IntentCard";
import { DeadEndCard } from "../../components/DeadEndCard";
import { RefusalCard, SellerRefusal, refusalsOf } from "../../components/RefusalCard";
import { StoppedCard } from "../../components/StoppedCard";
import { Rise, useStagger, firstTime } from "../../ui/Rise";
import { StreamText } from "../../ui/StreamText";
import { PaidCard } from "../../components/PaidCard";
import { BlockedCard } from "../../components/BlockedCard";
import { SendButton } from "../../ui/SendButton";
import { WorkingLine } from "../../ui/WorkingLine";
import { cleanText } from "../../lib/sanitize";
import { devScenes, type Scene } from "../../lib/api";
import { sameAddr, sliceTurn, replyOf, toolResultOf, summarizeTool, traceLines, type WalletEvent } from "../../lib/events";
import { deadEndOf } from "../../lib/deadend";
import { money, usd } from "../../lib/util";
import { plainAsks } from "../../lib/plain";
import { CodePill } from "../../ui/kit";
import { haptic } from "../../haptics";

type ChipItem = { label: string; text: string };
const DEFAULTS: ChipItem[] = [
  { label: "Buy the DataLite report", text: "Buy the DataLite durian report. Max US$1, by tonight." },
  { label: "Durian report under US$2", text: "Get me a market report on durian exports, under US$2, by tonight." },
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

/** The task waits for the owner: one compact row in the chat (the sheet holds the full card). */
function TaskWaiting({ text, onOpen, id }: { text: string; onOpen(): void; id: string }) {
  const what = parseIntent(text).find((r) => r.k === "Buy")?.v ?? "A new task";
  return (
    <Rise from={0.96} dy={12} spring="snappy" exit layout onEnter={() => { if (firstTime(`intent:${id}`)) haptic.medium(); }}>
      <Press kind="row" haptics="select" onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Review task: ${what}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: c.warningSoft }}>
        <Icon name="clock" size={18} color={c.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="row" w="semi" numberOfLines={1}>Confirm the task</T>
          <T v="sub" color="ink2" numberOfLines={1}>{cleanText(what, 80)}</T>
        </View>
        <T v="sub" w="semi" color="accent">Review</T>
      </Press>
    </Rise>
  );
}

/** The reply of a finished turn: streams in the first time it is seen, then stays still. */
function Reply({ id, text }: { id: string; text: string }) {
  const fresh = useRef(firstTime(`reply:${id}`)).current;
  return <StreamText text={text} play={fresh} />;
}

/** The owner's message. Optimistic copies rise from the composer (24 pt, snappy); the real turn that replaces it does not re-animate. */
function UserBubble({ text, fresh }: { text: string; fresh: boolean }) {
  return (
    <Rise instant={!fresh} dy={24} spring="snappy" style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
      <View style={{ backgroundColor: c.fill, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderBottomRightRadius: 6 }}>
        <T v="body">{cleanText(text, 1000)}</T>
      </View>
    </Rise>
  );
}

/** "Paid DataLite US$0.30" or "Asked for a price: US$0.30": the latest finished step in the pocket's events. */
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
      return `${STEP[e.tool] ?? "Took a step"}${sum ? `: ${cleanText(sum, 60)}` : ""}`;
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
  const { active, turns, sendChat, chatBusy, agentState, events, pending, answer, dev, source, setApprovalOpen, setQuestionOpen, sellerName, setAction, ownerTxs, wallet, pockets, setPickerOpen } = useApp();
  const [text, setText] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [kb, setKb] = useState(false);
  // optimistic bubble: shown the instant the owner sends, until the store has the real turn (it polls once before adding it)
  const [sent, setSent] = useState<{ text: string; n: number } | null>(null);
  // a long session keeps the latest exchanges in view; older ones fold behind one quiet row
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [active?.address]);
  const scroll = useRef<ScrollView>(null);
  const stick = useRef(true);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (dev || source === "builtin") devScenes().then(setScenes).catch(() => {}); else setScenes([]); }, [dev, source]);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  // the composer rides the keyboard (iOS): padding follows the keyboard's height frame by frame, no jump between "tab bar room" and "keyboard room"
  const base = TAB_H + insets.bottom + 4;
  const ride = useRideKeyboard(base);

  const mine = useMemo(() => (active ? events.filter((e) => sameAddr(e.pocket, active.address)) : []), [events, active]);
  const mineLen = mine.length;

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
  const follow: ChipItem[] = question ? scenes.filter((s) => s.followUp).map((s) => ({ label: s.followChip ?? s.followUp!, text: s.followUp! })) : [];
  // a tight pocket (cap US$0.20 or less) leads with the dead-end task; otherwise the scenes in story order
  const tight = !!active && active.cap <= 200_000n;
  const ordered = tight ? [...scenes.filter((s) => s.preset === "one-purchase"), ...scenes.filter((s) => s.preset !== "one-purchase")] : scenes;
  // used suggestions go away; while the agent works only the answer to its question is offered
  const used = new Set(turns.map((t) => t.text.trim()));
  const offers = (scenes.length ? ordered.map((s) => ({ label: s.chip ?? s.text, text: s.text })) : DEFAULTS).filter((x) => !used.has(x.text));
  const chipItems = (question ? follow : chatBusy ? [] : offers).slice(0, 12);
  const chips = chipItems.map((x) => x.label);
  const chipDelay = useStagger(chips, 40, 8);
  const last = turns.at(-1);
  const hidden = showAll ? 0 : Math.max(0, turns.length - 3);
  const canStop = !!active && active.owned && !!wallet && !active.revoked && Number(active.expiresAt) * 1000 > Date.now();
  const stopped = active?.revoked ? lastStepText(mine, sellerName) : null;
  const stopTx = active ? ownerTxs.filter((t) => t.kind === "revoke" && sameAddr(t.pocket, active.address)).at(-1) : undefined;
  const waitingHere = !!(intent || pay || question);
  const busyHere = chatBusy || waitingHere;
  const dot: DotState = active?.revoked ? "stopped" : waitingHere ? "waiting" : chatBusy ? "working" : "ready";
  const headStatus = !active ? "Create a pocket first" : active.revoked ? "Stopped · this pocket is off"
    : waitingHere ? "Waiting for you" : chatBusy ? "Working…" : `Ready · ${money(active.balance)} left`;
  const ready = !!text.trim() && !chatBusy;

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <Press kind="row" haptics="select" disabled={pockets.length < 2} onPress={() => setPickerOpen(true)} hitSlop={6}
          accessibilityRole="button" accessibilityLabel={active ? `${active.name}, ${headStatus}. Change pocket` : "No pocket yet"}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}>
          <Avatar label={active?.name ?? "?"} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <T v="row" w="semi" numberOfLines={1} accessibilityRole="header" style={{ flexShrink: 1 }}>{active ? cleanText(active.name, 28) : "Your agent"}</T>
              {pockets.length > 1 ? <Icon name="chevronDown" size={16} color={c.muted} /> : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {active ? <StatusDot state={dot} /> : null}
              <T v="cap" color="muted" numberOfLines={1}>{headStatus}</T>
            </View>
          </View>
        </Press>
        {canStop && busyHere ? (
          <Rise dy={4} exit>
            <Press onPress={() => setAction({ mode: "revoke", pocket: active!.address })} accessibilityRole="button" accessibilityLabel="Stop agent" style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.negativeSoft, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="lock" size={14} color={c.negative} />
              <T v="sub" w="semi" color="negative">Stop</T>
            </Press>
          </Rise>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20, flexGrow: 1 }} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => { const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent; stick.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < 160; }}
          onContentSizeChange={toEnd}
        >
          {turns.length === 0 && !sent && (
            <Rise dy={8} duration={260}>
              <View style={{ flex: 1, justifyContent: "center", gap: 8, paddingVertical: 40 }}>
                <T v="section">{active ? "What should I buy?" : "Create a pocket first"}</T>
                <T v="body" color="ink2">{active ? "I only spend from the pocket you funded, within the limits you set. For bigger payments I wait for your OK." : "Your agent works inside a pocket. Create one on Home, then come back."}</T>
              </View>
            </Rise>
          )}
          {hidden > 0 ? (
            <Press kind="row" haptics="select" onPress={() => setShowAll(true)} accessibilityRole="button" accessibilityLabel={`Show ${hidden} earlier messages`}
              style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.fill }}>
              <Icon name="chevronUp" size={14} color={c.ink2} />
              <T v="cap" w="medium" color="ink2">{hidden} earlier {hidden === 1 ? "message" : "messages"}</T>
            </Press>
          ) : null}
          {turns.slice(hidden).map((t: Turn, k) => {
            const i = hidden + k;
            const evs = sliceTurn(mine, t.fromAt, t.toAt);
            const disclosures = evs.filter((e) => e.type === "disclosure");
            const reply = t.reply ?? replyOf(evs);
            const isLast = i === turns.length - 1;
            const dead = t.done && active ? deadEndOf(evs, active) : null;
            const refusals = dead ? [] : refusalsOf(evs);
            const running = !t.done && traceLines(evs).some((l) => l.kind === "tool" && l.state === "run");
            return (
              <View key={t.id} style={{ gap: 14 }}>
                <UserBubble text={t.text} fresh={false} />
                {disclosures.map((d, k) => (
                  <RefusalCard key={k} id={`${t.id}:d${k}`}>
                    <T v="sub" w="semi" color="warning">{cleanText(sellerName(d.sellerId), 40)} asked for {plainAsks(d.asked ?? [], !!d.signRequest)}</T>
                    <T v="sub" color="ink2">Your wallet refused and nothing was shared. Only payments inside your rules get signed.</T>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>{(d.refused ?? []).map((r: string) => <CodePill key={r} code={cleanText(r, 40)} tone="warning" />)}</View>
                  </RefusalCard>
                ))}
                {refusals.map((r) => <SellerRefusal key={r.sellerId} id={`${t.id}:r${r.sellerId}`} seller={sellerName(r.sellerId)} reasons={r.reasons} />)}
                {evs.filter((e) => e.type === "forced").map((e) => <BlockedCard key={String(e.tx)} e={e} />)}
                {!t.done ? (
                  <View style={{ gap: 4 }}>
                    {pending.length ? <T v="body" color="muted">Waiting for you…</T> : <WorkingLine on={!running} />}
                    <TraceBlock events={evs} live />
                    {evs.filter((e) => e.type === "payment").map((e) => <View key={e.tx} style={{ marginTop: 10 }}><PaidCard e={e} /></View>)}
                  </View>
                ) : (
                  <Rise dy={8} layout style={{ gap: 4 }}>
                    {evs.filter((e) => e.type === "payment").map((e) => <View key={e.tx} style={{ marginBottom: 10 }}><PaidCard e={e} /></View>)}
                    {t.error ? <T v="body" color="negative">{t.error}</T> : <View style={{ maxWidth: "94%" }}><Reply id={t.id} text={cleanText(reply, 3000) || "Done."} /></View>}
                    {t.stopped && t.stopped !== "refusal" ? <T v="cap" color="muted">Stopped early.</T> : null}
                    <TraceBlock events={evs} />
                  </Rise>
                )}
                {t.done && active ? <DeadEndCard id={t.id} evs={evs} pocket={active} sellerName={sellerName} onRetry={isLast && !chatBusy ? send : undefined} /> : null}
                {isLast && intent ? <TaskWaiting text={intent.text} onOpen={() => setApprovalOpen(true)} id={intent.id} /> : null}
              </View>
            );
          })}
          {sent ? <View style={{ gap: 14 }}><UserBubble text={sent.text} fresh /></View> : null}
          {!last && intent ? <TaskWaiting text={intent.text} onOpen={() => setApprovalOpen(true)} id={intent.id} /> : null}
          {active?.revoked && turns.length > 0 ? (
            <StoppedCard last={stopped} tx={stopTx?.hash} canReturn={active.owned && active.balance > 0n} onReturn={() => setAction({ mode: "return", pocket: active.address })} />
          ) : null}
          {pay && (
            <Rise dy={12} layout exit>
              <View style={{ padding: 16, borderRadius: 20, backgroundColor: c.canvas, gap: 12 }}>
                <View style={{ gap: 2 }}>
                  <T v="row" w="semi">Waiting for your OK</T>
                  <T v="sub" color="ink2">{cleanText(sellerName(pay.data?.sellerId), 40)} · US${cleanText(pay.data?.amount, 10)}</T>
                </View>
                <Button label="Review and approve" small onPress={() => setApprovalOpen(true)} />
              </View>
            </Rise>
          )}
          {question && (
            <Rise dy={16} layout exit>
              <View style={{ padding: 16, borderRadius: 20, backgroundColor: c.canvas, gap: 12 }}>
                <View style={{ gap: 2 }}>
                  <T v="row" w="semi">Your agent has a question</T>
                  <T v="sub" color="ink2">One tap to answer, or type your own below.</T>
                </View>
                {answerOptions(question.text).length ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {answerOptions(question.text).map((o) => <Button key={o} label={o} kind="secondary" small onPress={() => send(o)} style={{ flex: 1, paddingHorizontal: 12 }} />)}
                  </View>
                ) : <Button label="Answer" kind="secondary" small onPress={() => setQuestionOpen(true)} />}
              </View>
            </Rise>
          )}
        </ScrollView>

        <Animated.View style={[{ gap: 10 }, Platform.OS === "ios" ? ride : { paddingBottom: kb ? 8 : base }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
            {chipItems.map(({ label, text: say }) => (
              <Rise key={label} delay={Math.max(chipDelay[label] ?? 0, 0)} instant={(chipDelay[label] ?? 0) < 0} dy={6}>
                <Press haptics="select" scale={0.96} onPress={() => send(say)} disabled={chatBusy || !active} accessibilityRole="button" accessibilityLabel={cleanText(say, 160)} style={{ minHeight: 40, maxWidth: 260, paddingHorizontal: 16, borderRadius: 9999, justifyContent: "center", backgroundColor: c.fill, opacity: chatBusy ? 0.5 : 1 }}>
                  <T v="sub" w="medium" color="ink2" numberOfLines={1}>{cleanText(label, 60)}</T>
                </Press>
              </Rise>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 6, borderRadius: 9999, backgroundColor: c.fill, minHeight: 56 }}>
              <TextInput
                value={text} onChangeText={setText} placeholder={question ? "Answer your agent" : "Ask your agent to buy something"} placeholderTextColor={c.faint}
                onSubmitEditing={() => send(text)} returnKeyType="send" accessibilityLabel="Message" editable={!!active}
                style={[{ flex: 1, color: c.ink, fontFamily: F.regular, fontSize: 16, height: 48, paddingVertical: 0 }, Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null]}
              />
              <SendButton ready={ready} busy={chatBusy} onPress={() => send(text)} />
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
