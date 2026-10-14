// First run: import the owner key (testnet) or create a new one. The key never leaves the device (SecureStore). Their verified key flow, our look.
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, F } from "../theme";
import { useApp } from "../store";
import { isPrivateKey } from "../lib/keystore";
import { Ambient } from "../ui/Screen";
import { Button, TestnetPill } from "../ui/primitives";
import { T } from "../ui/Text";
import { Logo } from "../ui/Logo";
import { Icon } from "../ui/Icon";
import { radius } from "../tokens";

export function Setup() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { importKey, newKey } = useApp();
  const [pk, setPk] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(""); try { await f(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Ambient />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, justifyContent: "center", gap: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 14, alignItems: "flex-start" }}>
            <Logo size={56} />
            <TestnetPill />
            <T v="displayLg" style={{ fontSize: 36, lineHeight: 40 }}>Give your AI a pocket, not your wallet.</T>
            <T v="body" color="text2">Your main wallet key stays on this phone, in the Keychain or Keystore. Your agent only ever spends what you put in a pocket.</T>
          </View>
          <View style={{ gap: 12 }}>
            <TextInput
              value={pk} onChangeText={setPk} placeholder="Paste a testnet private key (0x…)" placeholderTextColor={c.text3}
              autoCapitalize="none" autoCorrect={false} secureTextEntry accessibilityLabel="Private key"
              style={{ height: 56, borderRadius: radius.md, backgroundColor: c.bgElev2, borderWidth: 1, borderColor: c.hairlineStrong, paddingHorizontal: 16, color: c.text, fontFamily: F.mono, fontSize: 14 }}
            />
            {!!err && <T v="bodySm" color="refused">{err}</T>}
            <Button label="Import key" icon="key" disabled={!isPrivateKey(pk)} loading={busy} onPress={() => run(() => importKey(pk))} />
            <Button label="Create a new key" kind="secondary" icon="plus" disabled={busy} onPress={() => run(newKey)} />
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: c.stepupBg, borderColor: c.stepupBorder, borderWidth: 1, borderRadius: radius.lg, padding: 14 }}>
            <Icon name="alert" size={18} color={c.stepup} />
            <T v="bodySm" color="text2" style={{ flex: 1 }}>Testnet only. Never import a key that holds real money.</T>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
