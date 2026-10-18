import React, { useEffect, useRef, useState } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import { useApp } from "../../store";
import * as api from "../../lib/api";
import { ENV_API, detectDev, getApi, getChain, isHttpUrl, normalizeUrl } from "../../lib/runtime";
import { onRelay, relayLinked } from "../../lib/relay";
import { forgetSaved } from "../../lib/builtin";
import { isPrivateKey } from "../../lib/keystore";
import { c, level3, motion } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { Button, Card, Field, ListCard, ListRow, Press, Toggle } from "../../ui/kit";
import { Hatch } from "../../ui/Hatch";
import { BrandMark } from "../../ui/BrandMark";
import { Money } from "../../ui/Money";
import { replayIntro } from "../../ui/intro";
import { isAddress, type Address } from "viem";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { haptic } from "../../haptics";
import { money, shortAddr, hkd } from "../../lib/util";

/** Flat section header: 13/600 muted, 24 above, 8 below. */
const Group = ({ title }: { title: string }) => <T v="cap" w="semi" color="muted" accessibilityRole="header" style={{ paddingHorizontal: 24, marginTop: 24, marginBottom: 8 }}>{title}</T>;

export default function Settings() {
  const { addPocket, apiUrl, setApiUrl, conn, connError, dev, source, setSource, wallet, balances, importKey, refreshPockets, pending, visitor, exportKey } = useApp();
  const [backup, setBackup] = useState<"closed" | "open" | "copied">("closed");
  const [draft, setDraft] = useState(apiUrl);
  const [test, setTest] = useState<{ state: "idle" | "busy" | "ok" | "fail"; text?: string }>({ state: "idle" });
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [startOver, setStartOver] = useState(false); // first tap arms, second tap starts over
  const [adding, setAdding] = useState(false);
  const [addr, setAddr] = useState("");
  const [about, setAbout] = useState(false);
  const [pk, setPk] = useState("");
  const [keyErr, setKeyErr] = useState("");
  const [funds, setFunds] = useState<{ state: "idle" | "busy" | "ok" | "fail"; text?: string }>({ state: "idle" });
  const demo = source === "builtin";
  // a console on the laptop showing this phone (built-in network mirrored through the dev stack's relay)
  const [linked, setLinked] = useState(relayLinked());
  useEffect(() => { const t = setInterval(() => setLinked(relayLinked()), 3000); const off = onRelay(() => setLinked(relayLinked())); return () => { clearInterval(t); off(); }; }, []);
  const [editing, setEditing] = useState(false); // the server address card is open
  const scroller = useRef<any>(null);
  // the server card opens below the fold: bring it into view above the tab bar
  useEffect(() => { if (!editing) return; const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 260); return () => clearTimeout(t); }, [editing]);
  React.useEffect(() => setDraft(apiUrl), [apiUrl]);

  const runTest = async () => {
    const url = normalizeUrl(draft);
    if (url && !isHttpUrl(url)) { setTest({ state: "fail", text: "Use a full address, for example http://192.168.1.10:8787." }); haptic.error(); return; }
    setTest({ state: "busy" });
    if (!demo && url && url !== apiUrl) await setApiUrl(url);
    try {
      const r = await api.ping(url || ENV_API);
      const d = await detectDev(url || ENV_API);
      setTest({ state: "ok", text: `Connected in ${r.ms} ms. ${d ? "This is the local test network." : "This is the FISCO BCOS chain."}` });
      haptic.success();
    } catch {
      setTest({ state: "fail", text: "Could not reach it. Your phone and laptop need the same Wi-Fi, and the address must be your laptop's, not localhost." });
      haptic.error();
    }
  };
  const getFunds = async () => {
    if (!wallet) return;
    setFunds({ state: "busy" });
    try { await api.devFund(wallet.address); await refreshPockets(); setFunds({ state: "ok", text: "Added test money to your wallet." }); haptic.success(); }
    catch { setFunds({ state: "fail", text: "The test network did not accept that. Is it running?" }); haptic.error(); }
  };
  /** The demo network is the app's built-in simulation; off is the real FISCO chain through the server below. */
  const toggleDemo = async (v: boolean) => {
    setEditing(false); setTest({ state: "idle" });
    await setSource(v ? "builtin" : "server"); haptic.success();
  };
  const saveServer = async () => {
    const url = normalizeUrl(draft);
    if (url && !isHttpUrl(url)) { setTest({ state: "fail", text: "Use a full address, for example http://192.168.1.10:8787." }); haptic.error(); return; }
    if (url !== apiUrl) await setApiUrl(url);
    setEditing(false); setTest({ state: "idle" }); haptic.success();
  };
  const account = visitor.state === "ready" ? " · signed in" : visitor.state === "signing" ? " · signing in…" : visitor.state === "error" ? ` · ${visitor.error}` : "";
  const network = conn === "online" ? `${dev ? "Connected · local test network" : "Connected · FISCO BCOS"}${account}` : conn === "offline" ? connError || "Not reachable" : "Connecting…";

  return (
    <Screen innerRef={scroller}>
      <PageTitle title="Settings" sub={pending.length ? `${pending.length} request${pending.length > 1 ? "s" : ""} waiting for you` : undefined} />

      <WalletFace address={wallet?.address} ehkd={balances?.ehkd} copied={copied}
        onCopy={async () => { if (wallet) { await Clipboard.setStringAsync(wallet.address); setCopied(true); haptic.success(); setTimeout(() => setCopied(false), 1400); } }} />
      <Group title="Wallet" />
      <ListCard>
        {dev || demo || getChain()?.key === "fisco" ? <ListRow a11y="Get test funds" onPress={getFunds} icon="plus" title="Get test funds" sub={funds.text ?? "Test money, for this network"} rightSub={funds.state === "busy" ? "Adding…" : undefined} rightSubTone={funds.state === "fail" ? "negative" : "muted"} /> : null}
        <ListRow a11y="Add an existing card" onPress={() => setAdding(!adding)} icon="layers" title="Add an existing card" sub="By its address"><Icon name="chevronRight" size={18} color={c.muted} /></ListRow>
        <ListRow a11y="Import a key" onPress={() => { setImporting(!importing); }} icon="key" title="Import a key" sub="A test key you have"><Icon name="chevronRight" size={18} color={c.muted} /></ListRow>
        <ListRow a11y="Back up your key" onPress={() => setBackup(backup === "closed" ? "open" : "closed")} icon="key" title="Back up your key" sub="Only on this phone: copy it somewhere safe"><Icon name="chevronRight" size={18} color={c.muted} /></ListRow>
        {/* a browser tab keeps the built-in network across reloads (lib/builtin.ts); this is the way back to a fresh one */}
        {source === "builtin" && Platform.OS === "web" ? (
          <ListRow a11y="Start the built-in network over" icon="refresh" title={startOver ? "Tap again to start over" : "Start over"}
            sub={startOver ? "Tap again: back to day one" : "Back to day one"} rightTone="negative"
            onPress={() => { if (!startOver) { setStartOver(true); setTimeout(() => setStartOver(false), 4000); return; } forgetSaved(); globalThis.location?.reload(); }} />
        ) : null}
      </ListCard>
      <T v="cap" color="muted" style={{ paddingHorizontal: 24, paddingTop: 8 }}>Test network: test money only.</T>
      {adding ? (
        <Animated.View entering={FadeInDown.duration(motion.base)} exiting={FadeOut.duration(motion.exit)}>
          <Card style={{ marginHorizontal: 20, marginTop: 12, gap: 12 }}>
            <Field value={addr} onChangeText={setAddr} placeholder="Card address (0x…)" autoCapitalize="none" autoCorrect={false} accessibilityLabel="Card address" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button label="Cancel" kind="secondary" small style={{ flex: 1 }} onPress={() => { setAdding(false); setAddr(""); }} />
              <Button label="Add card" small style={{ flex: 1 }} disabled={!isAddress(addr.trim())} onPress={async () => { await addPocket(addr.trim() as Address); setAddr(""); setAdding(false); }} />
            </View>
          </Card>
        </Animated.View>
      ) : null}
      {backup !== "closed" ? (
        <Animated.View entering={FadeInDown.duration(motion.base)} exiting={FadeOut.duration(motion.exit)}>
          <Card style={{ marginHorizontal: 20, marginTop: 12, gap: 12 }}>
            <T v="sub" color="ink2">Your key is your account: whoever has it controls your main wallet and your cards. It lives only on this phone, so if you lose the phone without a copy, your cards are gone. Test money only.</T>
            <Button label={backup === "copied" ? "Copied. Paste it somewhere safe" : "Copy my key"} small onPress={async () => { const k = exportKey(); if (!k) return; await Clipboard.setStringAsync(k); setBackup("copied"); haptic.warning(); }} />
            <Button label="Close" kind="text" small onPress={() => setBackup("closed")} />
          </Card>
        </Animated.View>
      ) : null}
      {importing ? (
        <Animated.View entering={FadeInDown.duration(motion.base)} exiting={FadeOut.duration(motion.exit)}>
        <Card style={{ marginHorizontal: 20, marginTop: 12, gap: 12 }}>
          <T v="sub" color="ink2">Cards owned by your current key can no longer be managed from this phone after you switch. Test keys only.</T>
          <Field value={pk} onChangeText={setPk} placeholder="Private key (0x…)" autoCapitalize="none" autoCorrect={false} secureTextEntry accessibilityLabel="Private key" />
          {!!keyErr && <T v="sub" color="negative">{keyErr}</T>}
          <Button label="Import this key" small disabled={!isPrivateKey(pk)} onPress={async () => { try { await importKey(pk); setImporting(false); setPk(""); setKeyErr(""); haptic.warning(); } catch (e) { setKeyErr((e as Error).message); } }} />
          <Button label="Cancel" kind="text" small onPress={() => { setImporting(false); setPk(""); setKeyErr(""); }} />
        </Card>
        </Animated.View>
      ) : null}

      <Group title="About" />
      <ListCard>
        <ListRow a11y="How ChainBrain works, shows the intro again" icon="info" title="How ChainBrain works" sub="The intro, in under a minute" onPress={replayIntro}>
          <Icon name="chevronRight" size={18} color={c.muted} />
        </ListRow>
        <ListRow a11y="About and compliance" icon="globe" title="About and compliance" sub="ChainBrain · cards, not your wallet" onPress={() => setAbout(!about)}>
          <View style={{ transform: [{ rotate: about ? "90deg" : "0deg" }] }}><Icon name="chevronRight" size={18} color={c.muted} /></View>
        </ListRow>
      </ListCard>
      {about ? <T v="sub" color="ink2" style={{ paddingHorizontal: 24, paddingTop: 10 }}>Test network assets only. Not offered in mainland China. Target: Hong Kong and APEC, settling in licensed stablecoins or tokenized deposits.</T> : null}

      <Group title="Advanced" />
      <ListCard>
        <ListRow icon="layers" title="Demo network" sub={demo ? "On · the built-in simulation, no real chain" : "Off · the real FISCO BCOS chain"}>
          <Toggle on={demo} onChange={(v) => void toggleDemo(v)} a11y="Demo network" />
        </ListRow>
        {!demo ? (
          <ListRow a11y="Server" icon="globe" title="Server" sub={apiUrl.replace(/^https?:\/\//, "")} onPress={() => setEditing(!editing)}>
            <Icon name="chevronRight" size={18} color={c.muted} />
          </ListRow>
        ) : null}
        {demo && linked ? <ListRow icon="activity" title="Laptop console" sub="Linked" /> : null}
      </ListCard>
      {!demo ? <T v="cap" color={conn === "offline" || visitor.state === "error" ? "negative" : "muted"} style={{ paddingHorizontal: 24, paddingTop: 8 }}>{network}</T> : null}
      {editing && !demo ? (
        <Animated.View entering={FadeInDown.duration(motion.base)} exiting={FadeOut.duration(motion.exit)}>
          <Card style={{ marginHorizontal: 20, marginTop: 12, gap: 12 }}>
            <Field label="Server address" value={draft} onChangeText={setDraft} onSubmitEditing={() => void saveServer()} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder={ENV_API} accessibilityLabel="API URL" />
            <T v="cap" color="muted">Your laptop's address on the same Wi-Fi, for example http://192.168.1.10:8787. Empty uses {ENV_API}.</T>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Test" kind="secondary" small loading={test.state === "busy"} onPress={runTest} style={{ flex: 1 }} />
              <Button label="Save" small onPress={() => void saveServer()} style={{ flex: 1 }} />
            </View>
            {test.text ? <Animated.View key={test.text} entering={FadeInDown.duration(motion.base).withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] })}><T v="sub" color={test.state === "ok" ? "positive" : "negative"}>{test.text}</T></Animated.View> : null}
          </Card>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

/** The main wallet as a card of its own: the same proportions as the pockets, but its own face (white, a heavy ink hatch
 *  along its edge, ChainBrain's mark), because it is the one no agent ever holds. Tap to copy the address. */
function WalletFace({ address, ehkd, copied, onCopy }: { address?: string; ehkd?: bigint; copied: boolean; onCopy(): void }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 480) - 32;
  const h = Math.round(w / 1.586);
  return (
    <Press kind="row" haptics="none" onPress={onCopy} accessibilityRole="button"
      accessibilityLabel={`Main wallet${ehkd != null ? `, ${money(ehkd)}` : ""}. Only your key can move this money; no agent holds it. ${copied ? "Address copied" : "Copies the address"}`}
      style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 4 }}>
      <View style={{ width: w, height: h, borderRadius: 18, backgroundColor: c.card, overflow: "hidden", borderCurve: "continuous", ...level3, shadowOpacity: 0.1 } as object}>
        <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: w * 0.32, overflow: "hidden" }}><Hatch color={c.ink} pitch={7} stroke={2} opacity={0.9} /></View>
        <View style={{ flex: 1, padding: 20, justifyContent: "space-between", width: w * 0.68 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <BrandMark size={28} />
            <T v="head">Main wallet</T>
          </View>
          <View>
            {ehkd != null ? <Money v="amount" value={hkd(ehkd)} /> : <T v="row" color="muted">Loading…</T>}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <T v="mono" style={{ fontSize: 17, lineHeight: 22, textTransform: "none" }}>{address ? `0x…${address.slice(-4).toLowerCase()}` : "—"}</T>
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: copied ? c.greenSoft : c.fill }}>
              <T v="tab" style={{ color: copied ? c.greenInk : c.ink2, textTransform: "uppercase", letterSpacing: 0.8, fontSize: 9.5, lineHeight: 12 }}>{copied ? "Copied" : "Copy"}</T>
            </View>
          </View>
        </View>
      </View>
    </Press>
  );
}
