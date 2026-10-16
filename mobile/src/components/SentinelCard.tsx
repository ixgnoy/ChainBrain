// The Sentinel in the chat and Activity: a second AI layer that watches the pocket's whole event stream. A freeze is a full
// card with the reason, who answered the AI questions (Jev, the Claude stand-in or the built-in network's scripted check), the
// freeze transaction and an Unfreeze button (owner key only). A hold asks for the owner's OK; watching and clearing are quiet
// lines. Everything shown comes from typed fields; nothing a seller wrote reaches these words.
import React, { useState } from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Button } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Rise } from "../ui/Rise";
import { haptic } from "../haptics";
import { notify } from "../lib/toast";
import { cleanText } from "../lib/sanitize";
import { aiName, sameAddr, type SentinelView } from "../lib/events";
import { EventCard } from "./EventCard";
import { BrandSquare, TxRow } from "./ActivityRow";
import { TxLink } from "./TxLink";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const reason = (v: SentinelView) => cleanText(v.signals[0]?.text ?? "Unusual behaviour", 140);

/** Unfreeze: an owner transaction (Pocket.unfreeze). Only shown to the owner while the pocket is frozen. */
export function UnfreezeButton({ pocket }: { pocket: string }) {
  const { wallet, findPocket, recordTx, refreshPockets, setNotice } = useApp();
  const [busy, setBusy] = useState(false);
  const p = findPocket(pocket);
  if (!wallet || !p?.owned || !p.frozen) return null;
  const go = async () => {
    setBusy(true);
    try {
      const r = await wallet.unfreeze(p.address);
      recordTx({ kind: "unfreeze", pocket: p.address, hash: r.hash });
      haptic.success();
      setNotice({ title: `${cleanText(p.name, 30)} unfrozen`, pocket: p.address, txs: [{ hash: r.hash }] });
      await refreshPockets();
    } catch (e) {
      haptic.error();
      notify("Could not unfreeze. Try again.");
    } finally { setBusy(false); }
  };
  return <Button label="Unfreeze" small kind="secondary" onPress={go} loading={busy} />;
}

export function SentinelCard({ v }: { v: SentinelView }) {
  const { findPocket } = useApp();
  const p = v.pocket ? findPocket(v.pocket) : undefined;
  if (v.kind === "watch" || v.kind === "clear") return <SentinelLine v={v} />;
  const freeze = v.kind === "freeze";
  const rows: [string, string][] = [
    ["What it saw", reason(v)],
    ["AI check", v.ai ? `${aiName(v.ai.by)} · hijack ${pct(v.ai.hijack)} · says "${v.ai.action}" (${pct(v.ai.confidence)} sure)` : "Rules only"],
    ["Decided by", v.raisedBy === "ai" ? "The AI check raised the rules' decision" : "The rules (the AI can only make it stricter)"],
  ];
  return (
    <EventCard
      tone={freeze ? "blocked" : "waiting"} alert={v.key}
      title={freeze ? "Sentinel froze this pocket" : "Sentinel wants your OK"}
      body={freeze ? `${reason(v)}. No money moved. Only you can unfreeze it.` : `${reason(v)}. Your next payment needs your signature.`}
      why={{
        title: "Why", rows, codes: v.signals.map((s) => s.id),
        children: <View style={{ gap: 6 }}>
          {v.tx ? <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><T v="cap" color="muted">Freeze transaction</T><TxLink tx={v.tx} /></View> : null}
          {v.note ? <T v="cap" color="muted">{cleanText(v.note, 160)}</T> : null}
          <T v="cap" color="faint">The Sentinel's key can only freeze. It can't move money, change a rule or unfreeze.</T>
        </View>,
      }}
    >
      {v.ai ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="eye" size={16} color={c.muted} />
          <T v="cap" color="muted" style={{ flex: 1 }}>AI check: hijack {pct(v.ai.hijack)} · {v.ai.by === "jev" ? "Jev" : v.ai.by === "claude-haiku" ? "Claude Haiku" : "scripted"}</T>
        </View>
      ) : null}
      {freeze && p?.frozen ? <UnfreezeButton pocket={p.address} /> : null}
    </EventCard>
  );
}

/** Watching and clearing: one quiet line each. */
export function SentinelLine({ v }: { v: SentinelView }) {
  const text = v.kind === "clear"
    ? v.by === "unfreeze" ? "Sentinel: you unfroze the pocket. Watching again from now." : "Sentinel: you co-signed, so the hold is lifted."
    : `Sentinel is watching: ${reason(v).replace(/^./, (x) => x.toLowerCase())}`;
  return (
    <Rise dy={6} layout style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon name="eye" size={16} color={v.kind === "clear" ? c.accent : c.warning} />
      <T v="cap" color="muted" style={{ flex: 1 }}>{text}</T>
    </Rise>
  );
}

/** A freeze or hold as an Activity row (VaultBank's transaction row, like ActivityRow). */
export function SentinelActivityRow({ v, last, delay = 0 }: { v: SentinelView; last?: boolean; delay?: number }) {
  const { findPocket, setExplorerTx } = useApp();
  const pocket = findPocket(v.pocket);
  const title = v.kind === "freeze" ? "Sentinel froze the pocket" : "Sentinel asked for your OK";
  return (
    <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={10} layout>
      <TxRow square={<BrandSquare icon={v.kind === "freeze" ? "freeze" : "eye"} tone={v.kind === "freeze" ? "fill" : "blue"} />} title={title}
        sub={[pocket ? cleanText(pocket.name, 24) : undefined, new Date(v.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })].filter(Boolean).join(" · ")}
        rightSub={v.kind === "freeze" ? (v.tx ? "On chain" : "Held") : "Needs you"} rightSubTone={v.kind === "freeze" ? "ink2" : "blueInk"}
        onPress={v.tx ? () => setExplorerTx(v.tx!) : undefined} last={last}
        a11y={v.tx ? `Sentinel froze ${pocket?.name ?? "the pocket"}. Open transaction` : title} />
    </Rise>
  );
}

export const isSentinelAlert = (v: SentinelView) => v.kind === "freeze" || v.kind === "hold";
export const forPocket = (list: SentinelView[], pocket?: string) => list.filter((v) => !pocket || sameAddr(v.pocket, pocket));
