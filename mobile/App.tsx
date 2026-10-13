import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Address, Hex } from "viem";
import { loadConfig, API, type Config } from "./src/lib/shared";
import { ownerWallet } from "./src/lib/wallet";
import { loadKey, loadPockets, savePockets } from "./src/lib/keystore";
import { usePolledEvents } from "./src/lib/events";
import { Setup } from "./src/screens/Setup";
import { Home } from "./src/screens/Home";
import { Pocket } from "./src/screens/Pocket";
import { Agent } from "./src/screens/Agent";
import { T, usePalette } from "./src/ui";

type Tab = "home" | "agent" | "pocket";

export default function App() {
  const p = usePalette();
  const [cfg, setCfg] = useState<Config>();
  const [err, setErr] = useState("");
  const [pk, setPk] = useState<Hex | null | undefined>(undefined);
  const [pockets, setPockets] = useState<Address[]>([]);
  const [active, setActive] = useState<Address>();
  const [tab, setTab] = useState<Tab>("home");
  const [refresh, setRefresh] = useState(0);
  const wallet = useMemo(() => (pk ? ownerWallet(pk) : undefined), [pk]);
  const events = usePolledEvents(active);
  const bump = () => setRefresh((n) => n + 1);

  useEffect(() => { loadConfig().then(setCfg).catch(() => setErr(`Wallet API not reachable at ${API}. On a phone, set EXPO_PUBLIC_API_URL to your laptop's LAN IP.`)); }, []);
  useEffect(() => { loadKey().then(setPk).catch(() => setPk(null)); }, []);
  useEffect(() => {
    if (!wallet) return;
    loadPockets(wallet.address).then((list) => { setPockets(list); setActive((a) => a ?? list[0]); });
  }, [wallet]);
  useEffect(() => { if (events.at(-1)?.type === "payment") bump(); }, [events.length]);

  const addPocket = (a: Address) => {
    const next = [a, ...pockets.filter((x) => x.toLowerCase() !== a.toLowerCase())];
    setPockets(next);
    setActive(a);
    if (wallet) void savePockets(wallet.address, next);
  };

  let body;
  if (err) body = <T color={p.danger}>{err}</T>;
  else if (!cfg || pk === undefined) body = <T muted>Loading…</T>;
  else if (!wallet) body = <Setup onReady={setPk} />;
  else if (tab === "home") body = <Home cfg={cfg} wallet={wallet} pockets={pockets} active={active} refresh={refresh} onOpen={(a) => { setActive(a); setTab("pocket"); }} onAdd={addPocket} onChanged={bump} />;
  else if (!active) body = <T muted>Create a pocket first.</T>;
  else if (tab === "agent") body = <Agent pocket={active} wallet={wallet} events={events} onChanged={bump} />;
  else body = <Pocket cfg={cfg} wallet={wallet} pocket={active} events={events} refresh={refresh} onChanged={bump} />;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56 }} keyboardShouldPersistTaps="handled">{body}</ScrollView>
      {wallet && cfg && (
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: p.line, backgroundColor: p.card, paddingBottom: 24 }}>
          {(["home", "agent", "pocket"] as Tab[]).map((t) => (
            <Pressable key={t} accessibilityRole="tab" onPress={() => setTab(t)} style={{ flex: 1, padding: 14, alignItems: "center" }}>
              <Text style={{ color: tab === t ? p.accent : p.muted, fontWeight: "600" }}>{t === "home" ? "Wallet" : t === "agent" ? "Agent" : "Pocket"}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
