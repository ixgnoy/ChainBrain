// New pocket app's live canvas (write → watch → sign): after Compose, the pocket app designs itself on a phone-shaped
// canvas, the way an AI design tool shows a screen appearing from a prompt. The agent's mark moves over the canvas like a
// collaborator's cursor; each decision of the real spec (shared/sim/specStream.ts: catalogue, layout, title, agent,
// routine, each block, any reorder, the validation) is typed into the spec panel as a JSON Patch line, and the canvas
// changes to match it: the blueprint card takes its job's colour, the title types itself, the agent's mark lands on the
// card, the header's chips arrive, each block drops in as a skeleton and fills with its real content, and a final pass
// checks every block. It is a paced replay of a spec that was already decided (by the picker or by Claude: the panel says
// which), at a pace a room can follow; Reduce Motion plays it fast, without the cursor.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions, Platform } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { c, motion } from "../../tokens";
import { haptic } from "../../haptics";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { Press } from "../../ui/kit";
import { AgentAvatar } from "../../ui/AgentAvatar";
import { useReduceMotion } from "../../ui/motion";
import { PocketFace, cardHeight, type Tone } from "../PocketFace";
import { AppHeader, BlockView, type AppCtx } from "./PocketApp";
import { BLOCK_NAME } from "./BuildStage";
import { useCoverDock } from "../AskDock";
import { agentName } from "./theme";
import type { Pocket } from "../../store";
import type { Block, Layout, PocketAppSpec } from "../../../../shared/sim/pocketApp";
import { blocksAfter, opLine, readingSteps, specOps } from "../../../../shared/sim/specStream";
import { FACE, LAYOUT_NAME } from "./theme";

const IN_W = 390; // the canvas draws the app at a phone's width, then scales it into the frame
const CARD_W = IN_W - 32;
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, monospace" });
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type View2 = { face: boolean; title: number; agent: boolean; header: boolean; step: number; filled: number; checked: number; done: boolean;
  /** reading: how much of the sentence has been read, and what the reader guesses so far */ read: number; guess: Layout | null };
const START: View2 = { face: false, title: 0, agent: false, header: false, step: 0, filled: 0, checked: 0, done: false, read: 0, guess: null };

export function LiveCanvas({ spec, agentId, by, sentence, ctx, pocket, tone, onClose, sign }: {
  spec: PocketAppSpec; agentId: string; /** who decided the spec */ by: "claude" | "picker"; sentence: string;
  ctx: AppCtx; pocket: Pocket; tone: Tone; onClose(): void; /** the bottom sheet once it is built: the rules and the slide */ sign: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  useCoverDock(true); // the ask dock would sit on the spec panel and the slide
  const { width: winW, height: winH } = useWindowDimensions();
  const ops = useMemo(() => specOps(spec, agentId), [spec, agentId]);
  const blockOps = useMemo(() => ops.map((o, i) => ({ o, i })).filter(({ o }) => o.beat === "block"), [ops]);
  const [v, setV] = useState<View2>(START);
  const [lines, setLines] = useState<string[]>([]);
  const [run, setRun] = useState(0); // Replay restarts the script
  const token = useRef(0); // Skip cancels the running script
  const who = agentName(agentId);

  // the frame: a phone outline holding the app at IN_W, scaled down
  const PANEL = 148;
  const FW = Math.min(winW - 64, 320);
  const s = FW / IN_W;
  const FH = Math.max(300, winH - insets.top - 132 - PANEL - insets.bottom - 24);

  // where things are on the canvas (inner coordinates), measured as they appear
  const pos = useRef<Record<string, { y: number; h: number }>>({});
  const scroll = useSharedValue(0);
  const scrollTo = (bottom: number) => {
    const target = Math.min(0, FH - 28 - bottom * s);
    scroll.value = reduce ? target : withTiming(target, { duration: 420, easing: Easing.out(Easing.cubic) });
    return target;
  };
  const content = useAnimatedStyle(() => ({ transform: [{ translateY: scroll.value }] }));

  // the cursor: the agent's mark with a pointer, flying on a curve (x and y on different easings)
  const cx = useSharedValue(FW / 2), cy = useSharedValue(FH + 20), press = useSharedValue(1), seen = useSharedValue(0);
  const cursor = useAnimatedStyle(() => ({ opacity: seen.value, transform: [{ translateX: cx.value }, { translateY: cy.value }, { scale: press.value }] }));
  const fly = async (ix: number, iy: number, sc: number, ms = 560) => {
    if (reduce) return;
    seen.value = withTiming(1, { duration: 180 });
    cx.value = withTiming(ix * s, { duration: ms, easing: Easing.bezier(0.3, 0, 0.2, 1) });
    cy.value = withTiming(iy * s + sc, { duration: ms, easing: Easing.inOut(Easing.quad) });
    await sleep(ms + 60);
  };
  const tap = async () => { if (reduce) return; press.value = withSequence(withTiming(0.82, { duration: 90 }), withTiming(1, { duration: 160 })); await sleep(160); };

  // the panel: each op typed in, a few characters a frame
  const panel = useRef<ScrollView>(null);
  const type = async (text: string, alive: () => boolean) => {
    setLines((l) => [...l, ""]);
    if (reduce) { setLines((l) => [...l.slice(0, -1), text]); return; }
    for (let k = 7; k < text.length + 7 && alive(); k += 7) {
      setLines((l) => [...l.slice(0, -1), text.slice(0, k)]);
      await sleep(16);
    }
  };

  // the script: one beat per op, at stage pace
  useEffect(() => {
    let live = true;
    const tok = ++token.current;
    const alive = () => live && tok === token.current;
    const pace = reduce ? 0.25 : 1;
    const w = (ms: number) => sleep(ms * pace);
    setV(START); setLines([]); pos.current = {}; scroll.value = 0;
    (async () => {
      await w(300);
      // reading: the sentence lights up word by word; the blueprint takes the reader's guess, and changes it when a word
      // changes the reading (the real fixed reader on each prefix)
      const steps = readingSteps(sentence);
      const words = [...sentence.matchAll(/\S+/g)].map((m) => (m.index ?? 0) + m[0].length);
      let si = 0;
      for (const end of words) {
        if (!alive()) return;
        setV((x) => ({ ...x, read: end }));
        while (si < steps.length && steps[si].upto <= end) {
          const g = steps[si].layout, changed = si > 0;
          setV((x) => ({ ...x, guess: g }));
          setLines((l) => [...l, changed ? `// reading… now a ${LAYOUT_NAME[g].toLowerCase()} (changed its mind)` : `// reading… looks like a ${LAYOUT_NAME[g].toLowerCase()}`]);
          if (si) { haptic.select(); await w(520); }
          si++;
        }
        await sleep(reduce ? 0 : 55);
      }
      await w(250);
      let placed = 0, filled = 0;
      for (let i = 0; i < ops.length && alive(); i++) {
        const o = ops[i];
        await type(opLine(o), alive);
        if (!alive()) return;
        const sc = scroll.value;
        if (o.beat === "catalogue") { await fly(IN_W * 0.5, 120, sc, 520); await w(150); }
        if (o.beat === "layout") { await fly(IN_W * 0.62, 120, sc); await tap(); setV((x) => ({ ...x, face: true, step: i + 1 })); haptic.light(); await w(520); }
        if (o.beat === "title") {
          await fly(110, 44, sc, 420); await tap();
          for (let k = 1; k <= spec.title.length && alive(); k++) { setV((x) => ({ ...x, title: k })); await sleep(reduce ? 0 : 38 + ((k * 37) % 40)); }
          await w(200);
        }
        if (o.beat === "agent") { await fly(150, 96, sc, 480); await tap(); setV((x) => ({ ...x, agent: true, step: i + 1 })); haptic.light(); await w(420); }
        if (o.beat === "routine") {
          const y = (pos.current.header?.y ?? 260) + 30;
          setV((x) => ({ ...x, header: true, step: i + 1 }));
          await fly(IN_W * 0.4, y, sc, 480); await tap(); haptic.select(); await w(420);
        }
        if (o.beat === "block") {
          setV((x) => ({ ...x, header: true, step: i + 1 }));
          placed++;
          await sleep(70); // let it lay out, then fly to it
          const b = pos.current[`b${o.index}`];
          const sc2 = b ? scrollTo(b.y + b.h) : scroll.value;
          if (b) await fly(IN_W * 0.66, b.y + Math.min(b.h / 2, 70), sc2, 430);
          await tap(); haptic.light();
          // the skeleton holds a moment, then the block two places back fills in (so each is seen as a skeleton first)
          if (placed - filled > 1) { filled++; setV((x) => ({ ...x, filled })); }
          await w(160);
        }
        if (o.beat === "move") {
          setV((x) => ({ ...x, step: i + 1 })); haptic.select(); await w(520);
        }
        if (o.beat === "validate") {
          // the remaining skeletons fill, then one pass checks every block, top to bottom
          for (; filled < blockOps.length && alive(); ) { filled++; setV((x) => ({ ...x, filled })); await w(140); }
          seen.value = withTiming(0, { duration: 220 });
          scroll.value = reduce ? 0 : withTiming(0, { duration: 700, easing: Easing.inOut(Easing.cubic) });
          await w(380);
          for (let k = 1; k <= blockOps.length && alive(); k++) { setV((x) => ({ ...x, checked: k, step: i + 1 })); haptic.select(); await w(110); }
          await w(240);
        }
        setV((x) => ({ ...x, step: Math.max(x.step, i + 1) }));
      }
      if (!alive()) return;
      setV((x) => ({ ...x, done: true }));
      haptic.success();
    })();
    return () => { live = false; };
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => { panel.current?.scrollToEnd({ animated: !reduce }); }, [lines.length, reduce]);

  const order = blocksAfter(ops, v.step);
  const blocks: Block[] = order.map((t) => spec.blocks.find((b) => b.type === t)!).filter(Boolean);
  const indexOf = (t: string) => blockOps.findIndex(({ o }) => (o.value as Block).type === t);
  const shown: Pocket = {
    ...pocket, name: spec.title.slice(0, v.title) || " ", agentId: v.agent ? pocket.agentId : undefined,
    app: v.face ? pocket.app : v.guess && pocket.app ? { ...pocket.app, layout: v.guess } : undefined,
  } as Pocket;
  const byLine = by === "claude" ? "Composed by Claude" : "Picked by ChainBrain";

  return (
    <Animated.View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 20, backgroundColor: c.canvas }}
      accessibilityViewIsModal>
      {/* top: close, what is happening, skip / replay */}
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Press kind="round" haptics="select" onPress={onClose} accessibilityRole="button" accessibilityLabel="Back to the sentence"
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" size={18} color={c.ink} stroke={2.2} />
        </Press>
        <View style={{ flex: 1, alignItems: "center" }}>
          <T v="head" numberOfLines={1}>{v.done ? "Your pocket app" : "Designing your pocket app"}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {!v.done ? <Pulse /> : <Icon name="check" size={12} color={c.greenInk} stroke={2.6} />}
            <T v="cap" color="muted">{v.done ? `${spec.blocks.length} blocks · ${byLine}` : !v.face ? "Reading your sentence" : `${who} is placing blocks`}</T>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>
      {/* the sentence it is building from */}
      <View style={{ marginHorizontal: 24, marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.card, flexDirection: "row", gap: 8 }}>
        <Icon name="chat" size={14} color={c.muted} stroke={2} />
        <T v="cap" numberOfLines={2} style={{ flex: 1, color: c.faint }}>
          <T v="cap" w={v.read && v.read < sentence.length ? "semi" : undefined} style={{ color: c.ink }}>{`“${sentence.slice(0, v.read || sentence.length)}`}</T>
          {v.read && v.read < sentence.length ? sentence.slice(v.read) : ""}”
        </T>
      </View>

      {/* the canvas */}
      <View style={{ alignItems: "center", marginTop: 12 }}>
        <View style={{ width: FW + 12, height: FH + 12, borderRadius: 34, backgroundColor: c.ink, padding: 6 }}>
          <View style={{ width: FW, height: FH, borderRadius: 28, overflow: "hidden", backgroundColor: c.canvas }} accessible accessibilityLabel={`The pocket app being built: ${blocks.map((b) => BLOCK_NAME[b.type] ?? b.type).join(", ")}`}>
            <Animated.View style={content}>
              <View style={{ width: IN_W, transform: [{ scale: s }], transformOrigin: "top left" } as object}>
                <View style={{ paddingTop: 16, paddingBottom: 24, gap: 12 }}>
                  {/* the card: a blueprint until the layout is chosen */}
                  <View style={{ alignItems: "center" }}>
                    <View style={{ opacity: v.face ? 1 : v.guess ? 0.6 : 0.45 }}>
                      <PocketFace pocket={shown} width={CARD_W} tone={v.face ? tone : v.guess ? FACE[v.guess] : 3} still draft />
                    </View>
                    {!v.face ? <View pointerEvents="none" style={{ position: "absolute", top: 0, width: CARD_W, height: cardHeight(CARD_W), borderRadius: 18, borderWidth: 3, borderStyle: "dashed", borderColor: c.ink2 }} /> : null}
                  </View>
                  {v.header ? (
                    <Animated.View entering={reduce ? undefined : FadeInDown.duration(260)} onLayout={(e) => { pos.current.header = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }; }}>
                      <AppHeader ctx={ctx} />
                    </Animated.View>
                  ) : <View onLayout={(e) => { pos.current.header = { y: e.nativeEvent.layout.y, h: 60 }; }} style={{ height: 0 }} />}
                  {blocks.map((b) => {
                    const i = indexOf(b.type);
                    const filled = i < v.filled;
                    const checked = order.indexOf(b.type) < v.checked;
                    return (
                      <Animated.View key={b.type} layout={reduce ? undefined : LinearTransition.duration(380)} entering={reduce ? undefined : FadeInDown.duration(260)}
                        onLayout={(e) => { pos.current[`b${i}`] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }; }}>
                        <View style={{ opacity: filled ? 1 : 0 }}><BlockView block={b} ctx={ctx} /></View>
                        {!filled ? <Skeleton label={BLOCK_NAME[b.type] ?? b.type} /> : null}
                        {checked ? (
                          <Animated.View entering={reduce ? undefined : FadeIn.duration(160)} style={{ position: "absolute", left: 6, top: -8, width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: c.canvas, backgroundColor: c.greenInk, alignItems: "center", justifyContent: "center" }}>
                            <Icon name="check" size={14} color={c.white} stroke={3} />
                          </Animated.View>
                        ) : null}
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          </View>
          {/* the cursor, over the canvas */}
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 6, top: 6, width: 220, height: 50 }, cursor]}>
            <Svg width={18} height={22} viewBox="0 0 18 22"><Path d="M1.5 1.5 L16 12.2 L9.4 13.1 L6.2 20 Z" fill={c.ink} stroke={c.white} strokeWidth={1.6} strokeLinejoin="round" /></Svg>
            <View style={{ position: "absolute", left: 14, top: 18, flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 3, paddingRight: 10, height: 26, borderRadius: 13, backgroundColor: c.ink, alignSelf: "flex-start" }}>
              <AgentAvatar kind={agentId} size={20} />
              <T v="cap" w="bold" numberOfLines={1} style={{ color: c.white, flexShrink: 0 }}>{who}</T>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* the spec panel: the decisions, as they land */}
      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12, height: PANEL, borderRadius: 20, backgroundColor: c.ink, paddingTop: 10, paddingHorizontal: 14 }}
        accessible accessibilityLabel={`The spec, ${byLine.toLowerCase()}: ${lines.length} of ${ops.length} decisions`}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <T v="cap" w="bold" style={{ color: c.white, fontFamily: MONO }}>{"{ } spec"}</T>
          <T v="cap" style={{ color: "rgba(255,255,255,0.55)", flex: 1 }} numberOfLines={1}>{`${byLine} · from 13 fixed blocks`}</T>
          <T v="cap" style={{ color: "rgba(255,255,255,0.55)", fontVariant: ["tabular-nums"] }}>{`${Math.min(lines.filter((l) => !l.startsWith("//")).length, ops.length)}/${ops.length}`}</T>
        </View>
        <ScrollView ref={panel} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
          {lines.map((l, k) => (
            <T key={k} v="cap" numberOfLines={2} style={{ fontFamily: MONO, fontSize: 11, lineHeight: 15, color: k === lines.length - 1 && !v.done ? "#FFB49E" : l.startsWith("//") ? "#9DCAFF" : "rgba(255,255,255,0.62)" }}>
              {l}{k === lines.length - 1 && !v.done ? "▍" : ""}
            </T>
          ))}
        </ScrollView>
      </View>

      {/* once built: the rules in brief and the slide */}
      {v.done ? (
        <Animated.View entering={reduce ? FadeIn.duration(150) : FadeInDown.duration(320)} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          {sign}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** A block before it fills: a rounded card with bars where its title and content will be, and a light band sweeping across. */
function Skeleton({ label }: { label: string }) {
  const reduce = useReduceMotion();
  const x = useSharedValue(-120);
  useEffect(() => { if (!reduce) x.value = withRepeat(withTiming(IN_W + 40, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1); }, [reduce, x]);
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: "18deg" }] }));
  return (
    <View style={{ position: "absolute", left: 16, right: 16, top: 0, bottom: 0, borderRadius: 20, backgroundColor: "#ECEAE5", overflow: "hidden", padding: 18, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 120, height: 14, borderRadius: 7, backgroundColor: "#DDDAD3" }} />
        {label ? <T v="tab" style={{ color: "#A9A59C" }}>{label}</T> : null}
      </View>
      <View style={{ height: 44, borderRadius: 12, backgroundColor: "#DDDAD3" }} />
      <View style={{ width: "70%", height: 12, borderRadius: 6, backgroundColor: "#DDDAD3" }} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -40, bottom: -40, width: 70, backgroundColor: "rgba(255,255,255,0.55)" }, band]} />
    </View>
  );
}

function Pulse() {
  const reduce = useReduceMotion();
  const o = useSharedValue(1);
  useEffect(() => { if (!reduce) o.value = withRepeat(withSequence(withTiming(0.3, { duration: 500 }), withTiming(1, { duration: 500 })), -1); }, [reduce, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.vermillion }, st]} />;
}
