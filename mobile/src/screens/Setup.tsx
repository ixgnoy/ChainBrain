import { useState } from "react";
import { TextInput } from "react-native";
import type { Hex } from "viem";
import { createKey, saveKey } from "../lib/keystore";
import { Btn, Card, T, s, usePalette } from "../ui";

/** First run: import the demo owner key (testnet) or create a new one. The key never leaves the device. */
export function Setup(props: { onReady(pk: Hex): void }) {
  const p = usePalette();
  const [pk, setPk] = useState("");
  const [err, setErr] = useState("");
  return (
    <Card>
      <T big>链AI脑 ChainBrain</T>
      <T>Give your AI a pocket, not your wallet.</T>
      <T muted>Your main wallet key is stored only on this phone (Keychain / Keystore). Testnet only.</T>
      <TextInput value={pk} onChangeText={setPk} placeholder="Paste a testnet private key (0x…)" placeholderTextColor={p.muted}
        autoCapitalize="none" autoCorrect={false} secureTextEntry style={[s.input, { color: p.text, borderColor: p.line }]} />
      {!!err && <T color={p.danger}>{err}</T>}
      <Btn label="Import key" onPress={() => saveKey(pk).then(() => props.onReady(pk.trim() as Hex)).catch((e) => setErr(e.message))} />
      <Btn kind="ghost" label="Create a new key" onPress={() => createKey().then(props.onReady).catch((e) => setErr(e.message))} />
    </Card>
  );
}
