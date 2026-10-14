import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, F } from "../../theme";
import { useApp, type Turn } from "../../store";
import { DevBadge, Press } from "../../ui/primitives";
import { ShinyText } from "../../ui/ShinyText";
import { TAB_H } from "../../ui/TabBar";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { Orb } from "../../ui/Orb";
import { useReduceMotion } from "../../ui/motion";
import { TraceBlock } from "../../components/TraceBlock";
import { IntentCard } from "../../components/IntentCard";
import { cleanText } from "../../lib/sanitize";
import { devScenes, type Scene } from "../../lib/api";
import { sameAddr, sliceTurn, replyOf } from "../../lib/events";
import { reasonText } from "../../lib/shared";
import { haptic } from "../../haptics";
import { radius } from "../../tokens";

const DEFAULTS = ["Get me a market report on durian exports, under US$2, by tonight.", "What can you spend right now?"];

function UserBubble({ text, reduce }: { text: string; reduce: boolean }) {
  const { c } = useTheme();
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.duration(200)} style={{ alignSelf: "flex-end", maxWidth: "82%", backgroundColor: c.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, borderBottomRightRadius: 4 }}>
      <T v="body" color="onAccent">{cleanText(text, 1000)}</T>
    </Animated.View>
  );
}

function AgentRow({ children, state = "idle", reduce }: { children: React.ReactNode; state?: "idle" | "working" | "waiting"; reduce: boolean }) {
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.duration(220)} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", maxWidth: "94%" }}>
      <View style={{ paddingTop: 2 }}><Orb size={28} state={state} /></View>
      <View style={{ flex: 1, gap: 8 }}>{children}</View>
    </Animated.View>
  );
}

export default function AgentChat() {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { active, turns, sendChat, chatBusy, agentState, events, pending, answer, dev, setApprovalOpen, setQuestionOpen, sellerName } = useApp();
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

  const send = (v: string) => { if (!v.trim() || chatBusy || !active) return; haptic.light(); setText(""); void sendChat(v); };
  const follow = question ? scenes.map((s) => s.followUp).filter((x): x is string => !!x) : [];
  const chips = [...follow, ...(scenes.length ? scenes.map((s) => s.text) : DEFAULTS)].slice(0, 12);
  const bottomPad = kb ? 8 : TAB_H + insets.bottom + 12;
  const last = turns.at(-1);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Orb size={34} state={agentState} />
        <View style={{ flex: 1 }}>
          <T v="title">ChainBrain agent</T>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <T v="caption" color="text2" numberOfLines={1}>{active ? `${cleanText(active.name, 20)} pocket` : "No pocket yet"} · {agentState === "working" ? "Working…" : agentState === "waiting" ? "Waiting for you" : agentState === "paused" ? "Paused" : "Ready"}</T>
            {dev && <DevBadge />}
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          {turns.length === 0 && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingVertical: 40 }}>
              <Orb size={72} state="idle" />
              <T v="headingMd" style={{ textAlign: "center" }}>{active ? "What should I buy?" : "Create a pocket first"}</T>
              <T v="bodySm" color="text2" style={{ textAlign: "center", maxWidth: 290 }}>{active ? "I only spend from the pocket you funded, within the limits you set. Anything above your threshold waits for your signature." : "The agent works inside a pocket. Create and fund one on Home, then come back."}</T>
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
                  <View key={k} style={{ marginLeft: 38, flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: c.stepupBg, borderWidth: 1, borderColor: c.stepupBorder }}>
                    <Icon name="shieldAlert" size={18} color={c.stepup} />
                    <T v="bodySm" style={{ flex: 1 }}>{cleanText(sellerName(d.sellerId), 40)} asked for {(d.asked ?? []).map((x: string) => cleanText(x, 30)).join(", ") || "your data"}{d.signRequest ? " and a signature" : ""}. Refused: {(d.refused ?? []).map((r: string) => reasonText(r)).join(" ") || "not part of a purchase"}.</T>
                  </View>
                ))}
                {!t.done ? (
                  <AgentRow state={pending.length ? "waiting" : "working"} reduce={reduce}>
                    <ShinyText text={pending.length ? "Waiting for you…" : "Working on it…"} />
                    <TraceBlock events={evs} live />
                  </AgentRow>
                ) : (
                  <AgentRow reduce={reduce}>
                    {t.error ? <T v="body" color="refused">{t.error}</T> : <T v="body">{cleanText(reply, 3000) || "Done."}</T>}
                    {t.stopped && t.stopped !== "refusal" ? <T v="caption" color="text3">Stopped: {t.stopped}</T> : null}
                    <TraceBlock events={evs} />
                  </AgentRow>
                )}
                {isLast && intent && (
                  <View style={{ marginLeft: 38 }}>
                    <IntentCard text={intent.text} busy={intentBusy} compact
                      onConfirm={async () => { setIntentBusy(true); await answer(intent, true); setIntentBusy(false); }}
                      onDecline={async () => { setIntentBusy(true); await answer(intent, false); setIntentBusy(false); }} />
                  </View>
                )}
              </View>
            );
          })}
          {!last && intent && <IntentCard text={intent.text} compact onConfirm={() => void answer(intent, true)} onDecline={() => void answer(intent, false)} />}
          {pay && (
            <Press onPress={() => setApprovalOpen(true)} style={{ marginLeft: 38, padding: 14, borderRadius: radius.lg, backgroundColor: c.stepupBg, borderWidth: 1, borderColor: c.stepupBorder, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name="shieldAlert" size={20} color={c.stepup} />
                <T v="bodySm" weight="semi" style={{ flex: 1 }}>Approval needed: US${cleanText(pay.data?.amount, 10)}</T>
              </View>
              <T v="bodySm" color="text2" numberOfLines={2}>{cleanText(sellerName(pay.data?.sellerId), 40)}. {cleanText(pay.text, 110)}</T>
              <View style={{ height: 44, borderRadius: radius.md, backgroundColor: c.bgElev1, borderWidth: 1, borderColor: c.stepupBorder, alignItems: "center", justifyContent: "center" }}><T v="bodySm" weight="semi" color="stepup">Review and sign</T></View>
            </Press>
          )}
          {question && (
            <Press onPress={() => setQuestionOpen(true)} style={{ marginLeft: 38, padding: 14, borderRadius: radius.lg, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.hairlineStrong, gap: 6 }}>
              <T v="caption" color="accentInk" weight="semi">AGENT ASKS</T>
              <T v="bodySm">{cleanText(question.text, 300)}</T>
              <T v="caption" color="text2">Type your answer below, or tap to answer.</T>
            </Press>
          )}
        </ScrollView>

        <View style={{ paddingBottom: bottomPad, gap: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
            {chips.map((s) => (
              <Press key={s} haptics="select" scale={0.96} onPress={() => send(s)} disabled={chatBusy || !active} hitSlop={{ top: 4, bottom: 4 }} style={{ height: 36, maxWidth: 260, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.bgElev1, borderWidth: 1, borderColor: c.hairlineStrong, opacity: chatBusy ? 0.5 : 1 }}>
                <T v="bodySm" weight="med" color="text" numberOfLines={1}>{cleanText(s, 60)}</T>
              </Press>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 6, paddingVertical: 6, borderRadius: radius.lg, backgroundColor: c.bgElev1, borderWidth: 1, borderColor: c.hairlineStrong }}>
              <TextInput
                value={text} onChangeText={setText} placeholder={question ? "Answer your agent" : "Ask your agent to buy something"} placeholderTextColor={c.text3}
                onSubmitEditing={() => send(text)} returnKeyType="send" accessibilityLabel="Message" editable={!!active}
                style={{ flex: 1, color: c.text, fontFamily: F.body, fontSize: 16, height: 44, paddingVertical: 0, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null) }}
              />
              <Press onPress={() => send(text)} haptics="none" disabled={!text.trim() || chatBusy} accessibilityLabel="Send" style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: text.trim() && !chatBusy ? c.accent : c.bgElev3, alignItems: "center", justifyContent: "center" }}>
                <Icon name="arrowUp" size={20} color={text.trim() && !chatBusy ? c.onAccent : c.text3} stroke={2.2} />
              </Press>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
