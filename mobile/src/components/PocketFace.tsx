// A pocket as a physical card, VaultBank's anatomy in 2.5D: one of four faces by deck slot (black, vermillion, powder blue,
// white hatch), ISO proportions, a stripe across the card carrying the holding agent on a white pill, the balance, the rules
// in one line, the short pocket number big at the bottom. Depth: the card's side shows under the face, a Skia material
// (grain, top light, a specular band) sits under the print, and the card in focus leans with the phone (ui/tilt.tsx).
// Everything on it is read from the pocket contract. A revoked, frozen or ended pocket settles to the white hatch face with
// a lock; when it happens in view the face cross-fades, the card dips and the phone gives a Warning tick.
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { c, deck, level3, motion, type DeckFace } from "../tokens";
import { haptic } from "../haptics";
import { Money } from "../ui/Money";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Hatch } from "../ui/Hatch";
import { AgentAvatar } from "../ui/AgentAvatar";
import { CardMaterial } from "../ui/CardMaterial";
import { useTilt } from "../ui/tilt";
import { TextScaleCap } from "../ui/fontScale";
import { EASE_OUT, useReduceMotion } from "../ui/motion";
import { NEVER } from "../lib/shared";
import { cleanText } from "../lib/sanitize";
import { contractTail, money, usd } from "../lib/util";
import { agentInfo } from "../../../shared/sim/agents";
import { usageChip, usageOf, type Layout, type RoutineSpec } from "../../../shared/sim/pocketApp";
import { LAYOUT_NAME, USAGE_FACE } from "./app/theme";
import { glyphKey, type Glyph } from "../../../shared/sim/pocketAppData";
import Svg, { Circle, Polyline } from "react-native-svg";
import type { Pocket } from "../store";
import { isExpired } from "./PocketCard";

export const CARD_RATIO = 1.586;
export const cardHeight = (w: number) => Math.round(w / CARD_RATIO);
/** Deck slot 0..3 (black, vermillion, blue, white hatch). Older callers passed "navy" / "teal". */
export type Tone = number;
/** The card face says how often the pocket spends (shared/sim/pocketApp.ts `usageOf`): daily powder blue, weekly or monthly
 *  sage, one-time wheat, when asked white hatch. A pocket without an app spends only when asked. */
export function toneFor(pockets: { address: string; app?: { layout: Layout; routine?: RoutineSpec | null } }[], address: string): Tone {
  const p = pockets.find((x) => x.address.toLowerCase() === address.toLowerCase());
  return USAGE_FACE[usageOf(p?.app)];
}
export const faceOf = (tone: Tone): DeckFace => deck[((tone % deck.length) + deck.length) % deck.length];
const FROZEN: DeckFace = deck[3];

function PocketFaceView({ pocket, width, tone, buzz, shadow, focused = true, tilt, still, draft, glyph, peek, job }: { pocket: Pocket; width: number; tone: Tone; /** Warning haptic when it freezes in view */ buzz?: boolean;
  /** lean with the phone (the one card in focus: the pocket page, the front of the deck) */ tilt?: boolean;
  /** the level-3 card shadow (DESIGN.md: fanned cards) */ shadow?: boolean;
  /** the screen showing this card is in front: a freeze that happened while it was away plays when it comes back */ focused?: boolean;
  /** no material layer (the flying copy, small thumbnails) */ still?: boolean;
  /** not on-chain yet (the compose preview): no contract number */ draft?: boolean;
  /** the live sign in the top corner (Home's wallet stack shows only each card's top strip) */ glyph?: Glyph | null;
  /** only the top strip shows: without a live sign, the corner carries the balance */ peek?: boolean;
  /** one line of what the pocket does, under its name, with the agent's mark (Home's stack: each strip says what it is) */ job?: string }) {
  const reduce = useReduceMotion();
  const h = cardHeight(width);
  const k = Math.min(1, width / 340);
  const off = pocket.revoked || !!pocket.frozen || isExpired(pocket);
  const frost = useSharedValue(off ? 1 : 0);
  const dip = useSharedValue(1);
  const was = useRef(off);
  // the frozen print is a second full card: draw it only while the card is off, and for its fade-out after an unfreeze
  const [deadOn, setDeadOn] = useState(off);
  useEffect(() => {
    if (off) { setDeadOn(true); return; }
    const t = setTimeout(() => setDeadOn(false), 600);
    return () => clearTimeout(t);
  }, [off]);
  const owed = useRef(false); // a freeze happened out of sight: play it when the card is seen
  const play = () => {
    frost.value = reduce ? 1 : withTiming(1, { duration: 700, easing: EASE_OUT });
    if (!reduce) dip.value = withSequence(withTiming(0.975, { duration: 160, easing: EASE_OUT }), withSpring(1, motion.spring.press));
    if (buzz) haptic.warning();
  };
  useEffect(() => {
    if (off && !was.current) { if (focused) play(); else owed.current = true; }
    else if (!off) { frost.value = reduce ? 0 : withTiming(0, { duration: 500, easing: EASE_OUT }); owed.current = false; }
    was.current = off;
  }, [off]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!focused || !owed.current) return;
    owed.current = false; frost.value = 0;
    const t = setTimeout(play, 250);
    return () => clearTimeout(t);
  }, [focused]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = useAnimatedStyle(() => ({ opacity: 1 - frost.value }));
  const dead = useAnimatedStyle(() => ({ opacity: frost.value }));
  // 2.5D: the card leans with the phone (tilt) and its side shows under the face, shifting the other way
  const t = useTilt();
  const lean = !!tilt && !reduce;
  const body = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${lean ? -t.y.value * 7 : 0}deg` },
      { rotateY: `${lean ? t.x.value * 7 : 0}deg` },
      { scale: dip.value },
    ],
  }));
  const edgeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lean ? -t.x.value * 3 : 0 }, { translateY: EDGE + (lean ? t.y.value * 2 : 0) }] }));

  const name = cleanText(pocket.name, 24);
  const agent = agentInfo(pocket.agentId ?? "");
  const state = pocket.revoked ? "Revoked" : pocket.frozen ? "Frozen" : isExpired(pocket) ? "Ended" : null;
  const face = faceOf(tone);
  return (
    <Animated.View style={[{ width, height: h + EDGE }, body]}>
      {/* the card's side, under the face */}
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height: h, borderRadius: R, borderCurve: "continuous", backgroundColor: off ? FROZEN.edge : face.edge } as object, shadow ? level3 : null, edgeStyle]} />
      <View style={{ width, height: h, borderRadius: R, overflow: "hidden", borderCurve: "continuous" } as object}>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, live]}>
          <Print pocket={pocket} name={name} agent={agent?.name} agentId={pocket.agentId} face={face} k={k} w={width} h={h} still={still} draft={draft} glyph={glyph} peek={peek} job={job} />
        </Animated.View>
        {deadOn ? (
          <Animated.View pointerEvents={off ? "auto" : "none"} style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, dead]}>
            <Print pocket={pocket} name={name} agent={agent?.name} agentId={pocket.agentId} face={FROZEN} k={k} w={width} h={h} state={state ?? "Revoked"} still />
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}
/** Memoised: its props are stable store values, so a new event or ask elsewhere leaves it alone. `focused` only matters to
 *  a card that is off (a freeze seen late plays on return), so a live card ignores it: leaving Home must not redraw the deck. */
export const PocketFace = React.memo(PocketFaceView, (a, b) =>
  a.pocket === b.pocket && a.width === b.width && a.tone === b.tone && a.buzz === b.buzz && a.shadow === b.shadow && a.tilt === b.tilt && a.still === b.still && a.draft === b.draft && glyphKey(a.glyph ?? null) === glyphKey(b.glyph ?? null) && a.peek === b.peek && a.job === b.job &&
  (a.focused === b.focused || !(b.pocket.revoked || !!b.pocket.frozen || isExpired(b.pocket))));

const R = 18;
/** The job line's height under the name (pt at full width). */
export const JOB_H = 18;
/** How much of the card's side shows under the face (pt). */
const EDGE = 4;

/** "Exp. 30/10", "Exp. 10/27" (month/year) past this year, or "Ends 23:59" on its last day. */
export const expiryText = (expiresAt: bigint | number) => {
  const d = new Date(Number(expiresAt) * 1000);
  if (d.toDateString() === new Date().toDateString()) return `Ends ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  // a card's own "MM/YY" once it runs past this year (an ongoing pocket lasts a year): "16/10" alone would read as today
  if (d.getFullYear() !== new Date().getFullYear()) return `Exp. ${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear() % 100).padStart(2, "0")}`;
  return `Exp. ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** The print, VaultBank's card anatomy: the pocket name, a stripe across the card carrying the holding agent on a white pill,
 *  the balance, the pocket's rules in one line, and the short pocket number big at the bottom with the expiry. */
function Print({ pocket, name, agent, agentId, face, k, w, h, state, still, draft, glyph, peek, job }: { pocket: Pocket; name: string; agent?: string; agentId?: string; face: DeckFace; k: number; w: number; h: number; state?: string; still?: boolean; draft?: boolean; glyph?: Glyph | null; peek?: boolean; job?: string }) {
  const ask = pocket.askAbove === NEVER || pocket.askAbove > pocket.cap ? "never asks" : pocket.askAbove === 0n ? "asks every time" : `asks above ${money(pocket.askAbove)}`;
  const tail = contractTail(pocket.address);
  const ink = state ? c.muted : face.ink;
  const sub = state ? c.muted : face.sub;
  const hatched = "hatch" in face && face.hatch;
  const dark = (face.ink as string) === "#FFFFFF";
  const pad = 16 * k + 4;
  return (
    <TextScaleCap max={1}>
    <View style={{ flex: 1, backgroundColor: face.face }}>
      {hatched ? <Hatch color={c.line} pitch={7} stroke={1.5} /> : null}
      {!still ? <CardMaterial width={w} height={h} dark={dark} /> : null}
      {/* top: the pocket's name, or its state */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: pad, paddingTop: pad - 2, height: pad + 26 * k + (job ? JOB_H * k : 0) }}>
        {job ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
            {agentId && peek ? <AgentAvatar kind={agentId} size={Math.max(16, Math.round(26 * k))} /> : null}
            <View style={{ flexShrink: 1 }}>
              <T v="head" numberOfLines={1} style={{ color: ink, fontSize: 17 * Math.max(k, 0.9) }}>{name}</T>
              {/* how often it spends, as a chip in its face's own dark tone, then what it does */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {!state ? (
                  <View style={{ height: 17, paddingHorizontal: 7, borderRadius: 9, backgroundColor: face.usage, justifyContent: "center", flexShrink: 0 }}>
                    <T v="tab" numberOfLines={1} style={{ color: c.white, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.2, textTransform: "none" }}>{usageChip(pocket.app)}</T>
                  </View>
                ) : null}
                <T v="cap" numberOfLines={1} style={{ color: sub, fontSize: 12 * Math.max(k, 0.9), flexShrink: 1 }}>{job}</T>
              </View>
            </View>
          </View>
        ) : <T v="head" numberOfLines={1} style={{ color: ink, flexShrink: 1, fontSize: 17 * Math.max(k, 0.9) }}>{name}</T>}
        {state ? (
          <View accessibilityLabel={state} style={{ minHeight: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: c.vermillionSoft, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="lock" size={12} color={c.vermillionInk} stroke={2.2} />
            <T v="tab" style={{ color: c.vermillionInk, textTransform: "uppercase", letterSpacing: 0.8 }}>{state}</T>
          </View>
        ) : glyph ? <CardGlyph g={glyph} face={face} /> : peek ? (
          <T v="row" w="bold" style={{ color: ink, fontVariant: ["tabular-nums"] }} accessibilityElementsHidden>{money(pocket.balance)}</T>
        ) : null}
      </View>
      {/* the stripe, with the agent that holds the pocket on a white pill */}
      <View style={{ marginTop: 8 * k, height: 36 * k + 4, backgroundColor: state ? c.ink2 : face.band, justifyContent: "center", paddingHorizontal: pad, overflow: "hidden" }}>
        {(face.band as string) === (face.face as string) || dark ? <Hatch color="#FFFFFF" pitch={6} stroke={1} opacity={0.12} /> : null}
        <View style={{ alignSelf: "flex-start", height: 24 * k + 2, paddingLeft: 3, paddingRight: 10, borderRadius: 999, backgroundColor: c.white, flexDirection: "row", alignItems: "center", gap: 6 }}>
          {agentId ? <AgentAvatar kind={agentId} size={Math.round(18 * k + 2)} /> : <View style={{ width: 6 }} />}
          <T v="cap" w="semi" numberOfLines={1} style={{ color: c.ink, fontSize: 12 * Math.max(k, 0.9) }}>{agent ? `${agent} · ${pocket.app ? LAYOUT_NAME[pocket.app.layout].toLowerCase() : "agent pocket"}` : "Your pocket"}</T>
        </View>
      </View>
      {/* the balance and the rules */}
      <View style={{ paddingHorizontal: pad, marginTop: 10 * k }}>
        {/* with the usage line on top there is no room for the label: the big number is the balance */}
        {!job || state ? <T v="tab" style={{ color: sub, textTransform: "uppercase", letterSpacing: 0.9 }}>{state ? "Left in the pocket" : "Available"}</T> : null}
        <Money v={k >= 0.9 ? "amount" : "section"} value={usd(pocket.balance)} color={state ? "muted" : dark ? "white" : "ink"} label={`${name} balance`} decorative />
      </View>
      <View style={{ flex: 1 }} />
      {/* bottom: the short pocket number, big, and the expiry */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: pad, paddingBottom: pad - 2 }}>
        <View>
          <T v="cap" style={{ color: sub, marginBottom: 2 }} numberOfLines={1}>{`Cap ${money(pocket.cap)} · ${ask}`}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <T v="mono" accessibilityLabel={draft ? "Not on-chain yet" : `Pocket contract ending ${pocket.address.slice(-4)}`} style={{ color: ink, fontSize: 20 * k, lineHeight: 26 * k, letterSpacing: 0.2, textTransform: "none", opacity: draft ? 0.45 : 1 }}>{draft ? "0x…····" : tail}</T>
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: face.chip }}>
              <T v="tab" style={{ color: sub, textTransform: "uppercase", letterSpacing: 0.8, fontSize: 9.5, lineHeight: 12 }}>{draft ? "Draft" : "Contract"}</T>
            </View>
          </View>
        </View>
        <T v="cap" w="semi" style={{ color: sub, marginBottom: 3 }}>{expiryText(pocket.expiresAt)}</T>
      </View>
    </View>
    </TextScaleCap>
  );
}

const hm = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
/** "08:00" today, "Tue 08:00" after. */
const when = (ms: number) => (new Date(ms).toDateString() === new Date().toDateString() ? hm(ms) : `${new Date(ms).toLocaleDateString("en-GB", { weekday: "short" })} ${hm(ms)}`);

/** The live sign in a card's top corner, on the card's own chip colour. Every figure is from the events (glyphOf). */
function CardGlyph({ g, face }: { g: Glyph; face: DeckFace }) {
  const ink = face.ink;
  const label = g.kind === "price" ? `Latest price ${money(g.price)}${g.below ? ", at or below your limit" : ""}`
    : g.kind === "next" ? `Next ${g.what} ${when(g.at)}` : g.kind === "running" ? `Run ${g.run} going on now` : g.kind === "paused" ? "Routine paused" : `Saved ${money(g.saved)}`;
  return (
    <View accessible accessibilityLabel={label} style={{ minHeight: 26, paddingLeft: 8, paddingRight: 9, borderRadius: 13, backgroundColor: face.chip, flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 }}>
      {g.kind === "price" ? <Spark series={g.series} limit={g.limit} color={ink} hot={g.below} /> : null}
      {g.kind === "next" ? <Icon name="clock" size={12} color={ink} stroke={2.2} /> : null}
      {g.kind === "paused" ? <Icon name="pause" size={12} color={ink} stroke={2.2} /> : null}
      {g.kind === "running" ? <Live /> : null}
      <T v="cap" w="semi" style={{ color: ink, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
        {g.kind === "price" ? money(g.price) : g.kind === "next" ? when(g.at) : g.kind === "running" ? `Run ${g.run}` : g.kind === "paused" ? "Paused" : `Saved ${money(g.saved)}`}
      </T>
    </View>
  );
}

/** The last quotes as a 40 x 14 line, the limit dashed under it, the newest point dotted (vermillion at or below the limit). */
function Spark({ series, limit, color, hot }: { series: bigint[]; limit?: bigint; color: string; hot: boolean }) {
  const W = 40, H = 14;
  const vals = series.map(Number);
  const all = limit != null ? [...vals, Number(limit)] : vals;
  const lo = Math.min(...all), hi = Math.max(...all);
  const y = (v: number) => (hi === lo ? H / 2 : 1.5 + (H - 3) * (1 - (v - lo) / (hi - lo)));
  const x = (i: number) => (vals.length < 2 ? W / 2 : 1.5 + ((W - 5) * i) / (vals.length - 1));
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = vals.length - 1;
  return (
    <Svg width={W} height={H}>
      {limit != null ? <Polyline points={`0,${y(Number(limit)).toFixed(1)} ${W},${y(Number(limit)).toFixed(1)}`} stroke={color} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="2,2" fill="none" /> : null}
      <Polyline points={pts} stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" fill="none" />
      {last >= 0 ? <Circle cx={x(last)} cy={y(vals[last])} r={2.4} fill={hot ? c.vermillion : color} stroke={hot ? c.white : "none"} strokeWidth={hot ? 1 : 0} /> : null}
    </Svg>
  );
}

/** A small dot that breathes while a run is going on (still under Reduce Motion). */
function Live() {
  const reduce = useReduceMotion();
  const o = useSharedValue(1);
  useEffect(() => { if (!reduce) o.value = withRepeat(withSequence(withTiming(0.35, { duration: 600 }), withTiming(1, { duration: 600 })), -1); }, [reduce, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.vermillion }, st]} />;
}
