import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedReaction, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, type Turn } from "../../store";
import { c, F } from "../../tokens";
import { Button, Press } from "../../ui/kit";
import { GLASS_TAB_SPACE as TAB_H } from "../../ui/glass/GlassTabBar";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { useReduceMotion } from "../../ui/motion";
import { TraceBlock, STEP } from "../../components/TraceBlock";
import { IntentCard } from "../../components/IntentCard";
import { DeadEndCard } from "../../components/DeadEndCard";
import { RefusalCard, SellerRefusal, refusalsOf } from "../../components/RefusalCard";
import { StoppedCard } from "../../components/StoppedCard";
import { Rise, useStagger } from "../../ui/Rise";
import { SendButton } from "../../ui/SendButton";
import { WorkingLine } from "../../ui/WorkingLine";
import { cleanText } from "../../lib/sanitize";
import { devScenes, type Scene } from "../../lib/api";
import { sameAddr, sliceTurn, replyOf, toolResultOf, summarizeTool, traceLines, type WalletEvent } from "../../lib/events";
import { deadEndOf } from "../../lib/deadend";
import { usd } from "../../lib/util";
import { plainReason } from "../../lib/plain";
import { haptic } from "../../haptics";

const DEFAULTS = ["Buy the DataLite durian report. Max US$1, by tonight.", "What can you spend right now?"];

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
  const { active, turns, sendChat, chatBusy, agentState, events, pending, answer, dev, source, setApprovalOpen, setQuestionOpen, sellerName, setAction, ownerTxs, wallet } = useApp();
  const [text, setText] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [kb, setKb] = useState(false);
  const [intentBusy, setIntentBusy] = useState(false);
  // optimistic bubble: shown the instant the owner sends, until the store has the real turn (it polls once before adding it)
  const [sent, setSent] = useState<{ text: string; n: number } | null>(null);
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
  const follow = question ? scenes.map((s) => s.followUp).filter((x): x is string => !!x) : [];
  const chips = [...follow, ...(scenes.length ? scenes.map((s) => s.text) : DEFAULTS)].slice(0, 12);
  const chipDelay = useStagger(chips, 40, 8);
  const last = turns.at(-1);
  const canStop = !!active && active.owned && !!wallet && !active.revoked && Number(active.expiresAt) * 1000 > Date.now();
  const stopped = active?.revoked ? lastStepText(mine, sellerName) : null;
  const stopTx = active ? ownerTxs.filter((t) => t.kind === "revoke" && sameAddr(t.pocket, active.address)).at(-1) : undefined;
  const status = agentState === "working" ? "Working…" : agentState === "waiting" ? "Waiting for you" : agentState === "paused" ? "Paused" : "Ready";
  const ready = !!text.trim() && !chatBusy;

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ alignItems: "center", gap: 2, paddingHorizontal: 112 }}>
          <T v="row" w="semi" accessibilityRole="header">Ask agent</T>
          <T v="cap" color="muted" numberOfLines={1}>{active ? `${cleanText(active.name, 14)} · ${active.revoked ? "Stopped" : status}` : "No pocket yet"}</T>
        </View>
        <View style={{ position: "absolute", right: 20, top: insets.top + 8 }}>
          {canStop ? (
            <Rise dy={4} exit>
              <Press onPress={() => setAction({ mode: "revoke", pocket: active!.address })} accessibilityRole="button" accessibilityLabel="Stop agent" style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: c.negativeSoft, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="lock" size={15} color={c.negative} />
                <T v="sub" w="semi" color="negative" numberOfLines={1}>Stop agent</T>
              </Press>
            </Rise>
          ) : null}
        </View>
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
          {turns.map((t: Turn, i) => {
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
                    <T v="sub" color="warning">{cleanText(sellerName(d.sellerId), 40)} asked for {(d.asked ?? []).map((x: string) => cleanText(x, 30)).join(", ") || "your data"}{d.signRequest ? " and a signature" : ""}. Refused: {(d.refused ?? []).map((r: string) => plainReason(r)).join(", ") || "not part of a purchase"}.</T>
                  </RefusalCard>
                ))}
                {refusals.map((r) => <SellerRefusal key={r.sellerId} id={`${t.id}:r${r.sellerId}`} seller={sellerName(r.sellerId)} reasons={r.reasons} />)}
                {!t.done ? (
                  <View style={{ gap: 4 }}>
                    {pending.length ? <T v="body" color="muted">Waiting for you…</T> : <WorkingLine on={!running} />}
                    <TraceBlock events={evs} live />
                  </View>
                ) : (
                  <Rise dy={8} layout style={{ gap: 4, maxWidth: "94%" }}>
                    {t.error ? <T v="body" color="negative">{t.error}</T> : <T v="body">{cleanText(reply, 3000) || "Done."}</T>}
                    {t.stopped && t.stopped !== "refusal" ? <T v="cap" color="muted">Stopped early.</T> : null}
                    <TraceBlock events={evs} />
                  </Rise>
                )}
                {t.done && active ? <DeadEndCard id={t.id} evs={evs} pocket={active} sellerName={sellerName} /> : null}
                {isLast && intent && (
                  <IntentCard enter={intent.id} text={intent.text} busy={intentBusy}
                    onConfirm={async () => { setIntentBusy(true); await answer(intent, true); setIntentBusy(false); }}
                    onDecline={async () => { setIntentBusy(true); await answer(intent, false); setIntentBusy(false); }} />
                )}
              </View>
            );
          })}
          {sent ? <View style={{ gap: 14 }}><UserBubble text={sent.text} fresh /></View> : null}
          {!last && intent && <IntentCard enter={intent.id} text={intent.text} onConfirm={() => void answer(intent, true)} onDecline={() => void answer(intent, false)} />}
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
              <Press kind="row" onPress={() => setQuestionOpen(true)} style={{ padding: 16, borderRadius: 20, backgroundColor: c.canvas, gap: 4 }}>
                <T v="row" w="semi">Your agent has a question</T>
                <T v="sub" color="ink2">{cleanText(question.text, 300)}</T>
                <T v="cap" color="muted">Type your answer below, or tap to answer.</T>
              </Press>
            </Rise>
          )}
        </ScrollView>

        <Animated.View style={[{ gap: 10 }, Platform.OS === "ios" ? ride : { paddingBottom: kb ? 8 : base }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
            {chips.map((s) => (
              <Rise key={s} delay={Math.max(chipDelay[s] ?? 0, 0)} instant={(chipDelay[s] ?? 0) < 0} dy={6}>
                <Press haptics="select" scale={0.96} onPress={() => send(s)} disabled={chatBusy || !active} accessibilityRole="button" accessibilityLabel={cleanText(s, 120)} style={{ minHeight: 40, maxWidth: 260, paddingHorizontal: 16, borderRadius: 9999, justifyContent: "center", backgroundColor: c.fill, opacity: chatBusy ? 0.5 : 1 }}>
                  <T v="sub" w="medium" color="ink2" numberOfLines={1}>{cleanText(s, 60)}</T>
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
