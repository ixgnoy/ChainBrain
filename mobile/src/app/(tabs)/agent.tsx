import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, type Turn } from "../../store";
import { c, F } from "../../tokens";
import { Button, Press } from "../../ui/kit";
import { TAB_H } from "../../ui/TabBar";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { useReduceMotion } from "../../ui/motion";
import { TraceBlock } from "../../components/TraceBlock";
import { IntentCard } from "../../components/IntentCard";
import { cleanText } from "../../lib/sanitize";
import { devScenes, type Scene } from "../../lib/api";
import { sameAddr, sliceTurn, replyOf } from "../../lib/events";
import { plainReason } from "../../lib/plain";
import { notify, DEMO_MSG } from "../../lib/toast";
import { haptic } from "../../haptics";

const DEFAULTS = ["Buy the DataLite durian report. Max US$1, by tonight.", "What can you spend right now?"];

function UserBubble({ text, reduce }: { text: string; reduce: boolean }) {
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.duration(180)} style={{ alignSelf: "flex-end", maxWidth: "82%", backgroundColor: c.fill, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderBottomRightRadius: 6 }}>
      <T v="body">{cleanText(text, 1000)}</T>
    </Animated.View>
  );
}

export default function AgentChat() {
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { active, turns, sendChat, chatBusy, agentState, events, pending, answer, dev, demo, setApprovalOpen, setQuestionOpen, sellerName } = useApp();
  const [text, setText] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [kb, setKb] = useState(false);
  const [intentBusy, setIntentBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => { if (dev) devScenes().then(setScenes).catch(() => {}); else setScenes([]); }, [dev]);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  const mine = useMemo(() => (active ? events.filter((e) => sameAddr(e.pocket, active.address)) : []), [events, active]);
  const mineLen = mine.length;
  useEffect(() => { const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: !reduce }), 60); return () => clearTimeout(t); }, [turns, mineLen, pending.length, reduce]);

  const here = (a: { pocket: string }) => !!active && sameAddr(a.pocket, active.address);
  const intent = pending.find((a) => a.kind === "intent" && here(a));
  const pay = pending.find((a) => a.kind === "payment" && here(a));
  const question = pending.find((a) => a.kind === "question" && here(a));

  const send = (v: string) => {
    if (!v.trim() || chatBusy || !active) return;
    if (demo) { notify(DEMO_MSG); return; }
    haptic.light(); setText(""); void sendChat(v);
  };
  const follow = question ? scenes.map((s) => s.followUp).filter((x): x is string => !!x) : [];
  const chips = [...follow, ...(scenes.length ? scenes.map((s) => s.text) : DEFAULTS)].slice(0, 12);
  const bottomPad = kb ? 8 : TAB_H + insets.bottom + 4;
  const last = turns.at(-1);
  const status = agentState === "working" ? "Working…" : agentState === "waiting" ? "Waiting for you" : agentState === "paused" ? "Paused" : "Ready";

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, alignItems: "center", gap: 2 }}>
        <T v="row" w="semi" accessibilityRole="header">Ask agent</T>
        <T v="cap" color="muted" numberOfLines={1}>{active ? `${cleanText(active.name, 24)} · ${status}` : "No pocket yet"}</T>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20, flexGrow: 1 }} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          {turns.length === 0 && (
            <View style={{ flex: 1, justifyContent: "center", gap: 8, paddingVertical: 40 }}>
              <T v="section">{active ? "What should I buy?" : "Create a pocket first"}</T>
              <T v="body" color="ink2">{active ? "I only spend from the pocket you funded, within the limits you set. For bigger payments I wait for your OK." : "Your agent works inside a pocket. Create one on Home, then come back."}</T>
            </View>
          )}
          {turns.map((t: Turn, i) => {
            const evs = sliceTurn(mine, t.fromAt, t.toAt);
            const disclosures = evs.filter((e) => e.type === "disclosure");
            const reply = t.reply ?? replyOf(evs);
            const isLast = i === turns.length - 1;
            return (
              <View key={t.id} style={{ gap: 14 }}>
                <UserBubble text={t.text} reduce={reduce} />
                {disclosures.map((d, k) => (
                  <View key={k} style={{ padding: 14, borderRadius: 16, backgroundColor: c.warningSoft }}>
                    <T v="sub" color="warning">{cleanText(sellerName(d.sellerId), 40)} asked for {(d.asked ?? []).map((x: string) => cleanText(x, 30)).join(", ") || "your data"}{d.signRequest ? " and a signature" : ""}. Refused: {(d.refused ?? []).map((r: string) => plainReason(r)).join(", ") || "not part of a purchase"}.</T>
                  </View>
                ))}
                {!t.done ? (
                  <View style={{ gap: 4 }}>
                    <T v="body" color="muted">{pending.length ? "Waiting for you…" : "Working on it…"}</T>
                    <TraceBlock events={evs} />
                  </View>
                ) : (
                  <Animated.View entering={reduce ? undefined : FadeInDown.duration(200)} style={{ gap: 4, maxWidth: "94%" }}>
                    {t.error ? <T v="body" color="negative">{t.error}</T> : <T v="body">{cleanText(reply, 3000) || "Done."}</T>}
                    {t.stopped && t.stopped !== "refusal" ? <T v="cap" color="muted">Stopped early.</T> : null}
                    <TraceBlock events={evs} />
                  </Animated.View>
                )}
                {isLast && intent && (
                  <IntentCard text={intent.text} busy={intentBusy}
                    onConfirm={async () => { setIntentBusy(true); await answer(intent, true); setIntentBusy(false); }}
                    onDecline={async () => { setIntentBusy(true); await answer(intent, false); setIntentBusy(false); }} />
                )}
              </View>
            );
          })}
          {!last && intent && <IntentCard text={intent.text} onConfirm={() => void answer(intent, true)} onDecline={() => void answer(intent, false)} />}
          {pay && (
            <View style={{ padding: 16, borderRadius: 20, backgroundColor: c.canvas, gap: 12 }}>
              <View style={{ gap: 2 }}>
                <T v="row" w="semi">Waiting for your OK</T>
                <T v="sub" color="ink2">{cleanText(sellerName(pay.data?.sellerId), 40)} · US${cleanText(pay.data?.amount, 10)}</T>
              </View>
              <Button label="Review and approve" small onPress={() => setApprovalOpen(true)} />
            </View>
          )}
          {question && (
            <Press onPress={() => setQuestionOpen(true)} style={{ padding: 16, borderRadius: 20, backgroundColor: c.canvas, gap: 4 }}>
              <T v="row" w="semi">Your agent has a question</T>
              <T v="sub" color="ink2">{cleanText(question.text, 300)}</T>
              <T v="cap" color="muted">Type your answer below, or tap to answer.</T>
            </Press>
          )}
        </ScrollView>

        <View style={{ paddingBottom: bottomPad, gap: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
            {chips.map((s) => (
              <Press key={s} haptics="select" scale={0.96} onPress={() => send(s)} disabled={chatBusy || !active} accessibilityRole="button" accessibilityLabel={cleanText(s, 120)} style={{ minHeight: 40, maxWidth: 260, paddingHorizontal: 16, borderRadius: 9999, justifyContent: "center", backgroundColor: c.fill, opacity: chatBusy ? 0.5 : 1 }}>
                <T v="sub" w="medium" color="ink2" numberOfLines={1}>{cleanText(s, 60)}</T>
              </Press>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 6, borderRadius: 9999, backgroundColor: c.fill, minHeight: 56 }}>
              <TextInput
                value={text} onChangeText={setText} placeholder={question ? "Answer your agent" : "Ask your agent to buy something"} placeholderTextColor={c.faint}
                onSubmitEditing={() => send(text)} returnKeyType="send" accessibilityLabel="Message" editable={!!active}
                style={[{ flex: 1, color: c.ink, fontFamily: F.regular, fontSize: 16, height: 48, paddingVertical: 0 }, Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null]}
              />
              <Press onPress={() => send(text)} haptics="none" disabled={!text.trim() || chatBusy} accessibilityRole="button" accessibilityLabel="Send" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() && !chatBusy ? c.accent : c.line, alignItems: "center", justifyContent: "center" }}>
                <Icon name="arrowUp" size={20} color={text.trim() && !chatBusy ? c.onAccent : c.faint} stroke={2.2} />
              </Press>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
