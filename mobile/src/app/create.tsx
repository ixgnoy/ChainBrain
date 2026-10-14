import React, { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../store";
import { c } from "../tokens";
import { BackHeader } from "../ui/BackHeader";
import { Avatar, Button, Card, Chip, Field, Press } from "../ui/kit";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { Slider } from "../ui/Slider";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { useReduceMotion } from "../ui/motion";
import { txError } from "../components/ActionSheet";
import { TxLink } from "../components/TxLink";
import { cleanText } from "../lib/sanitize";
import { PRESETS, toPocketArgs, expiryFor, type Lifetime, type PresetValues } from "../lib/presets";
import { styleForPreset } from "../lib/pocketNames";
import { parseUsd } from "../lib/shared";
import { money2, usd } from "../lib/util";
import { notify, DEMO_MSG } from "../lib/toast";
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

export default function Create() {
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { cfg, wallet, addPocket, balances, demo, refreshPockets, recordTx, setNotice } = useApp();
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
  const go = (n: number) => { haptic.select(); setStep(Math.max(0, Math.min(STEPS.length - 1, n))); };
  const tonightPassed = life === "until-tonight" && Number(expiryFor(life)) * 1000 < Date.now();

  const create = async () => {
    setError(null);
    if (demo) { notify(DEMO_MSG); throw new Error("demo"); }
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
      setStage("done");
      const id = prog.pocket;
      setNotice({ title: `${values.label} created and funded`, pocket: id, txs: [{ label: "Create pocket", hash: prog.createTx! }, { label: `Add US$${values.budget}`, hash: prog.fundTx! }] });
      done.current = { createTx: prog.createTx, fundTx: prog.fundTx };
      progress.current = {};
      setTimeout(() => router.replace({ pathname: "/pocket/[id]", params: { id } }), 900);
    } catch (e) {
      setStage("idle");
      setError(txError(e));
      throw e;
    }
  };

  const toggle = (id: string) => { haptic.select(); setSellers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); };
  const BigNumber = ({ value, suffix }: { value: string; suffix?: string }) => (
    <View style={{ alignItems: "center", gap: 4, paddingVertical: 8 }}><T v="balance">US${value}</T>{suffix ? <T v="sub" color="muted">{suffix}</T> : null}</View>
  );
  const Title = ({ h, sub }: { h: string; sub: string }) => (
    <View style={{ gap: 6 }}><T v="section" accessibilityRole="header">{h}</T><T v="body" color="ink2">{sub}</T></View>
  );
  const Option = ({ on, title, sub, onPress }: { on: boolean; title: string; sub: string; onPress: () => void }) => (
    <Press haptics="select" onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={title} style={{ padding: 16, borderRadius: 20, backgroundColor: on ? c.accentSoft : c.card, gap: 2, flexDirection: "row", alignItems: "center" }}>
      <View style={{ flex: 1, gap: 2 }}><T v="row" w="semi">{title}</T><T v="sub" color="ink2">{sub}</T></View>
      {on ? <Icon name="check" size={20} color={c.accent} stroke={2.2} /> : null}
    </Press>
  );
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
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>{FUND_PRESETS.map((v) => <Chip key={v} on={funds === v} label={`US$${money2(v)}`} onPress={() => setFunds(v)} />)}</View>
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
            {([["always", "Always"], ["above", "Above an amount"], ["never", "Never"]] as const).map(([k, l]) => <Chip key={k} label={l} on={askMode === k} onPress={() => setAskMode(k)} />)}
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
      <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 20, marginVertical: 12 }}>
        {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? c.accent : c.line }} />)}
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, gap: 22 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={reduce ? undefined : FadeInRight.duration(200)} exiting={reduce ? undefined : FadeOutLeft.duration(120)}>{page}</Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 12, gap: 6, backgroundColor: c.canvas }}>
        {step === STEPS.length - 1 ? (
          <SlideToConfirm key={String(error)} label={progress.current.pocket ? "Slide to retry" : "Slide to create and fund"} doneLabel="Pocket created" onConfirm={create} disabled={!wallet || !cfg || tonightPassed} />
        ) : (
          <Button label="Continue" onPress={() => go(step + 1)} disabled={!canNext} />
        )}
        {step > 0 && <Button label="Back" kind="text" onPress={() => go(step - 1)} small />}
      </View>
    </View>
  );
}
