// New pocket app: the owner says one sentence; ChainBrain reads the rules from it (Speak your rules: two readings on a server,
// the fixed reader here), computes the proof card, and composes the pocket's app from the fixed block catalogue (the picker
// here; Claude on a server, validated, falling back to the picker). Then the app builds itself in front of the owner: the
// card takes its job's face and its agent's mark, the blocks fly up into place, the budget meter fills. A slide and Face ID
// sign it; the pocket is created and funded on-chain, its routine stored as typed fields, and the card flies into its app.
// Nothing here is written by the AI: the spec only names blocks, every figure is computed.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, ScrollView, View } from "react-native";
import { router } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Address } from "viem";
import { useApp, type Pocket } from "../store";
import { c, deck, motion, radius } from "../tokens";
import { BackHeader } from "../ui/BackHeader";
import { Button, Card, Field, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { SuccessMark } from "../ui/SuccessMark";
import { useSettled } from "../ui/Reveal";
import { EASE_OUT, useReduceMotion } from "../ui/motion";
import { useAutoplayTarget, autoplayRun, autoplayAlive, typeOut } from "../lib/autoplayTargets";
import { biometricKind, confirmOwner } from "../lib/biometric";
import * as api from "../lib/api";
import { cleanText } from "../lib/sanitize";
import { expiryFor } from "../lib/presets";
import { NEVER, parseUsd } from "../lib/shared";
import { haptic } from "../haptics";
import { PocketFace, cardHeight, toneFor } from "../components/PocketFace";
import { SellerMark } from "../ui/SellerMark";
import { PAGE_MARGIN, pageCardWidth } from "../components/CardFlight";
import { txError } from "../components/ActionSheet";
import { AppHeader, PocketApp, type AppCtx } from "../components/app/PocketApp";
import { Understood } from "../components/app/Understood";
import { FACE, LAYOUT_NAME, agentName } from "../components/app/theme";
import { Hatch } from "../ui/Hatch";
import { AgentAvatar } from "../ui/AgentAvatar";
import { startFlight } from "../ui/cardFlight";
import { uniqueName } from "./create";
import { answer, proof, type Draft } from "../../../shared/sim/speak";
import { AGENTS, CAN, CANNOT } from "../../../shared/sim/agents";
import { BLOCK_TYPES, type Layout } from "../../../shared/sim/pocketApp";

type Composed = Awaited<ReturnType<typeof api.composeApp>>;
const EXAMPLES: { icon: IconName; label: string; text: string; layout: Layout; agent: string }[] = [
  { icon: "file", label: "Morning brief", layout: "research", agent: "chainbrain", text: "Every morning, get me durian export news from Exa and the USDC price from CoinGecko. Max US$0.05 a week." },
  { icon: "chart", label: "Claude watches a price", layout: "deal", agent: "claude", text: "Let Claude buy Nansen's smart-money flows every morning when the price drops below US$0.04. Max US$0.20 a week." },
  { icon: "refresh", label: "ChatGPT renews feeds", layout: "subscriptions", agent: "chatgpt", text: "Have ChatGPT renew Exa durian news and the CoinGecko USDC price every Monday, max US$0.10 a month." },
  { icon: "target", label: "Haggle a report", layout: "haggle", agent: "chainbrain", text: "Get DataPro's premium report, but negotiate the price down first, at most US$2 each, ask me above US$1, one-off." },
];
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export default function Compose() {
  const insets = useSafeAreaInsets();
  const { wallet, cfg, pockets, addPocket, recordTx, refreshPockets, balances, setActive, connectAgent, setNotice } = useApp();
  const [text, setText] = useState("");
  const [res, setRes] = useState<(Composed & { asked: Set<string> }) | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reading, setReading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<{ pocket: Address } | null>(null);
  const [build, setBuild] = useState(0); // a new composition replays the assembly
  const scroller = useRef<ScrollView>(null);
  const proofY = useRef(380); // where the proof card starts in the scroll content (measured)
  const cardRef = useRef<View>(null);
  const left = useRef(false);
  const W = pageCardWidth(390);

  const sellers = (cfg?.sellers ?? []).map((s) => ({ id: s.id, name: s.name }));
  const p = res && draft ? proof(draft, sellers) : null;
  const agent = AGENTS.find((a) => a.id === res?.agent) ?? AGENTS[0];
  const outside = agent.kind === "outside";
  const spec = res?.spec;
  // fixed once composed: the new pocket itself must not turn it into "… · 17 Oct"
  const title = useMemo(() => (spec ? uniqueName(spec.title, pockets.map((x) => x.name)).slice(0, 28) : ""), [spec]); // eslint-disable-line react-hooks/exhaustive-deps
  const budget = draft ? parseUsd(draft.budget) : 0n;
  const short = balances ? balances.usdc < budget : false;
  const [signer, setSigner] = useState<string | null>(null);
  useEffect(() => { void biometricKind().then(setSigner); }, []);

  const compose = async (s0?: string) => {
    Keyboard.dismiss();
    const s = (s0 ?? text).trim() || EXAMPLES[0].text;
    if (!text.trim() && !s0) setText(s);
    setReading(true); setErr(null); setMade(null);
    try {
      const r = await api.composeApp(s);
      setRes({ ...r, asked: new Set() }); setDraft(r.draft); setBuild((n) => n + 1);
      haptic.success();
      setTimeout(() => scroller.current?.scrollTo({ y: Math.max(0, proofY.current - 12), animated: true }), 320);
    } catch {
      setErr("Couldn't read that. Try again, or start from an example."); haptic.error();
    } finally { setReading(false); }
  };
  const pick = (field: keyof Draft, value: string) => {
    if (!res || !draft) return;
    haptic.select();
    setDraft(answer(draft, field, value));
    setRes({ ...res, asked: new Set([...res.asked, String(field)]) });
  };
  const open = (pocket: Address) => {
    if (left.current) return;
    left.current = true;
    const go = () => router.replace({ pathname: "/pocket/[id]", params: { id: pocket } });
    if (!cardRef.current) { go(); return; }
    cardRef.current.measureInWindow((x, y, w, h) => { startFlight(pocket, { x, y, w, h }, toneFor([{ address: pocket, app: spec }], pocket), 0); go(); });
  };

  const create = async () => {
    setErr(null);
    if (!wallet || !cfg || !spec || !draft) throw new Error("not ready");
    const ok = await confirmOwner(`Create ${title}`);
    if (ok === "cancel") { const e = new Error("Cancelled"); setErr("Face ID was cancelled. Nothing was created."); throw e; }
    try {
      if (outside) connectAgent(agent.id);
      const payTo = Object.fromEntries(cfg.sellers.map((s) => [s.id, s.payTo]));
      const m = await wallet.createPocket({
        agent: (outside ? agent.address : cfg.agent) as Address, cap: parseUsd(draft.cap),
        askAbove: draft.askAbove === "never" ? NEVER : parseUsd(draft.askAbove), expiresAt: expiryFor(draft.lifetime),
        sellers: draft.sellers.map((s) => payTo[s] as Address),
      });
      recordTx({ kind: "create", pocket: m.pocket, hash: m.tx });
      await addPocket(m.pocket, { name: title, style: "custom", app: { ...spec, title } }, { activate: !outside });
      const f = await wallet.fund(m.pocket, budget);
      recordTx({ kind: "fund", pocket: m.pocket, hash: f.hash, amount: budget.toString() });
      api.setApp(m.pocket, { ...spec, title });
      if (spec.routine) api.setRoutine(m.pocket, spec.routine);
      await refreshPockets();
      if (!outside) setActive(m.pocket);
      setNotice({ title: `${title} created and funded`, pocket: m.pocket, txs: [{ label: "Create pocket", hash: m.tx }, { label: `Add US$${draft.budget}`, hash: f.hash }] });
      setMade({ pocket: m.pocket });
      setTimeout(() => open(m.pocket), 2200);
    } catch (e) { setErr(txError(e)); throw e; }
  };

  // ---- auto-play: type the sentence, compose, slide, open
  useAutoplayTarget("compose.text", async (arg) => {
    const run = autoplayRun();
    const v = String(arg?.text ?? "");
    setText("");
    await typeOut(v, setText, { cancelled: () => !autoplayAlive(run) });
    if (!autoplayAlive(run)) return false;
    await new Promise((r) => setTimeout(r, 500));
    await compose(v);
    return true;
  });
  useAutoplayTarget("compose.manual", () => { router.replace("/create"); return true; });
  useAutoplayTarget("compose.open", () => { if (!made) return false; open(made.pocket); return true; }, !!made);

  // the live preview: the pocket as it will be, before it exists (no address yet: the card says Draft)
  const preview: Pocket | null = spec && draft ? {
    address: made?.pocket ?? ZERO, owner: (wallet?.address ?? ZERO) as Address, agent: agent.address as Address, cap: parseUsd(draft.cap),
    askAbove: draft.askAbove === "never" ? NEVER : parseUsd(draft.askAbove), expiresAt: expiryFor(draft.lifetime), revoked: false,
    balance: budget, allowed: draft.sellers, name: title, style: "custom", owned: true, agentId: agent.id, app: spec,
  } as Pocket : null;
  const ctx: AppCtx | null = spec && draft && preview ? {
    spec, agentId: agent.id, events: [], routine: null, balance: budget, rules: { cap: preview.cap, sellers: draft.sellers }, now: Date.now(), preview: true,
    sellerName: (id) => cleanText(cfg?.sellers.find((s) => s.id === id)?.name ?? id ?? "", 24),
    registry: cfg?.sellers,
    itemName: (sid, sku) => { const it = cfg?.sellers.find((s) => s.id === sid)?.items.find((i) => i.sku === sku); return it?.short ?? it?.description ?? sku; },
  } : null;
  const open0 = res ? res.questions.filter((q) => !res.asked.has(String(q.field))) : [];

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <BackHeader title="New pocket app" />
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingTop: 8, /* the header above is in the flow (no scrollY), so it already holds the top inset */ paddingBottom: insets.bottom + 120, gap: 16 }}>{/* room for the ask dock that floats over the bottom */}
        <View style={{ paddingHorizontal: 20, gap: 6 }}>
          <T v="display" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36 }}>{"Say what it's for."}</T>
          <T v="body" color="ink2">One sentence. ChainBrain sets the rules, the routine and the screen. You check them and sign.</T>
        </View>

        <Card pad={16} style={{ marginHorizontal: PAGE_MARGIN, gap: 12 }}>
          <Field value={text} onChangeText={(t) => setText(t.slice(0, 300))} placeholder={EXAMPLES[0].text} multiline accessibilityLabel="What the pocket is for, in one sentence"
            style={{ minHeight: 128, paddingVertical: 14, fontSize: 17, lineHeight: 24, textAlignVertical: "top" }} />
          <Understood text={text} sellers={sellers} />
          {/* the four kinds of app, as small cards in their job's face with the agent that would hold them: tap one to try it */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {EXAMPLES.map((e) => {
              const f = deck[FACE[e.layout]];
              const hatched = "hatch" in f && f.hatch;
              return (
                <Press key={e.label} haptics="select" scale={0.96} onPress={() => { setText(e.text); void compose(e.text); }} accessibilityRole="button" accessibilityLabel={`Example: ${e.label}, a ${LAYOUT_NAME[e.layout].toLowerCase()}`}
                  style={{ flexGrow: 1, flexBasis: "45%", minHeight: 86, borderRadius: 14, backgroundColor: f.face, overflow: "hidden", borderWidth: hatched ? 1 : 0, borderColor: c.tileStroke }}>
                  {hatched ? <Hatch color={c.line} pitch={7} stroke={1.3} /> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingTop: 10 }}>
                    <AgentAvatar kind={e.agent} size={20} />
                    <T v="tab" numberOfLines={1} style={{ color: f.sub, flexShrink: 1 }}>{LAYOUT_NAME[e.layout]}</T>
                  </View>
                  <View style={{ height: 6, backgroundColor: f.band, marginTop: 8 }} />
                  <T v="cap" w="semi" numberOfLines={2} style={{ color: f.ink, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>{e.label}</T>
                </Press>
              );
            })}
          </View>
          <Button label={res ? "Compose again" : "Compose my pocket app"} kind={res ? "secondary" : "primary"} icon="layers" loading={reading} onPress={() => void compose()} />
          {err ? <T v="sub" color="negative">{err}</T> : null}
        </Card>

        {res && p && spec && preview && ctx ? (
          <React.Fragment key={build}>
            <Stage i={0} onY={(y) => { proofY.current = y; }}>
              <ProofCard worst={p.worstCase} lines={p.lines} tests={p.tests} never={p.neverPayable} by={res.by} sellers={draft!.sellers} cap={draft!.cap} per={draft!.per} limit={draft!.limit} sellerLabel={(id) => sellers.find((x) => x.id === id)?.name ?? id} />
            </Stage>
            {open0.map((q) => (
              <Stage i={1} key={String(q.field)}>
                <Card pad={14} style={{ marginHorizontal: PAGE_MARGIN, gap: 8, backgroundColor: c.blueSoft }}>
                  <T v="sub" w="semi">{cleanText(q.question, 120)}</T>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {q.options.map((o) => <Button key={o.value} label={cleanText(o.label, 30)} kind="secondary" small onPress={() => pick(q.field, o.value)} />)}
                  </View>
                  <T v="cap" color="ink2">Until you answer, the stricter choice is used.</T>
                </Card>
              </Stage>
            ))}

            <Stage i={2}>
              <View style={{ paddingHorizontal: 20, gap: 8, marginTop: 4, alignItems: "flex-start" }}>
                <T v="section">Your pocket app</T>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.card }}>
                  <Icon name="layers" size={14} color={c.ink} />
                  <T v="cap" w="semi">{`${LAYOUT_NAME[spec.layout]} · ${spec.blocks.length} of ${BLOCK_TYPES.length} blocks`}</T>
                </View>
              </View>
            </Stage>
            <View ref={cardRef} collapsable={false} style={{ alignItems: "center" }}>
              <FaceIn key={`${build}-${spec.layout}-${agent.id}`} width={W}>
                <PocketFace pocket={preview} width={W} tone={toneFor([{ address: preview.address, app: spec }], preview.address)} shadow still draft={!made} />
              </FaceIn>
            </View>
            <Stage i={3}><AppHeader ctx={ctx} /></Stage>
            <PocketApp ctx={ctx} assemble="build" />
            <Stage i={spec.blocks.length + 3}>
              <T v="cap" color="mutedOnCanvas" style={{ paddingHorizontal: 20, textAlign: "center" }}>
                {`${res.specBy === "claude" ? "Picked by Claude" : "Picked by ChainBrain"} from ${BLOCK_TYPES.length} fixed blocks · every figure from payments`}
              </T>
            </Stage>

            {outside ? (
              <Stage i={spec.blocks.length + 4}>
                <Card pad={18} style={{ marginHorizontal: PAGE_MARGIN, gap: 12 }}>
                  <T v="head">{`${agent.name} gets its own key for this pocket`}</T>
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <T v="cap" w="semi" color="muted">Can</T>
                      {CAN.map((x) => <View key={x} style={{ flexDirection: "row", gap: 6 }}><Icon name="check" size={14} color={c.greenInk} /><T v="cap" style={{ flex: 1 }}>{x}</T></View>)}
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <T v="cap" w="semi" color="muted">Can't</T>
                      {CANNOT.map((x) => <View key={x} style={{ flexDirection: "row", gap: 6 }}><Icon name="ban" size={14} color={c.vermillionInk} /><T v="cap" style={{ flex: 1 }}>{x}</T></View>)}
                    </View>
                  </View>
                </Card>
              </Stage>
            ) : null}

            <Stage i={spec.blocks.length + 5}>
              <View style={{ marginHorizontal: PAGE_MARGIN, gap: 10 }}>
                {made ? (
                  <Card pad={20} style={{ alignItems: "center", gap: 10 }}>
                    <SuccessMark size={56} />
                    <T v="head">{`${title} is live`}</T>
                    <T v="cap" color="muted" style={{ textAlign: "center" }}>{spec.routine ? `Created and funded on-chain. Its routine is saved as fixed fields; ${agentName(agent.id)} runs it.` : "Created and funded on-chain."}</T>
                    <Button label="Open the pocket app" icon="arrowUpRight" auto="compose.open" onPress={() => open(made.pocket)} />
                  </Card>
                ) : (
                  <>
                    <SlideToConfirm label={`Slide to create · US$${draft?.budget ?? ""}`} doneLabel="Created" auto="compose.create" disabled={!draft?.sellers.length || short || !wallet} onConfirm={create} />
                    <T v="cap" color="mutedOnCanvas" style={{ textAlign: "center" }}>
                      {short ? "Not enough in your main wallet for this budget." : !draft?.sellers.length ? "Name at least one seller in the sentence." : `${signer ?? "Your key"} signs 2 transactions: create, then fund US$${draft?.budget}`}
                    </T>
                  </>
                )}
              </View>
            </Stage>
          </React.Fragment>
        ) : null}

        {!res ? (
          <Press haptics="light" onPress={() => router.replace("/create")} accessibilityRole="button" accessibilityLabel="Set it up step by step instead"
            style={{ alignSelf: "center", minHeight: 44, paddingHorizontal: 16, justifyContent: "center" }}>
            <T v="sub" w="semi" color="ink2">Set it up step by step instead</T>
          </Press>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** The creation sequence's step `i`: fades up after the one before it (`release` spring; Reduce Motion fades). */
function Stage({ i, children, onY }: { i: number; children: React.ReactNode; /** its y in the scroll content */ onY?: (y: number) => void }) {
  const reduce = useReduceMotion();
  const v = useSharedValue(0);
  const delay = i < 3 ? i * 160 : 260 + i * 130;
  const settled = useSettled(delay + 1000);
  useEffect(() => { v.value = withDelay(delay, reduce ? withTiming(1, { duration: 180 }) : withSpring(1, motion.spring.release)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.4), transform: [{ translateY: reduce ? 0 : (1 - v.value) * 24 }] }));
  return <Animated.View onLayout={onY ? (e) => onY(e.nativeEvent.layout.y) : undefined} style={settled ? { opacity: 1, transform: [{ translateY: 0 }] } : a}>{children}</Animated.View>;
}

/** The card arrives blank (white hatch, no agent), then takes its job's face and its agent's mark with a small lift. */
function FaceIn({ width, children }: { width: number; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const show = useSharedValue(reduce ? 1 : 0);
  const lift = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    show.value = withDelay(420, withTiming(1, { duration: 520, easing: EASE_OUT }));
    // a small drop and settle (translate, not scale: the money reels measure their digits under a scale wrongly on web)
    lift.value = withDelay(380, withSequence(withTiming(6, { duration: 160, easing: EASE_OUT }), withSpring(0, motion.spring.bouncy)));
    haptic.light();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const real = useAnimatedStyle(() => ({ opacity: show.value }));
  const blank = useAnimatedStyle(() => ({ opacity: 1 - show.value }));
  const box = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const h = cardHeight(width) + 4;
  return (
    <Animated.View style={[{ width, height: h }, box]}>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height: h - 4, borderRadius: 18, overflow: "hidden", backgroundColor: c.card }, blank]}>
        <View style={{ flex: 1, borderRadius: 18, borderWidth: 1.5, borderColor: c.line, borderStyle: "dashed" }} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, real]}>{children}</Animated.View>
    </Animated.View>
  );
}

/** The proof card: what can and cannot happen with these rules, computed by code (shared/sim/speak.ts proof). At a glance:
 *  the worst case and three facts as tiles; the sentences and the payments tried against the rules fold out on request. */
function ProofCard({ worst, lines, tests, never, by, sellers, cap, per, limit, sellerLabel }: {
  worst: string; lines: string[]; tests: { label: string; got: string; ok: boolean }[]; never: string[]; by: string; sellerLabel: (id: string) => string;
  sellers: string[]; cap: string; per?: { amount: string; period: string } | null; limit?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pays = tests.filter((t) => t.got === "OK").length, asks = tests.filter((t) => t.got === "ASKS_YOU").length, refused = tests.length - pays - asks;
  const allOk = tests.every((t) => t.ok);
  return (
    <Card pad={18} style={{ marginHorizontal: PAGE_MARGIN, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: c.ink, alignItems: "center", justifyContent: "center" }}><Icon name="shieldCheck" size={24} color={c.white} stroke={1.8} /></View>
        <View style={{ flex: 1 }} accessible accessibilityLabel={`Worst case, even if the agent is fooled: US$${worst}`}>
          <T v="cap" color="muted">Worst case, even if the agent is fooled</T>
          <T v="amount">{`US$${worst}`}</T>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Fact a11y={`Pays only ${sellers.length} seller${sellers.length === 1 ? "" : "s"}`} label={sellers.length === 1 ? `${cleanText(sellerLabel(sellers[0]), 14)} only` : `only these ${sellers.length}`}>
          <View style={{ flexDirection: "row" }}>{sellers.slice(0, 3).map((id, k) => <View key={id} style={{ marginLeft: k ? -8 : 0, borderRadius: 9, borderWidth: 2, borderColor: c.tile }}><SellerMark id={id} size={24} radius={7} /></View>)}</View>
        </Fact>
        <Fact a11y={`At most US$${cap} per payment`} label={limit ? "price limit" : "per payment"}><T v="head" numberOfLines={1} adjustsFontSizeToFit>{`US$${limit ?? cap}`}</T></Fact>
        <Fact a11y={per ? `Up to US$${per.amount} a ${per.period} on its own` : "Asks before paying above its limit"} label={per ? `a ${per.period}, on its own` : "then it asks"}>
          <T v="head" numberOfLines={1} adjustsFontSizeToFit>{per ? `US$${per.amount}` : "You"}</T>
        </Fact>
      </View>
      <Press haptics="select" onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${tests.length} payments tried against these rules: ${pays} pays, ${refused} refused${asks ? `, ${asks} asks you` : ""}`}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, borderRadius: radius.tile, backgroundColor: allOk ? c.greenSoft : c.vermillionSoft }}>
        <Icon name={allOk ? "circleCheck" : "alert"} size={18} color={allOk ? c.greenInk : c.vermillionInk} stroke={2} />
        <T v="sub" w="semi" style={{ flex: 1, color: allOk ? c.greenInk : c.vermillionInk }} numberOfLines={1}>{allOk ? `${tests.length} payments tried · all as expected` : `${tests.filter((t) => !t.ok).length} of ${tests.length} payments not as expected`}</T>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={16} color={allOk ? c.greenInk : c.vermillionInk} />
      </Press>
      {open ? (
        <View style={{ gap: 8 }}>
          {lines.map((l, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10 }}>
              <Icon name="check" size={16} color={c.ink} stroke={2.2} />
              <T v="sub" style={{ flex: 1 }}>{cleanText(l, 140)}</T>
            </View>
          ))}
          {never.length ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Icon name="ban" size={16} color={c.vermillionInk} stroke={2} />
              <T v="sub" color="ink2" style={{ flex: 1 }}>{`Can never pay ${never.slice(0, 4).map((n) => cleanText(n, 20)).join(", ")}${never.length > 4 ? " or the rest" : ""}, or any other address.`}</T>
            </View>
          ) : null}
          <View style={{ gap: 6, padding: 12, borderRadius: radius.tile, backgroundColor: c.tile }}>
            {tests.map((t, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 26 }}>
                <T v="cap" color="ink2" numberOfLines={1} style={{ flex: 1 }}>{cleanText(t.label, 60)}</T>
                <T v="cap" w="semi" style={{ color: t.got === "OK" ? c.greenInk : t.got === "ASKS_YOU" ? c.blueInk : c.ink }}>{t.got === "OK" ? "pays" : t.got === "ASKS_YOU" ? "asks you" : "refused"}</T>
              </View>
            ))}
          </View>
          <T v="cap" color="muted">{`Read by ${by === "claude" ? "two independent Claude readings, the stricter kept" : "a fixed reader (no AI)"}. Every line is computed from the pocket's own rule order.`}</T>
        </View>
      ) : null}
    </Card>
  );
}
const Fact = ({ children, label, a11y }: { children: React.ReactNode; label: string; a11y: string }) => (
  <View accessible accessibilityLabel={a11y} style={{ flex: 1, minHeight: 76, padding: 12, borderRadius: radius.tile, backgroundColor: c.tile, justifyContent: "space-between", gap: 6 }}>
    {children}
    <T v="cap" color="muted" numberOfLines={2}>{label}</T>
  </View>
);
