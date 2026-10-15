// First-launch intro, shown on every launch: three pages, Skip always visible, swipe with the finger (the pager follows it 1:1 and
// lets go with its velocity), a page indicator that doubles as the auto-advance timer (the whole run takes about 7 s; the first
// touch hands control to the owner). Each page has one illustration built from app primitives: a pocket card slides out of a
// wallet, the rules of a contract draw in under a lock, the worst case fills a bar. No gradients, glow or sparkles.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, Extrapolation, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, motion, radius } from "../tokens";
import { haptic } from "../haptics";
import { Button, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { EASE_OUT, rubberband, useReduceMotion } from "../ui/motion";
import { finishIntro } from "../ui/intro";

const PAGE_MS = 2200; // each page is read for about two seconds; three pages end in about 7 s
const PAGES = [
  { title: "Give your AI a pocket, not your wallet", sub: "A pocket holds a small budget. Your agent can only spend what you put in it." },
  { title: "The limits live in a contract you own", sub: "Which sellers, how much per payment, when to ask you. Only your key can change them." },
  { title: "The worst case is the pocket balance", sub: "Even a tricked agent can only pay sellers you allowed, and never more than the pocket holds." },
] as const;

/** 0 while the page is away, 1 once its illustration has played (instant under Reduce Motion). */
function usePlay(active: boolean, reduce: boolean, ms = 1100, delay = 120) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) { t.value = withTiming(active ? 1 : 0, { duration: 180 }); return; }
    if (active) t.value = withDelay(delay, withTiming(1, { duration: ms, easing: EASE_OUT }));
    else { cancelAnimation(t); t.value = 0; }
  }, [active, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return t;
}
/** A 0-1 window of the page's play value: starts at `a`, done at `b`. */
const win = (t: number, a: number, b: number) => { "worklet"; return interpolate(t, [a, b], [0, 1], Extrapolation.CLAMP); };

// ---- page 1: a pocket card slides out of a wallet
function WalletArt({ active, reduce }: { active: boolean; reduce: boolean }) {
  const t = usePlay(active, reduce, 1000, 250);
  const card = useAnimatedStyle(() => ({ transform: [{ translateY: 44 - 98 * win(t.value, 0, 1) }, { rotate: `${-3 * win(t.value, 0.3, 1)}deg` }] }));
  const print = useAnimatedStyle(() => ({ opacity: win(t.value, 0.55, 1) }));
  return (
    <View style={{ width: 280, height: 240 }}>
      <View style={{ position: "absolute", left: 25, bottom: 0, width: 230, height: 130, borderRadius: 26, backgroundColor: c.ink }} />
      <Animated.View style={[{ position: "absolute", left: 55, bottom: 52, width: 170, height: 107, borderRadius: 16, backgroundColor: c.accent, padding: 14, justifyContent: "space-between" }, card]}>
        <Animated.View style={[{ gap: 2 }, print]}>
          <T v="cap" w="semi" style={{ color: c.onAccent, fontSize: 13 }}>Research data</T>
          <T v="amount" style={{ color: c.onAccent, fontSize: 22, lineHeight: 28 }}>US$5.00</T>
        </Animated.View>
        <Animated.View style={[{ width: 26, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.55)" }, print]} />
      </Animated.View>
      <View style={{ position: "absolute", left: 25, bottom: 0, width: 230, height: 92, borderRadius: 26, backgroundColor: c.ink, borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.14)" }}>
        <View style={{ position: "absolute", right: 22, top: 30, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)" }} />
        <View style={{ position: "absolute", left: 22, top: 38, width: 60, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.14)" }} />
      </View>
    </View>
  );
}

// ---- page 2: a lock closes, then the rules of the contract draw in line by line
const RULES: [string, string][] = [["Allowed sellers", "DataLite, DataPro"], ["Per payment", "up to US$2.00"], ["Ask me above", "US$1.00"]];
function ContractArt({ active, reduce }: { active: boolean; reduce: boolean }) {
  const t = usePlay(active, reduce, 1500, 200);
  const shackle = useAnimatedStyle(() => ({ transform: [{ translateY: -7 * (1 - win(t.value, 0.05, 0.3)) }] }));
  const key = useAnimatedStyle(() => ({ opacity: win(t.value, 0.8, 1) }));
  return (
    <View style={{ width: 290, backgroundColor: c.card, borderRadius: radius.card, paddingHorizontal: 20, paddingTop: 34, paddingBottom: 18 }}>
      <View style={{ position: "absolute", top: -26, alignSelf: "center", width: 52, height: 52, borderRadius: 26, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: c.canvas }}>
        <Animated.View style={[{ width: 15, height: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 2.5, borderBottomWidth: 0, borderColor: c.onAccent, marginBottom: -1 }, shackle]} />
        <View style={{ width: 22, height: 15, borderRadius: 4, backgroundColor: c.onAccent }} />
      </View>
      {RULES.map(([k, v], i) => <Rule key={k} k={k} v={v} t={t} from={0.2 + i * 0.17} />)}
      <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }, key]}>
        <Icon name="key" size={16} color={c.accent} />
        <T v="cap" w="medium" color="accent">Only your key can change these</T>
      </Animated.View>
    </View>
  );
}
function Rule({ k, v, t, from }: { k: string; v: string; t: SharedValue<number>; from: number }) {
  const row = useAnimatedStyle(() => ({ opacity: win(t.value, from, from + 0.15), transform: [{ translateY: 6 * (1 - win(t.value, from, from + 0.15)) }] }));
  const line = useAnimatedStyle(() => ({ width: `${win(t.value, from + 0.05, from + 0.25) * 100}%` }));
  return (
    <View style={{ paddingTop: 12 }}>
      <Animated.View style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12 }, row]}>
        <T v="sub" color="muted">{k}</T>
        <T v="sub" w="semi">{v}</T>
      </Animated.View>
      <Animated.View style={[{ height: 1.5, backgroundColor: c.line }, line]} />
    </View>
  );
}

// ---- page 3: the worst case is a small segment of everything you own
function WorstArt({ active, reduce }: { active: boolean; reduce: boolean }) {
  const t = usePlay(active, reduce, 1500, 200);
  const seg = useAnimatedStyle(() => ({ width: `${22 * win(t.value, 0.05, 0.5)}%` }));
  const label = useAnimatedStyle(() => ({ opacity: win(t.value, 0.4, 0.6) }));
  return (
    <View style={{ width: 290, gap: 22 }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T v="cap" w="medium" color="muted">Everything you own</T>
          <Animated.View style={label}><T v="cap" w="semi" color="accent">Pocket · US$5.00</T></Animated.View>
        </View>
        <View style={{ height: 22, borderRadius: 11, backgroundColor: c.line, overflow: "hidden" }}>
          <Animated.View style={[{ height: 22, borderRadius: 11, backgroundColor: c.accent }, seg]} />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <T v="cap" w="medium" color="muted">It can only pay</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip t={t} from={0.55} label="DataLite" ok />
          <Chip t={t} from={0.65} label="DataPro" ok />
          <Chip t={t} from={0.78} label="Anyone else" />
        </View>
      </View>
    </View>
  );
}
function Chip({ t, from, label, ok }: { t: SharedValue<number>; from: number; label: string; ok?: boolean }) {
  const a = useAnimatedStyle(() => ({ opacity: win(t.value, from, from + 0.15), transform: [{ translateY: 6 * (1 - win(t.value, from, from + 0.15)) }] }));
  return (
    <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: ok ? c.accentSoft : c.fill }, a]}>
      <Icon name={ok ? "check" : "ban"} size={15} color={ok ? c.accent : c.muted} stroke={2.2} />
      <T v="sub" w="semi" style={{ color: ok ? c.accent : c.muted }}>{label}</T>
    </Animated.View>
  );
}

// ---- pager
function Page({ i, w, pos, active, reduce }: { i: number; w: number; pos: SharedValue<number>; active: boolean; reduce: boolean }) {
  const art = useAnimatedStyle(() => {
    const o = w > 0 ? (pos.value - i * w) / w : 0;
    return { opacity: 1 - Math.min(Math.abs(o), 1) * 0.85, transform: [{ translateX: -o * 46 }] };
  });
  const text = useAnimatedStyle(() => {
    const o = w > 0 ? (pos.value - i * w) / w : 0;
    return { opacity: 1 - Math.min(Math.abs(o), 1) * 0.9 };
  });
  return (
    <View style={{ width: w, flex: 1, paddingHorizontal: 24 }}>
      <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 12 }, art]}>
        {i === 0 ? <WalletArt active={active} reduce={reduce} /> : i === 1 ? <ContractArt active={active} reduce={reduce} /> : <WorstArt active={active} reduce={reduce} />}
      </Animated.View>
      <Animated.View style={[{ gap: 12, paddingBottom: 20 }, text]}>
        <T v="title" accessibilityRole="header">{PAGES[i].title}</T>
        <T v="body" color="ink2">{PAGES[i].sub}</T>
      </Animated.View>
    </View>
  );
}

function Dot({ i, w, pos, fill, auto }: { i: number; w: number; pos: SharedValue<number>; fill: SharedValue<number>; auto: boolean }) {
  const box = useAnimatedStyle(() => {
    const p = w > 0 ? pos.value / w : 0;
    return { width: interpolate(p, [i - 1, i, i + 1], [8, 30, 8], Extrapolation.CLAMP) };
  });
  const on = useAnimatedStyle(() => {
    const p = w > 0 ? pos.value / w : 0;
    const near = interpolate(p, [i - 0.5, i, i + 0.5], [0, 1, 0], Extrapolation.CLAMP);
    return { opacity: near, width: `${(auto ? fill.value : 1) * 100}%` };
  });
  return (
    <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: "hidden" }, box]}>
      <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: c.accent }, on]} />
    </Animated.View>
  );
}

export function Intro({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  const [auto, setAuto] = useState(true);
  const pos = useSharedValue(0);
  const start = useSharedValue(0);
  const fill = useSharedValue(0);
  const fade = useSharedValue(1);
  const leaving = useRef(false);
  const first = useRef(true);

  const finish = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    finishIntro(); // Home plays its entrance while the intro lets go
    fade.value = withTiming(0, { duration: reduce ? 160 : 260, easing: EASE_OUT }, (ok) => { if (ok) scheduleOnRN(onDone); });
  }, [onDone, reduce, fade]);

  const go = useCallback((n: number, velocity = 0) => {
    const t = Math.max(0, Math.min(PAGES.length - 1, n));
    pos.value = reduce ? t * w : withSpring(t * w, { ...motion.spring.release, velocity });
    setPage(t);
  }, [pos, w, reduce]);

  useEffect(() => { if (first.current) { first.current = false; return; } haptic.select(); }, [page]);

  // auto-advance: the active dot fills over PAGE_MS, then the next page; the first touch hands control to the owner
  useEffect(() => {
    if (!auto || w === 0) return;
    fill.value = 0;
    fill.value = withTiming(1, { duration: PAGE_MS, easing: Easing.linear });
    const t = setTimeout(() => { if (page >= PAGES.length - 1) finish(); else go(page + 1); }, PAGE_MS);
    return () => { clearTimeout(t); cancelAnimation(fill); };
  }, [auto, page, w]); // eslint-disable-line react-hooks/exhaustive-deps

  const take = () => setAuto(false);
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10]).failOffsetY([-28, 28])
    .onBegin(() => { start.value = pos.value; cancelAnimation(pos); scheduleOnRN(take); })
    .onUpdate((e) => {
      const raw = start.value - e.translationX;
      const max = (PAGES.length - 1) * w;
      pos.value = raw < 0 ? -rubberband(-raw, w * 0.6) : raw > max ? max + rubberband(raw - max, w * 0.6) : raw;
    })
    .onEnd((e) => {
      const target = Math.max(0, Math.min(PAGES.length - 1, Math.round((pos.value - e.velocityX * 0.18) / w)));
      pos.value = reduce ? target * w : withSpring(target * w, { ...motion.spring.release, velocity: -e.velocityX });
      scheduleOnRN(setPage, target);
    });

  const root = useAnimatedStyle(() => ({ opacity: fade.value }));
  const strip = useAnimatedStyle(() => ({ transform: [{ translateX: -pos.value }] }));
  const last = page === PAGES.length - 1;

  return (
    <Animated.View onLayout={(e) => { const nw = e.nativeEvent.layout.width; if (nw !== w) { setW(nw); pos.value = page * nw; } }}
      style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: c.canvas }, root]} accessibilityViewIsModal>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 56 + insets.top }}>
        <T v="row" w="semi" color="ink2" accessibilityRole="header">ChainBrain</T>
        <Press kind="button" haptics="light" onPress={finish} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip" style={{ height: 44, paddingHorizontal: 12, justifyContent: "center" }}>
          <T v="row" w="semi" color="accent">Skip</T>
        </Press>
      </View>
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1, overflow: "hidden" }}>
          {w > 0 ? (
            <Animated.View style={[{ flex: 1, flexDirection: "row", width: w * PAGES.length }, strip]}>
              {PAGES.map((_, i) => <Page key={i} i={i} w={w} pos={pos} active={page === i} reduce={reduce} />)}
            </Animated.View>
          ) : null}
        </View>
      </GestureDetector>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, gap: 18 }}>
        <View accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`} style={{ flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", height: 12 }}>
          {PAGES.map((_, i) => <Dot key={i} i={i} w={w} pos={pos} fill={fill} auto={auto && page === i} />)}
        </View>
        <Button label={last ? "Get started" : "Next"} onPress={() => (last ? finish() : go(page + 1))} />
      </View>
    </Animated.View>
  );
}
