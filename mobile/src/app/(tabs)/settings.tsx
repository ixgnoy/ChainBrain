import React, { useState } from "react";
import { TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { formatEther } from "viem";
import { useTheme, F } from "../../theme";
import { useApp } from "../../store";
import * as api from "../../lib/api";
import { ENV_API, detectDev, normalizeUrl } from "../../lib/runtime";
import { isPrivateKey } from "../../lib/keystore";
import { Screen } from "../../ui/Screen";
import { Button, Card, DevBadge, Divider, Press, Segmented } from "../../ui/primitives";
import { T, Mono } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { Logo } from "../../ui/Logo";
import { haptic } from "../../haptics";
import { usd } from "../../lib/util";
import { radius } from "../../tokens";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginHorizontal: 20, marginBottom: 22, gap: 8 }}>
      <T v="caption" color="text3" style={{ letterSpacing: 0.4, paddingLeft: 4 }}>{title.toUpperCase()}</T>
      {children}
    </View>
  );
}
const input = (c: ReturnType<typeof useTheme>["c"], mono = true) => ({ height: 52, borderRadius: radius.md, backgroundColor: c.bgElev2, borderWidth: 1, borderColor: c.hairlineStrong, paddingHorizontal: 14, color: c.text, fontFamily: mono ? F.mono : F.body, fontSize: 13 });

export default function Settings() {
  const { c, mode, setMode } = useTheme();
  const { apiUrl, setApiUrl, conn, dev, wallet, balances, importKey, newKey, pending, refreshPockets } = useApp();
  const [draft, setDraft] = useState(apiUrl);
  const [test, setTest] = useState<{ state: "idle" | "busy" | "ok" | "fail"; text?: string }>({ state: "idle" });
  const [copied, setCopied] = useState(false);
  const [replace, setReplace] = useState(false);
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
      setTest({ state: "ok", text: `Reached the server in ${r.ms} ms, ${r.sellers} sellers. ${d ? "This is the LOCAL FORK dev stack: fork money, RPC through the server, no BaseScan." : "This is the real server on Base Sepolia."}` });
      haptic.success();
    } catch {
      setTest({ state: "fail", text: "Could not reach it. Phone and laptop need the same Wi-Fi, and the URL must use the laptop's LAN IP, not localhost." });
      haptic.error();
    }
  };
  const getFunds = async () => {
    if (!wallet) return;
    setFunds({ state: "busy" });
    try { const r = await api.devFund(wallet.address); await refreshPockets(); setFunds({ state: "ok", text: `Added ${r.eth} ETH and ${r.usdc} USDC on the fork.` }); haptic.success(); }
    catch { setFunds({ state: "fail", text: "The dev stack did not accept that. Is it running?" }); haptic.error(); }
  };

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18, gap: 8 }}>
        <T v="headingLg">Settings</T>
        <View style={{ flexDirection: "row", gap: 8 }}>{dev && <DevBadge />}</View>
      </View>

      <Group title="Connection">
        <Card pad={0}>
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <T v="bodySm" weight="semi">API URL</T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: conn === "online" ? c.ok : conn === "offline" ? c.refused : c.stepup }} />
                <T v="caption" color="text2">{conn === "online" ? "Connected" : conn === "offline" ? "Offline" : "Connecting"}</T>
              </View>
            </View>
            <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => void setApiUrl(draft)} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder={ENV_API} placeholderTextColor={c.text3} accessibilityLabel="API URL" style={input(c)} />
            <T v="caption" color="text3">Use your laptop's LAN address, e.g. http://192.168.1.10:8787. Saved on this phone. Empty restores {ENV_API}.</T>
            <Button label="Test connection" kind="secondary" icon="refresh" small loading={test.state === "busy"} onPress={runTest} />
            {test.text && <T v="bodySm" color={test.state === "ok" ? "ok" : "refused"}>{test.text}</T>}
          </View>
          <Divider />
          <View style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T v="bodySm" weight="semi">Chain</T>
            {dev ? <DevBadge /> : <T v="bodySm" color={conn === "online" ? "ok" : "text3"}>{conn === "online" ? "Base Sepolia" : "Not connected"}</T>}
          </View>
        </Card>
      </Group>

      <Group title="Owner key">
        <Card>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="key" size={18} color={c.text2} />
              <T v="bodySm" weight="semi">This phone creates pockets and co-signs payments</T>
            </View>
            <Press haptics="select" onPress={async () => { if (wallet) { await Clipboard.setStringAsync(wallet.address); setCopied(true); haptic.success(); setTimeout(() => setCopied(false), 1400); } }} style={{ backgroundColor: c.bgElev2, borderRadius: radius.md, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: c.hairline }} accessibilityLabel="Copy owner address">
              <Mono size={11} style={{ flex: 1 }}>{wallet?.address ?? "No key"}</Mono>
              <Icon name={copied ? "check" : "copy"} size={16} color={copied ? c.ok : c.text3} />
            </Press>
            {balances && <T v="caption" color="text3">{usd(balances.usdc)} USDC · {Number(formatEther(balances.eth)).toFixed(4)} ETH</T>}
            <T v="caption" color="text3">The key is stored in the iOS Keychain or Android Keystore and never leaves this phone.</T>
          </View>
        </Card>
        {dev && (
          <Card>
            <View style={{ gap: 10 }}>
              <T v="bodySm" weight="semi">Test funds (local fork only)</T>
              <T v="caption" color="text2">Adds 1 ETH and 20 USDC to this address on the fork.</T>
              <Button label="Get test funds" small loading={funds.state === "busy"} onPress={getFunds} />
              {funds.text && <T v="bodySm" color={funds.state === "ok" ? "ok" : "refused"}>{funds.text}</T>}
            </View>
          </Card>
        )}
        <View style={{ backgroundColor: c.stepupBg, borderColor: c.stepupBorder, borderWidth: 1, borderRadius: radius.lg, padding: 14, flexDirection: "row", gap: 12 }}>
          <Icon name="alert" size={20} color={c.stepup} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="bodySm" weight="semi" color="stepup">Testnet only</T>
            <T v="bodySm" color="text2">Test funds have no value. Do not put real money on this key.</T>
          </View>
        </View>
        {replace ? (
          <Card>
            <View style={{ gap: 10 }}>
              <T v="bodySm">Replacing the key means pockets owned by the old key can no longer be revoked or co-signed from this phone. Back up the old key first.</T>
              <TextInput value={pk} onChangeText={setPk} placeholder="Paste a testnet private key (0x…)" placeholderTextColor={c.text3} autoCapitalize="none" autoCorrect={false} secureTextEntry accessibilityLabel="New private key" style={input(c)} />
              {!!keyErr && <T v="bodySm" color="refused">{keyErr}</T>}
              <Button label="Import this key" small disabled={!isPrivateKey(pk)} onPress={async () => { try { await importKey(pk); setReplace(false); setPk(""); haptic.warning(); } catch (e) { setKeyErr((e as Error).message); } }} />
              <Button label="Create a new key instead" kind="danger" small onPress={async () => { await newKey(); setReplace(false); haptic.warning(); }} />
              <Button label="Cancel" kind="ghost" small onPress={() => { setReplace(false); setPk(""); setKeyErr(""); }} />
            </View>
          </Card>
        ) : (
          <Button label="Replace key" kind="secondary" icon="refresh" small onPress={() => setReplace(true)} />
        )}
      </Group>

      <Group title="Appearance">
        <Segmented options={[{ key: "system", label: "System" }, { key: "dark", label: "Dark" }, { key: "light", label: "Light" }]} value={mode} onChange={setMode} />
      </Group>

      <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
        <Logo size={36} />
        <T v="caption" color="text3">ChainBrain 链AI脑 · owner app · testnet build</T>
        {pending.length > 0 && <T v="caption" color="stepup">{pending.length} request{pending.length > 1 ? "s" : ""} waiting</T>}
      </View>
    </Screen>
  );
}
