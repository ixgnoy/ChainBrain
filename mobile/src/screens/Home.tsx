import { useEffect, useState } from "react";
import { Linking, Pressable, TextInput, View } from "react-native";
import { formatEther, isAddress, type Address } from "viem";
import { PRESETS, toPocketArgs, type PresetValues } from "../lib/presets";
import { readPocket, pocketStatus, type OwnerWallet, type PocketView } from "../lib/wallet";
import { formatUsd, shortAddr, type Config } from "../lib/shared";
import { Btn, Card, T, s, usePalette } from "../ui";

/** Main wallet, pockets as cards, and New pocket from a preset (create, then fund: one signature each). */
export function Home(props: { cfg: Config; wallet: OwnerWallet; pockets: Address[]; active?: Address; refresh: number; onOpen(p: Address): void; onAdd(p: Address): void; onChanged(): void }) {
  const p = usePalette();
  const [bal, setBal] = useState<{ usdc: bigint; eth: bigint }>();
  const [views, setViews] = useState<Record<string, PocketView>>({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [existing, setExisting] = useState("");
  useEffect(() => { props.wallet.balances().then(setBal).catch(() => {}); }, [props.wallet, props.refresh]);
  useEffect(() => { for (const a of props.pockets) readPocket(a).then((v) => setViews((x) => ({ ...x, [a]: v }))).catch(() => {}); }, [props.pockets, props.refresh]);

  async function create(preset: PresetValues) {
    setMsg("");
    try {
      const payTo = Object.fromEntries(props.cfg.sellers.map((x) => [x.id, x.payTo]));
      const a = toPocketArgs(preset, props.cfg.agent, payTo);
      setBusy("Creating pocket…");
      const { pocket, tx } = await props.wallet.createPocket(a);
      setBusy("Funding pocket…");
      const f = await props.wallet.fund(pocket, a.budget);
      setMsg(`Created ${shortAddr(tx)} · funded ${shortAddr(f.hash)}`);
      props.onAdd(pocket);
      props.onChanged();
    } catch (e) {
      setMsg((e as Error).message.split("\n")[0]);
    } finally {
      setBusy("");
    }
  }

  return (
    <View>
      <Card>
        <T muted>Main wallet {shortAddr(props.wallet.address)}</T>
        <T big>{bal ? `US$${formatUsd(bal.usdc)}` : "—"}</T>
        <T muted>{bal ? `${Number(formatEther(bal.eth)).toFixed(4)} ETH for gas` : ""}</T>
      </Card>
      <Card>
        <T bold>Pockets</T>
        {props.pockets.length === 0 && <T muted>No pockets yet.</T>}
        {props.pockets.map((a) => {
          const v = views[a];
          return (
            <Pressable key={a} onPress={() => props.onOpen(a)} style={[s.input, { borderColor: a === props.active ? p.accent : p.line }]}>
              <View style={s.row}>
                <T>{shortAddr(a)}</T>
                <T bold>{v ? `US$${formatUsd(v.balance)}` : "…"}</T>
              </View>
              <T muted>{v ? `${pocketStatus(v)} · cap US$${formatUsd(v.cap)} · ask above ${formatUsd(v.askAbove)}` : ""}</T>
            </Pressable>
          );
        })}
      </Card>
      <Card>
        <T bold>New pocket</T>
        {Object.values(PRESETS).map((pr) => (
          <Btn key={pr.label} kind="ghost" disabled={!!busy} label={`${pr.label}: US$${pr.budget}, cap ${pr.cap}, ask ${pr.askAbove}`} onPress={() => void create(pr)} />
        ))}
        {!!busy && <T muted>{busy}</T>}
        {!!msg && <T muted>{msg}</T>}
        <TextInput value={existing} onChangeText={setExisting} placeholder="…or add an existing pocket address" placeholderTextColor={p.muted}
          autoCapitalize="none" style={[s.input, { color: p.text, borderColor: p.line }]} />
        <Btn kind="ghost" label="Add pocket" disabled={!isAddress(existing)} onPress={() => { props.onAdd(existing as Address); setExisting(""); }} />
        <Pressable onPress={() => void Linking.openURL(`https://sepolia.basescan.org/address/${props.wallet.address}`)}><T color={p.accent}>View main wallet on Basescan</T></Pressable>
      </Card>
    </View>
  );
}
