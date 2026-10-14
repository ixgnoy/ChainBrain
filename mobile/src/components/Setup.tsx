// First run: import the owner key (testnet) or create a new one. The key never leaves the device (SecureStore). Their verified key flow, our look.
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { TriangleAlert } from "lucide-react-native";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useApp } from "../store";
import { isPrivateKey } from "../lib/keystore";
import { Button, TestnetPill } from "../ui/primitives";
import { T } from "../ui/Text";
import { Logo } from "../ui/Logo";

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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, justifyContent: "center", gap: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 14, alignItems: "flex-start" }}>
            <Logo size={56} />
            <TestnetPill />
            <T v="displayLg">Give your AI a pocket, not your wallet.</T>
            <T v="body" color="text2">Your main wallet key stays on this phone, in the Keychain or Keystore. Your agent only ever spends what you put in a pocket.</T>
          </View>
          <View style={{ gap: 12 }}>
            <Input
              value={pk} onChangeText={setPk} placeholder="Paste a testnet private key (0x…)"
              autoCapitalize="none" autoCorrect={false} secureTextEntry accessibilityLabel="Private key" className="h-14 font-mono text-sm"
            />
            {!!err && <T v="bodySm" color="refused">{err}</T>}
            <Button label="Import key" icon="key" disabled={!isPrivateKey(pk)} loading={busy} onPress={() => run(() => importKey(pk))} />
            <Button label="Create a new key" kind="secondary" icon="plus" disabled={busy} onPress={() => run(newKey)} />
          </View>
          <Alert icon={TriangleAlert} iconClassName="text-stepup" className="bg-stepup-soft border-stepup-line">
            <AlertDescription className="text-t2">Testnet only. Never import a key that holds real money.</AlertDescription>
          </Alert>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
