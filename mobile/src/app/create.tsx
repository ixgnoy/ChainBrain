import React, { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { router, Stack } from "expo-router";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, type EntryExitAnimationFunction } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../store";
import { c, motion } from "../tokens";
import { BackHeader } from "../ui/BackHeader";
import { Avatar, Button, Card, Field, Press } from "../ui/kit";
import { Money } from "../ui/Money";
import { Reveal } from "../ui/Reveal";
import { SuccessMark, landingDip } from "../ui/SuccessMark";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { Slider } from "../ui/Slider";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { EASE_OUT, settle, useReduceMotion } from "../ui/motion";
import { txError } from "../components/ActionSheet";
import { TxLink } from "../components/TxLink";
import { worstCase } from "../lib/plain";
import { cleanText } from "../lib/sanitize";
import { PRESETS, toPocketArgs, expiryFor, type Lifetime, type PresetValues } from "../lib/presets";
import { styleForPreset } from "../lib/pocketNames";
import { parseUsd } from "../lib/shared";
import { money2, usd } from "../lib/util";
import { haptic } from "../haptics";

/** Sellers under their category (Research data, Food and drink), in the order the API lists them. */
export function groupSellers<S extends { category: string }>(list: S[]): [string, S[]][] {
  const m = new Map<string, S[]>();
  for (const s of list) m.set(s.category, [...(m.get(s.category) ?? []), s]);
  return [...m.entries()];
}
const STEPS = ["Start", "Funds", "Sellers", "How much", "When to ask me", "How long", "Review"] as const;
const FUND_PRESETS = [0.3, 1, 2, 5];
type AskMode = "always" | "above" | "never";
type Progress = { pocket?: `0x${string}`; funded?: boolean; createTx?: string; fundTx?: string };
const LIFETIMES: [Lifetime, string, string][] = [["one-task", "One task", "Ends in 24 hours. Made for a single purchase."], ["until-tonight", "Until tonight", "Ends at 23:59 your time."], ["ongoing", "Ongoing", "Runs for a year. You can revoke it any time."]];

// ---- step transition: new page slides in from the direction of travel (48 pt + fade, `smooth`), old one leaves 28 pt the other way (160 ms)
const slideIn = (dir: number, reduce: boolean): EntryExitAnimationFunction => () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ translateX: reduce ? 0 : dir * 48 }] },
    animations: { opacity: withTiming(1, { duration: motion.base, easing: EASE_OUT }), transform: [{ translateX: withSpring(0, motion.spring.smooth) }] },
  };
};
const slideOut = (dir: number, reduce: boolean): EntryExitAnimationFunction => () => {
  "worklet";
  return {
    initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
    animations: { opacity: withTiming(0, { duration: motion.exit, easing: EASE_OUT }), transform: [{ translateX: withTiming(reduce ? 0 : -dir * 28, { duration: motion.exit, easing: EASE_OUT }) }] },
  };
};

/** 7 segments; each fill scales in from the left on `smooth`, with a small wave so forward steps read as progress. */
function Segment({ on, delay }: { on: boolean; delay: number }) {
  const reduce = useReduceMotion();
  const f = useSharedValue(on ? 1 : 0);
  React.useEffect(() => { f.value = withDelay(reduce ? 0 : delay, reduce ? withTiming(on ? 1 : 0, { duration: 180 }) : withSpring(on ? 1 : 0, motion.spring.smooth)); }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0, f.value) }], opacity: Math.min(1, f.value * 4) }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.line, overflow: "hidden" }}>
      <Animated.View style={[{ flex: 1, backgroundColor: c.accent, borderRadius: 2, transformOrigin: "left" } as object, a]} />
    </View>
  );
}

/** Choice card: the fill and a 1.5 pt border fade to the selected state (`snappy`), the check pops in; press is 0.985 from kit. */
function Option({ on, title, sub, onPress }: { on: boolean; title: string; sub: string; onPress: () => void }) {
  const reduce = useReduceMotion();
  const sel = useSharedValue(on ? 1 : 0);
  React.useEffect(() => { settle(sel, on ? 1 : 0, reduce, motion.spring.snappy); }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  const box = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(sel.value, [0, 1], [c.card, c.accentSoft]), borderColor: interpolateColor(sel.value, [0, 1], ["rgba(0,114,127,0)", c.accent]) }));
  const tick = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, sel.value)), transform: [{ scale: reduce ? 1 : 0.6 + 0.4 * sel.value }] }));
  return (
    <Press kind="row" haptics="select" onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={title}>
      <Animated.View style={[{ padding: 16, borderRadius: 20, borderWidth: 1.5, gap: 2, flexDirection: "row", alignItems: "center" }, box]}>
        <View style={{ flex: 1, gap: 2 }}><T v="row" w="semi">{title}</T><T v="sub" color="ink2">{sub}</T></View>
        <Animated.View style={tick}><Icon name="check" size={20} color={c.accent} stroke={2.2} /></Animated.View>
      </Animated.View>
    </Press>
  );
}

/** Filter chip whose fill cross-fades grey/teal when it is picked. */
function PickChip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const reduce = useReduceMotion();
  const sel = useSharedValue(on ? 1 : 0);
  React.useEffect(() => { settle(sel, on ? 1 : 0, reduce, motion.spring.snappy); }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  const box = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(sel.value, [0, 1], [c.card, c.accent]) }));
  const txt = useAnimatedStyle(() => ({ color: interpolateColor(sel.value, [0, 1], [c.ink2, c.onAccent]) }));
  return (
    <Press haptics="select" onPress={onPress} scale={0.96} accessibilityRole="button" accessibilityState={{ selected: !!on }} style={{ borderRadius: 9999 }}>
      <Animated.View style={[{ height: 40, paddingHorizontal: 16, borderRadius: 9999, justifyContent: "center" }, box]}>
        <Animated.Text style={[{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, lineHeight: 20 }, txt]}>{label}</Animated.Text>
      </Animated.View>
    </Press>
  );
}

const BigNumber = ({ value, suffix }: { value: string; suffix?: string }) => (
  <View style={{ alignItems: "center", gap: 4, paddingVertical: 8 }}><Money v="balance" value={value} />{suffix ? <T v="sub" color="muted">{suffix}</T> : null}</View>
);
const Title = ({ h, sub }: { h: string; sub: string }) => (
  <View style={{ gap: 6 }}><T v="section" accessibilityRole="header">{h}</T><T v="body" color="ink2">{sub}</T></View>
);

/** Success: the card rises, the mark draws, the budget rolls in, the two hashes fade up. The first pocket ever gets one soft ring. */
function Done({ name, budget, createTx, fundTx, first, onOpen }: { name: string; budget: string; createTx?: string; fundTx?: string; first: boolean; onOpen: () => void }) {
  const reduce = useReduceMotion();
  const rise = useSharedValue(0);
  const dip = useSharedValue(1);
  const ring = useSharedValue(0);
  React.useEffect(() => {
    rise.value = reduce ? withTiming(1, { duration: 180 }) : withSpring(1, motion.spring.snappy);
    const t = setTimeout(() => landingDip(dip, reduce), 380);
    if (first && !reduce) ring.value = withDelay(300, withTiming(1, { duration: 1000, easing: EASE_OUT }));
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const bg = useAnimatedStyle(() => ({ opacity: Math.min(1, rise.value * 3) }));
  const card = useAnimatedStyle(() => ({ opacity: Math.min(1, rise.value * 2), transform: [{ translateY: reduce ? 0 : (1 - rise.value) * (first ? 32 : 16) }, { scale: dip.value }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 1.1 }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 20, backgroundColor: c.canvas, justifyContent: "center", padding: 20 }, bg]}>
      <Animated.View style={card}>
        <Card pad={24} style={{ alignItems: "center", gap: 14 }}>
          <View style={{ width: 72, height: 72, alignItems: "center", justifyContent: "center" }}>
            {first ? <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 72, height: 72, borderRadius: 36, backgroundColor: c.accentSoft }, halo]} /> : null}
            <SuccessMark size={72} delay={120} />
          </View>
          <T v="section" accessibilityRole="header">Pocket created</T>
          <View style={{ alignItems: "center", gap: 2 }}>
            <T v="sub" color="muted">{name} now holds</T>
            <Money v="balance" value={budget} countIn />
          </View>
          <View style={{ alignSelf: "stretch", gap: 6 }}>
            {([["Create pocket", createTx], ["Add US$" + budget, fundTx]] as const).map(([l, h], i) => h ? (
              <Reveal key={l} index={i} step={90} base={620} dy={8}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.canvas, borderRadius: 14, paddingLeft: 14, paddingRight: 8 }}>
                  <T v="sub" color="muted">{l}</T><TxLink tx={h} />
                </View>
              </Reveal>
            ) : null)}
          </View>
          <Reveal index={2} step={90} base={620} dy={8} style={{ alignSelf: "stretch" }}><Button label="Open pocket" onPress={onOpen} /></Reveal>
        </Card>
      </Animated.View>
    </Animated.View>
  );
}

export default function Create() {
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { cfg, wallet, addPocket, balances, refreshPockets, recordTx, setNotice, pockets } = useApp();
  const first = useRef(pockets.length === 0); // the first pocket ever gets the one celebration
  const dir = useRef(1);
  const left = useRef(false);
  const [fin, setFin] = useState<{ createTx?: string; fundTx?: string; id?: string }>({});
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState<string>("research");
  const [name, setName] = useState<string>(PRESETS.research.label);
  const [funds, setFunds] = useState(5);
  const [cap, setCap] = useState(2);
  const [askMode, setAskMode] = useState<AskMode>("above");
  const [ask, setAsk] = useState(1);
  const [sellers, setSellers] = useState<string[]>(["datalite", "datapro"]);
  const [life, setLife] = useState<Lifetime>("until-tonight");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "create" | "fund" | "done">("idle");
  const progress = useRef<Progress>({});
  const done = useRef<{ createTx?: string; fundTx?: string }>({});

  const choose = (key: keyof typeof PRESETS | "custom") => {
    haptic.select(); setPreset(key);
    if (key === "custom") { setName("Custom pocket"); return; }
    const p = PRESETS[key];
    setName(p.label); setFunds(Number(p.budget)); setCap(Number(p.cap)); setSellers(p.sellers); setLife(p.lifetime);
    if (p.askAbove === "never") setAskMode("never"); else if (p.askAbove === "0") setAskMode("always"); else { setAskMode("above"); setAsk(Number(p.askAbove)); }
  };
  const capMax = Math.max(0.05, Math.min(funds, 5));
  const capV = Math.min(cap, capMax);
  const askV = Math.min(ask, capV);
  const values: PresetValues = { label: cleanText(name.trim() || "Pocket", 24), budget: money2(funds), sellers, cap: money2(capV), askAbove: askMode === "never" ? "never" : askMode === "always" ? "0" : money2(askV), lifetime: life };
  const payTo = useMemo(() => Object.fromEntries((cfg?.sellers ?? []).map((s) => [s.id, s.payTo])), [cfg]);
  const style = preset === "custom" ? "custom" : styleForPreset(values.label);

  const canNext = step === 0 ? name.trim().length > 0 : step === 2 ? sellers.length > 0 : true;
  const go = (n: number) => { const t = Math.max(0, Math.min(STEPS.length - 1, n)); dir.current = t >= step ? 1 : -1; haptic.select(); setStep(t); };
  const open = (id?: string) => { if (left.current || !id) return; left.current = true; router.replace({ pathname: "/pocket/[id]", params: { id } }); };
  const tonightPassed = life === "until-tonight" && Number(expiryFor(life)) * 1000 < Date.now();

  const create = async () => {
    setError(null);
    try {
      if (!wallet || !cfg) throw new Error("not connected");
      const a = toPocketArgs(values, cfg.agent, payTo);
      const prog = progress.current;
      if (!prog.pocket) {
        setStage("create");
        const made = await wallet.createPocket(a);
        prog.pocket = made.pocket; prog.createTx = made.tx;
        recordTx({ kind: "create", pocket: made.pocket, hash: made.tx, });
        // saved at once: even if funding fails the pocket is never lost, and Fund on Home resumes it
        await addPocket(prog.pocket, { name: values.label, style: style as any });
      }
      if (!prog.funded) {
        setStage("fund");
        const f = await wallet.fund(prog.pocket, a.budget); prog.funded = true; prog.fundTx = f.hash;
        recordTx({ kind: "fund", pocket: prog.pocket, hash: f.hash, amount: a.budget.toString() });
        await refreshPockets();
      }
      const id = prog.pocket;
      setFin({ createTx: prog.createTx, fundTx: prog.fundTx, id });
      setStage("done");
      setNotice({ title: `${values.label} created and funded`, pocket: id, txs: [{ label: "Create pocket", hash: prog.createTx! }, { label: `Add US$${values.budget}`, hash: prog.fundTx! }] });
      done.current = { createTx: prog.createTx, fundTx: prog.fundTx };
      progress.current = {};
      setTimeout(() => open(id), first.current ? 2600 : 2200);
    } catch (e) {
      setStage("idle");
      setError(txError(e));
      throw e;
    }
  };

  const toggle = (id: string) => { haptic.select(); setSellers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); };
  const askLabel = askMode === "always" ? "Every payment" : askMode === "never" ? "Never" : `Above US$${money2(askV)}`;

  const page = (() => {
    switch (step) {
      case 0: return (
        <View style={{ gap: 20 }}>
          <Title h="What is it for?" sub="Pick a starting point. You can change every setting on the next pages." />
          <View style={{ gap: 10 }}>
            {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => {
              const p = PRESETS[k];
              return <Option key={k} on={preset === k} onPress={() => choose(k)} title={p.label} sub={`US$${p.budget} budget · up to US$${p.cap} each · ${p.askAbove === "never" ? "never asks" : p.askAbove === "0" ? "asks every time" : `asks above US$${p.askAbove}`}`} />;
            })}
            <Option on={preset === "custom"} onPress={() => choose("custom")} title="Custom" sub="Set every limit yourself." />
          </View>
          <Field label="Name (kept on this phone)" value={name} onChangeText={(t) => setName(t.slice(0, 24))} placeholder="Pocket name" accessibilityLabel="Pocket name" />
        </View>);
      case 1: return (
        <View style={{ gap: 20 }}>
          <Title h="How much goes in?" sub="This is the agent's whole budget. When it is gone, the agent stops." />
          <BigNumber value={money2(funds)} />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>{FUND_PRESETS.map((v) => <PickChip key={v} on={funds === v} label={`US$${money2(v)}`} onPress={() => setFunds(v)} />)}</View>
          <Slider min={0.05} max={10} step={0.05} value={funds} onChange={setFunds} />
          {balances && <T v="cap" color="muted" style={{ textAlign: "center" }}>Main wallet: US${usd(balances.usdc)}{balances.usdc < parseUsd(money2(funds)) ? ". Not enough for this budget." : ""}</T>}
        </View>);
      case 2: return (
        <View style={{ gap: 16 }}>
          <Title h="Who can it pay?" sub="Only these sellers can be paid from the pocket. Anyone else is refused." />
          {(cfg?.sellers ?? []).length === 0 && <T v="sub" color="muted">Sellers did not load. Check the connection.</T>}
          {groupSellers(cfg?.sellers ?? []).map(([cat, list]) => (
            <View key={cat} style={{ gap: 10 }}>
              <T v="sub" w="semi" color="muted" accessibilityRole="header" style={{ marginTop: 6 }}>{cleanText(cat, 30)}</T>
              {list.map((s) => (
                <Option key={s.id} on={sellers.includes(s.id)} onPress={() => toggle(s.id)} title={cleanText(s.name, 40)} sub={s.items.map((i) => (i.price ? `US$${cleanText(i.price, 8)}` : "free")).join(", ")} />
              ))}
            </View>
          ))}
        </View>);
      case 3: return (
        <View style={{ gap: 20 }}>
          <Title h="Biggest single payment" sub={`The budget is US$${money2(funds)}. This caps each payment so one mistake cannot take it all.`} />
          <BigNumber value={money2(capV)} suffix="per payment" />
          <Slider min={0.05} max={capMax} step={0.05} value={capV} onChange={(v) => { setCap(v); if (ask > v) setAsk(v); }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T v="cap" color="muted">US$0.05</T><T v="cap" color="muted">US${money2(capMax)}</T></View>
        </View>);
      case 4: return (
        <View style={{ gap: 20 }}>
          <Title h="When should it ask you?" sub="Payments up to this amount go through on their own. Above it, your agent waits for your OK." />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {([["always", "Every time"], ["above", "Above an amount"], ["never", "Never"]] as const).map(([k, l]) => <PickChip key={k} label={l} on={askMode === k} onPress={() => setAskMode(k)} />)}
          </View>
          {askMode === "above" && (<><BigNumber value={money2(askV)} /><Slider min={0.05} max={capV} step={0.05} value={askV} onChange={setAsk} /></>)}
          <T v="sub" color="ink2">{askMode === "always" ? "You approve every payment." : askMode === "never" ? "The agent never asks. It spends freely up to the cap." : `Up to US$${money2(askV)} it pays alone. Above that, up to US$${money2(capV)}, it asks you.`}</T>
        </View>);
      case 5: return (
        <View style={{ gap: 14 }}>
          <Title h="How long does it last?" sub="After this, the pocket ends and the agent cannot spend." />
          {LIFETIMES.map(([k, h, sub]) => <Option key={k} on={life === k} onPress={() => setLife(k)} title={h} sub={sub} />)}
          {tonightPassed && <T v="sub" color="warning">It is already past 23:59, so this would end immediately. Pick another.</T>}
        </View>);
      default: return (
        <View style={{ gap: 16 }}>
          <Title h="Looks right?" sub="Two steps signed on this phone: create the pocket, then add the money. The agent gets exactly these limits." />
          <Card pad={4} style={{ paddingHorizontal: 16 }}>
            {[["Name", values.label], ["Money in", `US$${values.budget}`], ["Sellers", sellers.map((s) => cleanText(cfg?.sellers.find((x) => x.id === s)?.name ?? s, 24)).join(", ")], ["Per payment", `up to US$${values.cap}`], ["Asks you", askLabel], ["Ends", new Date(Number(expiryFor(life)) * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })]].map(([k, v], i, all) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 14, borderBottomWidth: i < all.length - 1 ? 1 : 0, borderBottomColor: c.line }}><T v="sub" color="muted">{k}</T><T v="sub" w="medium" style={{ flexShrink: 1, textAlign: "right" }}>{v}</T></View>
            ))}
          </Card>
          {stage !== "idle" || progress.current.pocket || done.current.createTx ? (
            <Card style={{ gap: 10 }}>
              {([["create", "1. Create the pocket", !!progress.current.pocket || !!done.current.createTx, progress.current.createTx ?? done.current.createTx], ["fund", "2. Add the money", !!progress.current.funded || !!done.current.fundTx, progress.current.fundTx ?? done.current.fundTx]] as const).map(([k, l, ok, hash]) => (
                <View key={k} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: ok ? c.accent : c.fill, alignItems: "center", justifyContent: "center" }}>{ok && <Icon name="check" size={13} color={c.onAccent} stroke={2.6} />}</View>
                    <T v="sub" color={ok || stage === k ? "ink" : "muted"}>{l}{stage === k ? "…" : ""}</T>
                  </View>
                  {hash ? <View style={{ marginLeft: 32, alignItems: "flex-start" }}><TxLink tx={hash} /></View> : null}
                </View>
              ))}
            </Card>
          ) : null}
          {error && <T v="sub" color="negative">{error}{progress.current.pocket ? " The pocket exists, so sliding again only retries the missing step." : ""}</T>}
        </View>);
    }
  })();

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <BackHeader title="New pocket" sub={`Step ${step + 1} of ${STEPS.length}`} close onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      <Stack.Screen options={{ gestureEnabled: stage === "idle" }} />
      <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 20, marginVertical: 12 }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}>
        {STEPS.map((s, i) => <Segment key={s} on={i <= step} delay={Math.abs(i - step) * 30} />)}
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, gap: 22 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={slideIn(dir.current, reduce)} exiting={slideOut(dir.current, reduce)}>{page}</Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 12, gap: 6, backgroundColor: c.canvas }}>
        {step > 0 ? (
          // the product's one sentence, live: every choice above changes what a hijacked agent could lose
          <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, marginBottom: 6, borderRadius: 16, backgroundColor: c.accentSoft }}>
            <Icon name="shield" size={16} color={c.accent} />
            <T v="cap" color="ink2" style={{ flex: 1 }}>{worstCase(parseUsd(money2(funds)), sellers.map((id) => cleanText(cfg?.sellers.find((x) => x.id === id)?.name ?? id, 24)))}</T>
          </View>
        ) : null}
        {step === STEPS.length - 1 ? (
          <SlideToConfirm key={String(error)} label={progress.current.pocket ? "Slide to retry" : "Slide to create and fund"} doneLabel="Pocket created" onConfirm={create} disabled={!wallet || !cfg || tonightPassed} />
        ) : (
          <Button label="Continue" onPress={() => go(step + 1)} disabled={!canNext} />
        )}
        {step > 0 && <Button label="Back" kind="text" onPress={() => go(step - 1)} small />}
      </View>
      {stage === "done" ? <Done name={values.label} budget={values.budget} createTx={fin.createTx} fundTx={fin.fundTx} first={first.current} onOpen={() => open(fin.id)} /> : null}
    </View>
  );
}
