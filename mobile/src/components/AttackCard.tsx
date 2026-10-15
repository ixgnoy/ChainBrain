// The phone's side of the attack arena: when the console (or the owner) tries something on this pocket, the chat and Activity say
// so calmly and plainly. Reason codes stay under "Why"; a hash opens the in-app explorer. These events can arrive outside a chat
// turn (the console sets them off through the relay), so the chat also shows the ones that came before its first message.
import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Avatar } from "../ui/kit";
import { T } from "../ui/Text";
import { Rise } from "../ui/Rise";
import { Press } from "../ui/kit";
import { Icon } from "../ui/Icon";
import { cleanText } from "../lib/sanitize";
import { describeRow } from "../lib/plain";
import { money, shortHex, stamp } from "../lib/util";
import type { WalletEvent } from "../lib/events";
import { EventCard } from "./EventCard";
import { TxLink } from "./TxLink";

/** Forced transfers that reverted, and the attacks the chat refused. (An induced attack that fooled the agent is told by its forced event.) */
export const isAttackEvent = (e: WalletEvent) => (e.type === "forced" && !!e.reverted) || (e.type === "attack" && !(e.attack === "induced" && e.verdict === "fooled"));

const amountOf = (e: WalletEvent) => { try { return BigInt(e.amount ?? 0); } catch { return 0n; } };

export type AttackInfo = { key: string; title: string; body: string; /** the hash a tap opens */ tx?: string; txs: { label: string; hash: string }[]; codes: string[]; verdict: string };
export function attackInfo(e: WalletEvent): AttackInfo | null {
  if (e.type === "forced") {
    if (!e.reverted) return null;
    const m = money(amountOf(e)), to = shortHex(String(e.to ?? ""), 6, 4);
    return {
      key: `forced:${e.tx}`, title: `Blocked a transfer of ${m}`, tx: String(e.tx), txs: [{ label: "Transaction", hash: String(e.tx) }], codes: [String(e.reason ?? "SELLER_NOT_ALLOWED")], verdict: "Reverted",
      body: e.via === "agent"
        ? `Someone tricked your agent into signing ${m} to ${to}. Your pocket refused it on-chain.`
        : `Someone used your agent's key to send ${m} to ${to}. Your pocket refused it on-chain.`,
    };
  }
  if (e.type !== "attack") return null;
  const key = `attack:${e.attack}:${e.at}`;
  if (e.attack === "escalation") {
    const txs = (Array.isArray(e.txs) ? e.txs : []).filter((t: any) => t?.tx).map((t: any) => ({ label: cleanText(String(t.call ?? "Call"), 30), hash: String(t.tx) }));
    if (!txs.length && e.tx) txs.push({ label: "Transaction", hash: String(e.tx) });
    return { key, title: "Asked to change your rules", body: "Refused: only your key can.", tx: txs[0]?.hash, txs, codes: [String(e.reason ?? "NOT_OWNER")], verdict: "Refused" };
  }
  if (e.attack === "extraction") return { key, title: "Asked for your key and private data", body: "Nothing was shared.", txs: [], codes: [String(e.reason ?? "DISCLOSURE_REFUSED")], verdict: "Refused" };
  if (e.attack === "induced") return { key, title: "Asked to send money to an address", body: "The agent refused. No money moved.", txs: [], codes: [String(e.reason ?? "NOT_A_PURCHASE")], verdict: "Refused" };
  return null;
}

export function AttackCard({ e }: { e: WalletEvent }) {
  const { setExplorerTx } = useApp();
  const a = attackInfo(e);
  if (!a) return null;
  return (
    <EventCard
      tone="blocked" alert={a.key} title={a.title} body={a.body}
      onPress={a.tx ? () => setExplorerTx(a.tx!) : undefined} a11y={`${a.title}. ${a.body}${a.tx ? " Open transaction" : ""}`}
      why={{ codes: a.codes, children: a.txs.length ? <View style={{ gap: 4 }}>{a.txs.map((t) => <View key={t.hash} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><T v="cap" color="muted">{t.label}</T><TxLink tx={t.hash} /></View>)}</View> : undefined }}
    />
  );
}

/** An attack as an Activity row (same layout as ActivityRow). */
export function AttackActivityRow({ e, onPress, last, delay = 0 }: { e: WalletEvent; onPress?: () => void; last?: boolean; delay?: number }) {
  const { findPocket } = useApp();
  const a = attackInfo(e);
  if (!a) return null;
  const pocket = findPocket(e.pocket);
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingHorizontal: 16 }}>
      <Avatar icon="shield" tone="fill" size={40} />
      <View style={{ flex: 1, gap: 1, paddingVertical: 8 }}>
        <T v="row" numberOfLines={1}>{a.title}</T>
        <T v="sub" color="muted" numberOfLines={1}>{[pocket ? cleanText(pocket.name, 24) : undefined, new Date(e.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })].filter(Boolean).join(" · ")}</T>
      </View>
      <T v="cap" w="medium" color="ink2">{a.verdict}</T>
    </View>
  );
  return (
    <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={10} layout>
      {onPress ? <Press kind="row" onPress={onPress} haptics="light" accessibilityRole="button" accessibilityLabel={`${a.title}. ${a.verdict}`}>{body}</Press> : body}
      {last ? null : <View style={{ height: 1, backgroundColor: c.line, marginLeft: 70 }} />}
    </Rise>
  );
}

/** A quiet one-line Activity row for a run of repeats ("3 refused after you stopped it"). */
export function NoteRow({ title, sub, right, last, delay = 0 }: { title: string; sub: string; right?: string; last?: boolean; delay?: number }) {
  return (
    <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={10} layout>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingHorizontal: 16 }}>
        <Avatar icon="shield" tone="fill" size={40} />
        <View style={{ flex: 1, gap: 1, paddingVertical: 8 }}>
          <T v="row" numberOfLines={2}>{title}</T>
          <T v="sub" color="muted" numberOfLines={2}>{sub}</T>
        </View>
        {right ? <T v="cap" w="medium" color="ink2">{right}</T> : null}
      </View>
      {last ? null : <View style={{ height: 1, backgroundColor: c.line, marginLeft: 70 }} />}
    </Rise>
  );
}
