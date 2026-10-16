// First-launch intro (and on demand from Settings): three pages, Skip always visible, swipe with the finger (the pager follows
// it 1:1 and lets go with its velocity) or press Next. User-paced: nothing moves on its own (NN/g on auto-forwarding, WCAG
// 2.2.2), so each page is read at the owner's speed. Each page has one illustration built from app primitives (Stitch chainbrain_intro + the
// vaultbank intro): the owner's real pocket cards are dealt in, tilted and spilling off the edge, while the mark locks in; the rules of a
// contract draw in under a lock, the worst case fills a hatch bar. No gradients, glow or sparkles.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, F, level3, motion, radius } from "../tokens";
import { useApp, useAppSelect } from "../store";
import { cleanText } from "../lib/sanitize";
import { Hatch } from "../ui/Hatch";
import { PocketFace, toneFor } from "./PocketFace";
import { BrandMark } from "../ui/BrandMark";
import type { Pocket } from "../store";
import { haptic } from "../haptics";
import { Button, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { EASE_OUT, rubberband, useReduceMotion } from "../ui/motion";
import { finishIntro } from "../ui/intro";

const PAGES = [
  { title: "Give your AI a pocket, not your wallet", sub: "A pocket holds a small budget for one agent: ChainBrain's own, Claude or ChatGPT. It can only spend what you put in." },
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

// ---- page 1 (VaultBank's onboarding): the owner's own pocket cards are dealt in, tilted, spilling off the screen's edge, and
// the mark's four tiles lock into place under them
const SPILL = [{ rot: -24, x: 0.36, y: -0.12 }, { rot: -19, x: 0.2, y: 0 }, { rot: -14, x: 0.04, y: 0.12 }]; // back to front (the back card leaves over the top)
function DeckArt({ active, reduce, w }: { active: boolean; reduce: boolean; w: number }) {
  const { pockets } = useApp();
  const t = usePlay(active, reduce, 1300, 150);
  // the oldest three live pockets, on the same faces they have on Home's deck, oldest in front
  const cards = pockets.filter((p) => !p.revoked).slice(-3);
  const cw = Math.round(Math.min(w, 448) * 0.74);
  const h = 300;
  return (
    <View style={{ width: "100%", height: h }}>
      {cards.map((p, i) => <SpillCard key={p.address} p={p} i={i} t={t} cw={cw} h={h} tone={toneFor(pockets, p.address)} />)}
      <View style={{ position: "absolute", left: 0, bottom: 0 }}><BrandMark size={44} lock={active} delay={reduce ? 0 : 750} /></View>
    </View>
  );
}
function SpillCard({ p, i, t, cw, h, tone }: { p: Pocket; i: number; t: SharedValue<number>; cw: number; h: number; tone: number }) {
  const f = SPILL[i] ?? SPILL[SPILL.length - 1];
  const a = useAnimatedStyle(() => {
    const k = win(t.value, i * 0.14, 0.6 + i * 0.14);
    return {
      opacity: win(t.value, i * 0.1, 0.22 + i * 0.1),
      transform: [{ translateX: cw * f.x + (1 - k) * cw * 0.9 }, { translateY: h * f.y * 0.7 - (1 - k) * 40 }, { rotate: `${f.rot - (1 - k) * 10}deg` }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, a]}>
      <PocketFace pocket={p} width={cw} tone={tone} shadow still />
    </Animated.View>
  );
}

// ---- page 2: a lock closes, then the rules of the contract draw in line by line
const BUILTIN_SELLERS = ["Exa", "CoinGecko", "Nansen"];
/** Sellers to name in the pictures: the built-in network's real providers, or the connected server's own sellers (real
 *  provider names never appear against a server). */
function useArtSellers(): string[] {
  const source = useAppSelect((s) => s.source);
  const cfg = useAppSelect((s) => s.cfg);
  return source === "builtin" ? BUILTIN_SELLERS : (cfg?.sellers ?? []).slice(0, 2).map((x) => cleanText(x.name, 16));
}
function ContractArt({ active, reduce }: { active: boolean; reduce: boolean }) {
  const t = usePlay(active, reduce, 1500, 200);
  const sellers = useArtSellers();
  const RULES: [string, string][] = [["Allowed sellers", sellers.join(", ") || "Two you chose"], ["Per payment", "up to US$0.05"], ["Ask me above", "US$0.02"]];
  const shackle = useAnimatedStyle(() => ({ transform: [{ translateY: -7 * (1 - win(t.value, 0.05, 0.3)) }] }));
  const key = useAnimatedStyle(() => ({ opacity: win(t.value, 0.8, 1) }));
  return (
    <View style={{ width: 290, backgroundColor: c.card, borderRadius: radius.card, paddingHorizontal: 20, paddingTop: 34, paddingBottom: 18, ...level3, shadowOpacity: 0.08 }}>
      <View style={{ position: "absolute", top: -26, alignSelf: "center", width: 52, height: 52, borderRadius: 16, backgroundColor: c.ink, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: c.canvas }}>
        <Animated.View style={[{ width: 15, height: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 2.5, borderBottomWidth: 0, borderColor: c.onAccent, marginBottom: -1 }, shackle]} />
        <View style={{ width: 22, height: 15, borderRadius: 4, backgroundColor: c.onAccent }} />
      </View>
      {RULES.map(([k, v], i) => <Rule key={k} k={k} v={v} t={t} from={0.2 + i * 0.17} />)}
      <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }, key]}>
        <Icon name="key" size={16} color={c.vermillion} />
        <T v="cap" w="bold" color="vermillionInk">Only your key can change these</T>
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
  const sellers = useArtSellers();
  const seg = useAnimatedStyle(() => ({ width: `${22 * win(t.value, 0.05, 0.5)}%` }));
  const label = useAnimatedStyle(() => ({ opacity: win(t.value, 0.4, 0.6) }));
  return (
    <View style={{ width: 290, gap: 22 }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T v="cap" w="medium" color="muted">Everything you own</T>
          <Animated.View style={label}><T v="cap" w="bold" color="vermillionInk">Pocket · US$5.00</T></Animated.View>
        </View>
        <View style={{ height: 26, borderRadius: 13, backgroundColor: c.card, overflow: "hidden" }}>
          <Hatch color={c.line} pitch={7} stroke={1.5} />
          <Animated.View style={[{ height: 26, borderRadius: 13, backgroundColor: c.vermillion }, seg]} />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <T v="cap" w="medium" color="muted">It can only pay</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {sellers.map((n, i) => <Chip key={n} t={t} from={0.55 + i * 0.05} label={n} ok />)}
          <Chip t={t} from={0.78} label="Anyone else" />
        </View>
      </View>
    </View>
  );
}
function Chip({ t, from, label, ok }: { t: SharedValue<number>; from: number; label: string; ok?: boolean }) {
  const a = useAnimatedStyle(() => ({ opacity: win(t.value, from, from + 0.15), transform: [{ translateY: 6 * (1 - win(t.value, from, from + 0.15)) }] }));
  return (
    <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: ok ? c.greenSoft : c.vermillionSoft }, a]}>
      <Icon name={ok ? "check" : "ban"} size={15} color={ok ? c.greenInk : c.vermillionInk} stroke={2.4} />
      <T v="sub" w="bold" style={{ color: ok ? c.greenInk : c.vermillionInk }}>{label}</T>
    </Animated.View>
  );
}

// ---- pager
function Page({ i, w, pos, active, reduce }: { i: number; w: number; pos: SharedValue<number>; active: boolean; reduce: boolean }) {
  const art = useAnimatedStyle(() => {
    const o = w > 0 ? (pos.value - i * w) / w : 0;
    return { opacity: 1 - Math.min(Math.abs(o), 1) * 0.85, transform: [{ translateX: -o * 46 }, { scale: 1.12 }] };
  });
  const text = useAnimatedStyle(() => {
    const o = w > 0 ? (pos.value - i * w) / w : 0;
    return { opacity: 1 - Math.min(Math.abs(o), 1) * 0.9 };
  });
  return (
    <View style={{ width: w, flex: 1, paddingHorizontal: 24 }}>
      <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 12 }, art]}>
        {i === 0 ? <DeckArt active={active} reduce={reduce} w={w} /> : i === 1 ? <ContractArt active={active} reduce={reduce} /> : <WorstArt active={active} reduce={reduce} />}
      </Animated.View>
      <Animated.View style={[{ gap: 12, paddingBottom: 20 }, text]}>
        <T v="display" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 40 }}>{PAGES[i].title}</T>
        <T v="body" color="ink2">{PAGES[i].sub}</T>
      </Animated.View>
    </View>
  );
}

function Dot({ i, w, pos }: { i: number; w: number; pos: SharedValue<number> }) {
  const box = useAnimatedStyle(() => {
    const p = w > 0 ? pos.value / w : 0;
    return { width: interpolate(p, [i - 1, i, i + 1], [8, 30, 8], Extrapolation.CLAMP) };
  });
  const on = useAnimatedStyle(() => {
    const p = w > 0 ? pos.value / w : 0;
    return { opacity: interpolate(p, [i - 0.5, i, i + 0.5], [0, 1, 0], Extrapolation.CLAMP) };
  });
  return (
    <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: "hidden" }, box]}>
      <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: c.ink, width: "100%" }, on]} />
    </Animated.View>
  );
}

export function Intro({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  const pos = useSharedValue(0);
  const start = useSharedValue(0);
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

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10]).failOffsetY([-28, 28])
    .onBegin(() => { start.value = pos.value; cancelAnimation(pos); })
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <BrandMark size={26} />
          <T v="head" accessibilityRole="header" style={{ fontFamily: F.displayBold, fontSize: 21, lineHeight: 26, letterSpacing: -0.3 }}>ChainBrain</T>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ minHeight: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.card, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.vermillion }} />
            <T v="cap" w="semi">Test network</T>
          </View>
          <Press kind="button" haptics="light" onPress={finish} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip" style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: "center" }}>
            <T v="row" w="bold">Skip</T>
          </Press>
        </View>
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
        <View accessible accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`} style={{ flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", height: 12 }}>
          {PAGES.map((_, i) => <Dot key={i} i={i} w={w} pos={pos} />)}
        </View>
        <Button label={last ? "Get started" : "Next"} kind="vermillion" iconRight="arrowUpRight" onPress={() => (last ? finish() : go(page + 1))} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: -6 }}>
          <Icon name="shieldCheck" size={13} color={c.mutedOnCanvas} />
          <T v="cap" color="mutedOnCanvas">Test network · no real money</T>
        </View>
      </View>
    </Animated.View>
  );
}
