// Create pocket wizard: preset or custom, one setting per page, live preview card, slide to create. Real chain path:
// PocketFactory.create then USDC.transfer to fund, with step progress. A failed attempt resumes (never creates or funds twice).
import React, { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Input } from "../components/ui/input";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, F } from "../theme";
import { useApp } from "../store";
import { BackHeader } from "../ui/BackHeader";
import { Button, DevBadge, Press, Segmented } from "../ui/primitives";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { Slider } from "../ui/Slider";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { useReduceMotion } from "../ui/motion";
import { PocketCard, AuthorityMeter } from "../components/PocketCard";
import { txError } from "../components/ActionSheet";
import { cleanText } from "../lib/sanitize";
import { PRESETS, toPocketArgs, expiryFor, type Lifetime, type PresetValues } from "../lib/presets";
import { styleForPreset } from "../lib/pocketNames";
import { NEVER, parseUsd } from "../lib/shared";
import { money2, usd } from "../lib/util";
import { haptic } from "../haptics";
import { radius } from "../tokens";

const STEPS = ["Start", "Funds", "Sellers", "How much", "When to ask me", "How long", "Review"] as const;
const FUND_PRESETS = [0.3, 1, 2, 5];
type AskMode = "always" | "above" | "never";
type Progress = { pocket?: `0x${string}`; funded?: boolean };
const LIFETIMES: [Lifetime, string, string][] = [["one-task", "One task", "Expires in 24 hours. Made for a single purchase."], ["until-tonight", "Until tonight", "Expires at 23:59 your time. If it is later, pick another."], ["ongoing", "Ongoing", "Runs for a year. Revoke any time."]];

export default function Create() {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { cfg, wallet, addPocket, dev, balances } = useApp();
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
  const preview = { name: values.label, style: preset === "custom" ? "custom" : styleForPreset(values.label), balance: parseUsd(values.budget), cap: parseUsd(values.cap), askAbove: askMode === "never" ? NEVER : parseUsd(values.askAbove), expiresAt: expiryFor(life), revoked: false, owned: true, sellers: sellers.length };

  const canNext = step === 0 ? name.trim().length > 0 : step === 2 ? sellers.length > 0 : true;
  const go = (n: number) => { haptic.select(); setStep(Math.max(0, Math.min(STEPS.length - 1, n))); };
  const tonightPassed = life === "until-tonight" && Number(expiryFor(life)) * 1000 < Date.now();

  const create = async () => {
    setError(null);
    try {
      if (!wallet || !cfg) throw new Error("not connected");
      const a = toPocketArgs(values, cfg.agent, payTo);
      const prog = progress.current;
      if (!prog.pocket) {
        setStage("create");
        prog.pocket = (await wallet.createPocket(a)).pocket;
        // saved at once: even if funding fails the pocket is never lost, and Fund on Home resumes it
        await addPocket(prog.pocket, { name: values.label, style: preview.style as any });
      }
      if (!prog.funded) { setStage("fund"); await wallet.fund(prog.pocket, a.budget); prog.funded = true; }
      setStage("done");
      const id = prog.pocket;
      progress.current = {};
      setTimeout(() => router.replace({ pathname: "/pocket/[id]", params: { id } }), 900);
    } catch (e) {
      setStage("idle");
      setError(txError(e));
      throw e;
    }
  };

  const toggle = (id: string) => { haptic.select(); setSellers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); };
  const Pill = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
    <Press haptics="none" onPress={onPress} scale={0.96} style={{ height: 44, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center", backgroundColor: on ? c.accent : c.bgElev2, borderWidth: 1, borderColor: on ? c.accent : c.hairlineStrong }}>
      <T v="bodySm" weight="semi" color={on ? "onAccent" : "text"}>{label}</T>
    </Press>
  );
  const BigNumber = ({ value, suffix = "USDC" }: { value: string; suffix?: string }) => (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}><T v="displayXl" num>{value}</T><T v="body" weight="semi" color="text2">{suffix}</T></View>
  );
  const Title = ({ k, h, sub }: { k: string; h: string; sub: string }) => (
    <View style={{ gap: 6 }}><T v="caption" color="accentInk" style={{ letterSpacing: 0.5 }}>{k.toUpperCase()}</T><T v="headingLg">{h}</T><T v="bodySm" color="text2">{sub}</T></View>
  );
  const askLabel = askMode === "always" ? "every payment" : askMode === "never" ? "never" : `above ${money2(askV)}`;

  const page = (() => {
    switch (step) {
      case 0: return (
        <View style={{ gap: 16 }}>
          <Title k="Start" h="What is it for?" sub="Pick a starting point. You can change every setting on the next pages." />
          <View style={{ gap: 10 }}>
            {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => {
              const p = PRESETS[k]; const on = preset === k;
              return (
                <Press key={k} haptics="none" onPress={() => choose(k)} style={{ padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: on ? c.accent : c.hairline, backgroundColor: on ? c.accentSoft : c.bgElev1, gap: 3 }}>
                  <T v="title">{p.label}</T>
                  <T v="bodySm" color="text2">US${p.budget} budget · up to US${p.cap} each · {p.askAbove === "never" ? "never asks" : p.askAbove === "0" ? "asks every time" : `asks above US$${p.askAbove}`}</T>
                </Press>
              );
            })}
            <Press haptics="none" onPress={() => choose("custom")} style={{ padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: preset === "custom" ? c.accent : c.hairline, backgroundColor: preset === "custom" ? c.accentSoft : c.bgElev1, gap: 3 }}>
              <T v="title">Custom</T><T v="bodySm" color="text2">Set every limit yourself.</T>
            </Press>
          </View>
          <View style={{ gap: 8 }}>
            <T v="caption" color="text3">NAME (KEPT ON THIS PHONE)</T>
            <Input value={name} onChangeText={(t) => setName(t.slice(0, 24))} placeholder="Pocket name" accessibilityLabel="Pocket name" className="font-semibold" />
          </View>
        </View>);
      case 1: return (
        <View style={{ gap: 18 }}>
          <Title k="Funds" h="How much goes in?" sub="The balance is the agent's whole budget. When it is gone, the agent stops." />
          <BigNumber value={money2(funds)} />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{FUND_PRESETS.map((v) => <Pill key={v} on={funds === v} label={money2(v)} onPress={() => { haptic.select(); setFunds(v); }} />)}</View>
          <Slider min={0.05} max={10} step={0.05} value={funds} onChange={setFunds} />
          {balances && <T v="caption" color="text3">Main wallet: {usd(balances.usdc)} USDC{balances.usdc < parseUsd(money2(funds)) ? ". Not enough for this budget." : ""}</T>}
        </View>);
      case 2: return (
        <View style={{ gap: 14 }}>
          <Title k="Sellers" h="Who can it pay?" sub="Only these sellers can be paid from the pocket. Anything else is refused on chain." />
          {(cfg?.sellers ?? []).length === 0 && <T v="bodySm" color="text3">Seller directory not loaded. Check the connection.</T>}
          {(cfg?.sellers ?? []).map((s) => {
            const on = sellers.includes(s.id);
            return (
              <Press key={s.id} haptics="none" onPress={() => toggle(s.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: on ? c.accent : c.hairline, backgroundColor: on ? c.accentSoft : c.bgElev1 }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <T v="bodySm" weight="semi">{cleanText(s.name, 40)}</T>
                  <T v="caption" color="text3">{cleanText(s.category, 30)} · {s.items.map((i) => (i.price ? `US$${cleanText(i.price, 8)}` : "free")).join(", ")}</T>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: on ? c.accent : c.hairlineStrong, backgroundColor: on ? c.accent : "transparent", alignItems: "center", justifyContent: "center" }}>{on && <Icon name="check" size={14} color={c.onAccent} stroke={2.6} />}</View>
              </Press>
            );
          })}
        </View>);
      case 3: return (
        <View style={{ gap: 18 }}>
          <Title k="How much" h="Biggest single payment" sub={`The budget is the balance (${money2(funds)} USDC). This caps each payment so one mistake cannot take it all.`} />
          <BigNumber value={money2(capV)} suffix="USDC per payment" />
          <Slider min={0.05} max={capMax} step={0.05} value={capV} onChange={(v) => { setCap(v); if (ask > v) setAsk(v); }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T v="caption" color="text3">0.05</T><T v="caption" color="text3">{money2(capMax)}</T></View>
        </View>);
      case 4: return (
        <View style={{ gap: 18 }}>
          <Title k="When to ask me" h="Ask me above..." sub="Payments up to this amount go through on their own. Above it, your agent waits and you co-sign." />
          <Segmented options={[{ key: "always", label: "Always" }, { key: "above", label: "Above…" }, { key: "never", label: "Never" }]} value={askMode} onChange={(m) => setAskMode(m)} />
          {askMode === "above" && (<><BigNumber value={money2(askV)} /><Slider min={0.05} max={capV} step={0.05} value={askV} onChange={setAsk} accent={c.stepup} /></>)}
          <View style={{ gap: 8 }}>
            <View style={{ height: 6 }}><AuthorityMeter cap={preview.cap} askAbove={preview.askAbove} /></View>
            <T v="bodySm" color="text2">{askMode === "always" ? "You approve every payment." : askMode === "never" ? "The agent never asks. It spends freely up to the cap." : `Up to ${money2(askV)} it pays alone. Above that, up to ${money2(capV)}, it asks you.`}</T>
          </View>
        </View>);
      case 5: return (
        <View style={{ gap: 14 }}>
          <Title k="How long" h="How long does it last?" sub="After this, the pocket expires and the agent cannot spend." />
          {LIFETIMES.map(([k, h, s]) => (
            <Press key={k} haptics="select" onPress={() => setLife(k)} style={{ padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: life === k ? c.accent : c.hairline, backgroundColor: life === k ? c.accentSoft : c.bgElev1, gap: 4 }}>
              <T v="title">{h}</T><T v="bodySm" color="text2">{s}</T>
            </Press>
          ))}
          {tonightPassed && <T v="bodySm" color="stepup">It is already past 23:59, so this would expire immediately. Pick another.</T>}
        </View>);
      default: return (
        <View style={{ gap: 14 }}>
          <Title k="Review" h="Looks right?" sub="Two transactions signed on this phone: create the pocket, then fund it. The agent gets exactly these limits." />
          {[["Name", values.label], ["Funds", `${values.budget} USDC`], ["Sellers", sellers.map((s) => cleanText(cfg?.sellers.find((x) => x.id === s)?.name ?? s, 24)).join(", ")], ["Per payment", `up to ${values.cap}`], ["Ask me", askLabel], ["Until", new Date(Number(expiryFor(life)) * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })]].map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 4 }}><T v="bodySm" color="text2">{k}</T><T v="bodySm" weight="semi" style={{ flexShrink: 1, textAlign: "right" }}>{v}</T></View>
          ))}
          {stage !== "idle" || progress.current.pocket ? (
            <View style={{ gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: c.bgElev1, borderWidth: 1, borderColor: c.hairline }}>
              {([["create", "1. Create the pocket", !!progress.current.pocket], ["fund", "2. Fund it", !!progress.current.funded]] as const).map(([k, l, done]) => (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: done ? c.ok : stage === k ? c.accent : c.hairlineStrong, backgroundColor: done ? c.ok : "transparent", alignItems: "center", justifyContent: "center" }}>{done && <Icon name="check" size={12} color={c.onAccent} stroke={2.6} />}</View>
                  <T v="bodySm" color={done || stage === k ? "text" : "text3"}>{l}{stage === k ? "…" : ""}</T>
                </View>
              ))}
            </View>
          ) : null}
          {error && <T v="bodySm" color="refused">{error}{progress.current.pocket ? " The pocket exists, so sliding again only retries the missing step." : ""}</T>}
        </View>);
    }
  })();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackHeader title={`New pocket · ${step + 1} of ${STEPS.length}`} close onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))} right={dev ? <DevBadge /> : undefined} />
      <View style={{ flexDirection: "row", gap: 5, paddingHorizontal: 20, marginBottom: 10 }}>
        {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? c.accent : c.bgElev3 }} />)}
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center" }}><PocketCard pocket={preview} /></View>
        <Animated.View key={step} entering={reduce ? undefined : FadeInRight.duration(220)} exiting={reduce ? undefined : FadeOutLeft.duration(120)}>{page}</Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 12, gap: 10, borderTopWidth: 1, borderTopColor: c.hairline, backgroundColor: c.bg }}>
        {step === STEPS.length - 1 ? (
          <SlideToConfirm key={String(error)} label={progress.current.pocket ? "Slide to retry" : "Slide to create and fund"} doneLabel="Pocket created" onConfirm={create} disabled={!wallet || !cfg || tonightPassed} />
        ) : (
          <Button label="Continue" onPress={() => go(step + 1)} disabled={!canNext} />
        )}
        {step > 0 && <Button label="Back" kind="ghost" onPress={() => go(step - 1)} small />}
      </View>
    </View>
  );
}
