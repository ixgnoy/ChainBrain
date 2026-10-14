import React, { useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import { useApp } from "../../store";
import * as api from "../../lib/api";
import { ENV_API, detectDev, normalizeUrl } from "../../lib/runtime";
import { isPrivateKey } from "../../lib/keystore";
import { c, motion } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { Avatar, Button, Card, Field, ListCard, ListRow, SectionHeader } from "../../ui/kit";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { haptic } from "../../haptics";
import { money, shortAddr } from "../../lib/util";

export default function Settings() {
  const { apiUrl, setApiUrl, conn, dev, demo, wallet, balances, importKey, refreshPockets, pending } = useApp();
  const [draft, setDraft] = useState(apiUrl);
  const [test, setTest] = useState<{ state: "idle" | "busy" | "ok" | "fail"; text?: string }>({ state: "idle" });
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pk, setPk] = useState("");
  const [keyErr, setKeyErr] = useState("");
  const [funds, setFunds] = useState<{ state: "idle" | "busy" | "ok" | "fail"; text?: string }>({ state: "idle" });
  React.useEffect(() => setDraft(apiUrl), [apiUrl]);

  const runTest = async () => {
    setTest({ state: "busy" });
    const url = normalizeUrl(draft);
    if (url && url !== apiUrl) await setApiUrl(url);
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
  const network = demo ? "Demo data" : conn === "online" ? (dev ? "Local test network" : "Test network · Base Sepolia") : "Connecting…";

  return (
    <Screen>
      <PageTitle title="Settings" sub={pending.length ? `${pending.length} request${pending.length > 1 ? "s" : ""} waiting for you` : undefined} />

      <SectionHeader title="Wallet" />
      <ListCard>
        <ListRow a11y="Copy wallet address" avatar={<Avatar icon="wallet" />} title="Your wallet" sub={wallet ? shortAddr(wallet.address) : "Not ready"}
          onPress={async () => { if (wallet) { await Clipboard.setStringAsync(wallet.address); setCopied(true); haptic.success(); setTimeout(() => setCopied(false), 1400); } }}
          right={copied ? "Copied" : balances ? money(balances.usdc) : undefined} rightTone={copied ? "positive" : "ink"} />
        {dev ? <ListRow a11y="Get test funds" onPress={getFunds} avatar={<Avatar icon="plus" />} title="Get test funds" sub={funds.text ?? "Adds test money to your wallet"} rightSub={funds.state === "busy" ? "Adding…" : undefined} rightSubTone={funds.state === "fail" ? "negative" : "muted"} /> : null}
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

      <SectionHeader title="Network" />
      <Card style={{ marginHorizontal: 20, gap: 12 }}>
        <Field label="Server address" value={draft} onChangeText={setDraft} onSubmitEditing={() => void setApiUrl(draft)} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder={ENV_API} accessibilityLabel="API URL" />
        <T v="cap" color="muted">On a phone, use your laptop's address on the same Wi-Fi, for example http://192.168.1.10:8787. Empty uses {ENV_API}.</T>
        <Button label="Test connection" kind="secondary" small loading={test.state === "busy"} onPress={runTest} />
        {test.text ? <Animated.View key={test.text} entering={FadeInDown.duration(motion.base).withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] })}><T v="sub" color={test.state === "ok" ? "positive" : "negative"}>{test.text}</T></Animated.View> : null}
      </Card>
      <T v="cap" color="muted" style={{ paddingHorizontal: 24, paddingTop: 10 }}>{network}</T>

      <SectionHeader title="About" />
      <ListCard>
        <ListRow avatar={<Avatar icon="shield" />} title="Test money only" sub="Do not put real money on this wallet" />
        <ListRow a11y="Compliance" avatar={<Avatar icon="globe" />} title="Compliance" subLines={6} sub="Testnet assets only. Not offered in mainland China. Target: Hong Kong and APEC, settling in licensed stablecoins or tokenized deposits." />
        <ListRow avatar={<Avatar icon="bolt" />} title="ChainBrain" sub="Your agent spends only from the pockets you fund" />
      </ListCard>
    </Screen>
  );
}
