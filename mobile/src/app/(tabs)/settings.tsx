import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import { useApp } from "../../store";
import * as api from "../../lib/api";
import { ENV_API, detectDev, getApi, isHttpUrl, normalizeUrl } from "../../lib/runtime";
import { onRelay, relayLinked } from "../../lib/relay";
import { isPrivateKey } from "../../lib/keystore";
import { c, motion } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { Avatar, Button, Card, Field, ListCard, ListRow, SectionHeader, Toggle } from "../../ui/kit";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { haptic } from "../../haptics";
import { money, shortAddr } from "../../lib/util";

export default function Settings() {
  const { apiUrl, setApiUrl, conn, connError, dev, source, setSource, wallet, balances, importKey, refreshPockets, pending } = useApp();
  const [draft, setDraft] = useState(apiUrl);
  const [test, setTest] = useState<{ state: "idle" | "busy" | "ok" | "fail"; text?: string }>({ state: "idle" });
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pk, setPk] = useState("");
  const [keyErr, setKeyErr] = useState("");
  const [funds, setFunds] = useState<{ state: "idle" | "busy" | "ok" | "fail"; text?: string }>({ state: "idle" });
  const custom = source === "server";
  // a console on the laptop showing this phone (built-in network mirrored through the dev stack's relay)
  const [linked, setLinked] = useState(relayLinked());
  useEffect(() => { const t = setInterval(() => setLinked(relayLinked()), 3000); const off = onRelay(() => setLinked(relayLinked())); return () => { clearInterval(t); off(); }; }, []);
  const [editing, setEditing] = useState(false); // switch turned on, address not confirmed yet
  const serverOpen = custom || editing;
  const scroller = useRef<any>(null);
  // the server card opens below the fold: bring it into view above the tab bar
  useEffect(() => { if (!editing) return; const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 260); return () => clearTimeout(t); }, [editing]);
  React.useEffect(() => setDraft(apiUrl), [apiUrl]);

  const runTest = async () => {
    const url = normalizeUrl(draft);
    if (url && !isHttpUrl(url)) { setTest({ state: "fail", text: "Use a full address, for example http://192.168.1.10:8787." }); haptic.error(); return; }
    setTest({ state: "busy" });
    if (custom && url && url !== apiUrl) await setApiUrl(url);
    try {
      const r = await api.ping(url || ENV_API);
      const d = await detectDev(url || ENV_API);
      setTest({ state: "ok", text: `Connected in ${r.ms} ms. ${d ? "This is the local test network." : "This is the test network (Base Sepolia)."}` });
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
  const connect = async () => {
    const url = normalizeUrl(draft);
    if (url && !isHttpUrl(url)) { setTest({ state: "fail", text: "Use a full address, for example http://192.168.1.10:8787." }); haptic.error(); return; }
    if (url !== apiUrl) await setApiUrl(url);
    await setSource("server"); setEditing(false); setTest({ state: "idle" }); haptic.success();
  };
  const toggleServer = async (v: boolean) => {
    if (v) { setEditing(true); return; }
    setEditing(false); setTest({ state: "idle" });
    if (custom) await setSource("builtin");
  };
  const network = conn === "online" ? (dev ? "Connected · local test network" : "Connected · test network (Base Sepolia)") : conn === "offline" ? connError || "Not reachable" : "Connecting…";

  return (
    <Screen innerRef={scroller}>
      <PageTitle title="Settings" sub={pending.length ? `${pending.length} request${pending.length > 1 ? "s" : ""} waiting for you` : undefined} />

      <SectionHeader title="Wallet" />
      <ListCard>
        <ListRow a11y="Copy wallet address" avatar={<Avatar icon="wallet" />} title="Your wallet" sub={wallet ? shortAddr(wallet.address) : "Not ready"}
          onPress={async () => { if (wallet) { await Clipboard.setStringAsync(wallet.address); setCopied(true); haptic.success(); setTimeout(() => setCopied(false), 1400); } }}
          right={copied ? "Copied" : balances ? money(balances.usdc) : undefined} rightTone={copied ? "positive" : "ink"} />
        {dev || !custom ? <ListRow a11y="Get test funds" onPress={getFunds} avatar={<Avatar icon="plus" />} title="Get test funds" sub={funds.text ?? "Adds test money to your wallet"} rightSub={funds.state === "busy" ? "Adding…" : undefined} rightSubTone={funds.state === "fail" ? "negative" : "muted"} /> : null}
        <ListRow a11y="Import a key" onPress={() => { setImporting(!importing); }} avatar={<Avatar icon="key" />} title="Import a key" sub="Use a test key you already have"><Icon name="chevronRight" size={18} color={c.muted} /></ListRow>
      </ListCard>
      {importing ? (
        <Animated.View entering={FadeInDown.springify(motion.spring.smooth.duration).dampingRatio(1).withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })} exiting={FadeOut.duration(motion.exit)}>
        <Card style={{ marginHorizontal: 20, marginTop: 12, gap: 12 }}>
          <T v="sub" color="ink2">Pockets owned by your current key can no longer be managed from this phone after you switch. Test keys only.</T>
          <Field value={pk} onChangeText={setPk} placeholder="Private key (0x…)" autoCapitalize="none" autoCorrect={false} secureTextEntry accessibilityLabel="Private key" />
          {!!keyErr && <T v="sub" color="negative">{keyErr}</T>}
          <Button label="Import this key" small disabled={!isPrivateKey(pk)} onPress={async () => { try { await importKey(pk); setImporting(false); setPk(""); setKeyErr(""); haptic.warning(); } catch (e) { setKeyErr((e as Error).message); } }} />
          <Button label="Cancel" kind="text" small onPress={() => { setImporting(false); setPk(""); setKeyErr(""); }} />
        </Card>
        </Animated.View>
      ) : null}

      <SectionHeader title="About" />
      <ListCard>
        <ListRow avatar={<Avatar icon="shield" />} title="Test money only" sub="Do not put real money on this wallet" />
        <ListRow a11y="Compliance" avatar={<Avatar icon="globe" />} title="Compliance" subLines={6} sub="Testnet assets only. Not offered in mainland China. Target: Hong Kong and APEC, settling in licensed stablecoins or tokenized deposits." />
        <ListRow avatar={<Avatar icon="bolt" />} title="ChainBrain" sub="Your agent spends only from the pockets you fund" />
      </ListCard>

      <SectionHeader title="Advanced" />
      <ListCard>
        <ListRow avatar={<Avatar icon="globe" tone="fill" />} title="Custom server" sub={custom ? apiUrl.replace(/^https?:\/\//, "") : editing ? "Enter the address below" : "Off"}>
          <Toggle on={serverOpen} onChange={(v) => void toggleServer(v)} a11y="Custom server" />
        </ListRow>
        {!custom && linked ? <ListRow avatar={<Avatar icon="activity" tone="fill" />} title="Laptop console" sub={`Linked · ${getApi().replace(/^https?:\/\//, "")}`} /> : null}
      </ListCard>
      {serverOpen ? (
        <Animated.View entering={FadeInDown.springify(motion.spring.smooth.duration).dampingRatio(1).withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })} exiting={FadeOut.duration(motion.exit)}>
          <Card style={{ marginHorizontal: 20, marginTop: 12, gap: 12 }}>
            <Field label="Server address" value={draft} onChangeText={setDraft} onSubmitEditing={() => void (custom ? setApiUrl(draft) : connect())} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder={ENV_API} accessibilityLabel="API URL" />
            <T v="cap" color="muted">Your laptop's address on the same Wi-Fi, for example http://192.168.1.10:8787. Empty uses {ENV_API}.</T>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Test" kind="secondary" small loading={test.state === "busy"} onPress={runTest} style={{ flex: 1 }} />
              {custom ? null : <Button label="Connect" small onPress={() => void connect()} style={{ flex: 1 }} />}
            </View>
            {test.text ? <Animated.View key={test.text} entering={FadeInDown.duration(motion.base).withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] })}><T v="sub" color={test.state === "ok" ? "positive" : "negative"}>{test.text}</T></Animated.View> : null}
            {custom ? <T v="cap" color={conn === "offline" ? "negative" : "muted"}>{network}</T> : null}
          </Card>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
