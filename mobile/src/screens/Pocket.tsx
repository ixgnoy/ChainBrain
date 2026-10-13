import { useEffect, useState } from "react";
import { Linking, Pressable, Switch, View } from "react-native";
import type { Address } from "viem";
import { readPocket, pocketStatus, type OwnerWallet, type PocketView } from "../lib/wallet";
import { formatUsd, shortAddr, txUrl, REASONS, NEVER, type Config } from "../lib/shared";
import type { WalletEvent } from "../lib/events";
import { Btn, Card, T, s, usePalette } from "../ui";

/** Balance, rules, allowed sellers (each toggle is an owner tx), activity trail, Revoke and Return funds. */
export function Pocket(props: { cfg: Config; wallet: OwnerWallet; pocket: Address; events: WalletEvent[]; refresh: number; onChanged(): void }) {
  const p = usePalette();
  const [v, setV] = useState<PocketView>();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { readPocket(props.pocket).then(setV).catch((e) => setMsg(String(e))); }, [props.pocket, props.refresh]);

  async function act(label: string, f: () => Promise<{ hash: string }>) {
    setBusy(label);
    setMsg("");
    try {
      const { hash } = await f();
      setMsg(`${label}: ${hash}`);
      props.onChanged();
    } catch (e) {
      setMsg((e as Error).message.split("\n")[0]);
    } finally {
      setBusy("");
    }
  }
  if (!v) return <Card><T muted>{msg || "Loading pocket…"}</T></Card>;
  const trail = props.events.filter((e) => ["payment", "refusal", "disclosure"].includes(e.type) || (e.type === "intent" && e.approval?.status === "approved"));

  return (
    <View>
      <Card>
        <View style={s.row}>
          <T bold>Pocket {shortAddr(v.address)}</T>
          <T color={v.revoked ? p.danger : p.ok}>{pocketStatus(v)}</T>
        </View>
        <T big>US${formatUsd(v.balance)}</T>
        <T muted>Cap US${formatUsd(v.cap)} · ask me above {v.askAbove === NEVER ? "never" : `US$${formatUsd(v.askAbove)}`} · agent {shortAddr(v.agent)}</T>
        <T muted>Expires {new Date(Number(v.expiresAt) * 1000).toLocaleString()}</T>
      </Card>
      <Card>
        <T bold>Allowed sellers</T>
        {props.cfg.sellers.map((x) => {
          const on = v.allowed.includes(x.id);
          return (
            <View key={x.id} style={s.row}>
              <T>{x.name} <T muted>{x.category}</T></T>
              <Switch value={on} disabled={!!busy} onValueChange={() => void act(on ? `Removed ${x.name}` : `Allowed ${x.name}`, () => props.wallet.setSeller(v.address, x.payTo, !on))} />
            </View>
          );
        })}
      </Card>
      <Card>
        <Btn kind="danger" label="Revoke" disabled={!!busy || v.revoked} onPress={() => void act("Revoked", () => props.wallet.revoke(v.address))} />
        <Btn kind="ghost" label="Return funds" disabled={!!busy || v.balance === 0n} onPress={() => void act("Returned funds", () => props.wallet.returnFunds(v.address))} />
        {!!busy && <T muted>{busy}…</T>}
        {!!msg && (msg.includes(": 0x")
          ? <Pressable onPress={() => void Linking.openURL(txUrl(msg.split(": ")[1]))}><T color={p.accent}>{msg.split(": ")[0]} · view tx</T></Pressable>
          : <T muted>{msg}</T>)}
      </Card>
      <Card>
        <T bold>Activity</T>
        {trail.length === 0 && <T muted>Nothing yet.</T>}
        {trail.map((e, i) => (
          <View key={i}>
            {e.type === "intent" && <T>Task confirmed: <T muted>{e.approval.text.split("\n")[0]}</T></T>}
            {e.type === "payment" && (
              <Pressable onPress={() => void Linking.openURL(txUrl(e.tx))}>
                <T>Paid US${formatUsd(BigInt(e.amount))} to {e.sellerId}{e.cosigned ? " (co-signed)" : ""} <T color={p.accent}>tx</T></T>
              </Pressable>
            )}
            {e.type === "refusal" && <T>Refused {e.sellerId}: <T color={p.danger}>{e.reason}</T> <T muted>{REASONS[e.reason] ?? ""}</T></T>}
            {e.type === "disclosure" && <T color={p.warn}>{e.sellerId} asked for {e.asked?.join(", ")}{e.signRequest ? " and a signature" : ""}: refused</T>}
          </View>
        ))}
      </Card>
    </View>
  );
}
