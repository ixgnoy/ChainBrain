// Move money to a pocket / Return funds / Revoke, signed on this phone. Opened from a pocket, the sheet is about that pocket
// only (its card, its agent, what will happen), so an irreversible revoke can never land on the wrong one; opened from Home
// (moving money), the owner picks a pocket from a list that shows each pocket's card colour and the agent that holds it.
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useApp, type Pocket } from "../store";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { HoldToRevoke } from "../ui/HoldToRevoke";
import { Button, Chip, ListRow } from "../ui/kit";
import { AgentAvatar } from "../ui/AgentAvatar";
import { type IconName } from "../ui/Icon";
import { faceOf, toneFor } from "./PocketFace";
import { agentInfo } from "../../../shared/sim/agents";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { haptic } from "../haptics";
import { autoplayRunning } from "../lib/autoplayTargets";
import { cleanText } from "../lib/sanitize";
import { parseUsd } from "../lib/shared";
import { usd, money } from "../lib/util";
import { c } from "../tokens";
import { SheetSuccess } from "./SheetSuccess";
import { ErrorNote } from "./ErrorNote";

type Mode = "fund" | "return" | "revoke";
const COPY: Record<Mode, { title: string; hint: string }> = {
  fund: { title: "Move to a pocket", hint: "From your main wallet into a pocket. What is in the pocket is its agent's whole budget." },
  return: { title: "Return funds", hint: "Send everything left in the pocket back to your main wallet. The pocket stays active." },
  revoke: { title: "Revoke this pocket", hint: "Two transactions, both signed here." },
};
const AMOUNTS = ["0.50", "1.00", "2.00", "5.00"];

export const txError = (e: unknown) => {
  const m = String((e as Error)?.message ?? e);
  if (/insufficient funds|exceeds the balance|gas/i.test(m)) return "Your main wallet needs a little ETH for fees and enough USDC. On the test network, Settings can add test funds.";
  if (/reverted/i.test(m)) return "The transaction reverted on chain. Nothing changed.";
  if (/User rejected|denied/i.test(m)) return "Cancelled.";
  return "That did not go through. Check the connection and try again.";
};

export function ActionSheet() {
  const { action, setAction } = useApp();
  const last = useRef(action);
  if (action) last.current = action;
  const a = action ?? last.current;
  return (
    <Sheet visible={!!action} onClose={() => setAction(null)}>
      {a ? <Body mode={a.mode} initial={a.pocket} close={() => setAction(null)} /> : null}
    </Sheet>
  );
}

function Body({ mode, initial, close }: { mode: Mode; initial?: string; close: () => void }) {
  const { pockets, wallet, refreshPockets, balances, recordTx, setNotice, active } = useApp();
  const scoped = !!initial; // opened from a pocket: about that pocket only
  const [done, setDone] = useState<{ title: string; hash: string; txs?: { label?: string; hash: string }[] } | null>(null);
  const [sel, setSel] = useState<string | undefined>(initial);
  const [amount, setAmount] = useState("1.00");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formH = useRef(0);
  // preselect: the pocket asked for, else the one the agent is on, else the first that fits (one tap fewer every time)
  useEffect(() => {
    const ok = (p: Pocket) => p.owned && (mode === "return" ? p.balance > 0n : !p.revoked);
    const pick = initial ?? (active && ok(active) ? active.address : pockets.find(ok)?.address);
    setDone(null); setSel(pick); setError(null);
  }, [initial, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // revoke: let the success moment play, then close (the pocket page shows the hash notice)
  useEffect(() => {
    if (mode !== "revoke" || !done) return;
    const t = setTimeout(close, 1400);
    return () => clearTimeout(t);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  // the hidden auto-play lets the success moment play, then closes the sheet the way a finger would
  useEffect(() => {
    if (mode === "revoke" || !done || !autoplayRunning()) return;
    const t = setTimeout(close, 2000);
    return () => clearTimeout(t);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const eligible = (p: Pocket) => p.owned && (mode === "return" ? true : !p.revoked);
  const chosen = pockets.find((p) => p.address === sel);
  const fail = (e: unknown): never => { setError(txError(e)); throw e; };

  // fund and return stay open on success so the owner reads the transaction hash; revoke closes and the pocket page shows it
  const doFund = async () => {
    try {
      const v = parseUsd(amount); const r = await wallet!.fund(chosen!.address, v);
      recordTx({ kind: "fund", pocket: chosen!.address, hash: r.hash, amount: v.toString() });
      setDone({ title: `Moved US$${amount} to ${cleanText(chosen!.name, 30)}`, hash: r.hash }); await refreshPockets();
    } catch (e) { fail(e); }
  };
  const doReturn = async () => {
    try {
      const had = chosen!.balance; const r = await wallet!.returnFunds(chosen!.address);
      recordTx({ kind: "return", pocket: chosen!.address, hash: r.hash, amount: had.toString() });
      setDone({ title: `Returned ${money(had)} to your main wallet`, hash: r.hash }); await refreshPockets();
    } catch (e) { fail(e); }
  };
  // Revoke = freeze for good, then sweep the balance back: two owner transactions (Pocket.sol revoke, then returnFunds)
  const doRevoke = async () => {
    setBusy(true); setError(null);
    try {
      const p = chosen!;
      const name = cleanText(p.name, 30);
      const had = p.balance;
      const r = await wallet!.revoke(p.address);
      recordTx({ kind: "revoke", pocket: p.address, hash: r.hash });
      const txs: { label?: string; hash: string }[] = [{ label: "Revoke", hash: r.hash }];
      if (had > 0n) {
        const back = await wallet!.returnFunds(p.address);
        recordTx({ kind: "return", pocket: p.address, hash: back.hash, amount: had.toString() });
        txs.push({ label: `Return ${money(had)}`, hash: back.hash });
      }
      const title = had > 0n ? `${name} revoked · ${money(had)} returned` : `${name} revoked`;
      setNotice({ title, pocket: p.address, txs });
      setDone({ title, hash: r.hash, txs });
      haptic.warning();
      await refreshPockets();
    }
    catch (e) { haptic.error(); setError(txError(e)); } finally { setBusy(false); }
  };

  const form = (
    <Animated.View key="form" onLayout={(e) => { formH.current = Math.max(formH.current, e.nativeEvent.layout.height); }} style={{ flexShrink: 1 }}>
      <SheetScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <T v="section">{COPY[mode].title}</T>
          <T v="body" color="ink2">{COPY[mode].hint}</T>
          {mode === "fund" && balances ? <T v="sub" color="muted">Main wallet: {money(balances.usdc)}</T> : null}
        </View>
        {scoped && chosen ? <OnePocket p={chosen} tone={toneFor(pockets, chosen.address)} /> : null}
        {mode === "revoke" && chosen ? <RevokeOutcome p={chosen} /> : null}
        {scoped ? null : pockets.length === 0 ? <T v="sub" color="muted">No pockets yet.</T> : (
          <View style={{ backgroundColor: c.fill, borderRadius: 20, overflow: "hidden" }}>
            {pockets.map((p, i) => {
              const ok = eligible(p);
              const on = sel === p.address;
              return (
                <ListRow key={p.address} last={i === pockets.length - 1} a11y={`Choose ${cleanText(p.name, 30)}`}
                  onPress={ok ? () => { setSel(p.address); setError(null); } : undefined}
                  avatar={<FaceChip tone={toneFor(pockets, p.address)} on={on} />}
                  title={cleanText(p.name, 30)} sub={`${money(p.balance)} · ${agentInfo(p.agentId ?? "")?.name ?? "ChainBrain"}${p.revoked ? " · revoked" : ""}${!p.owned ? " · other key" : ""}`}>
                  {on ? <Icon name="check" size={20} color={c.ink} stroke={2.4} /> : null}
                </ListRow>
              );
            })}
          </View>
        )}
        {mode === "fund" && (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {AMOUNTS.map((a) => <Chip key={a} label={`US$${a}`} on={amount === a} onPress={() => setAmount(a)} />)}
          </View>
        )}
        {mode === "return" && chosen && <T v="sub" color="ink2">{money(chosen.balance)} comes back to your main wallet.</T>}
        {error ? <ErrorNote text={error} /> : null}
      </SheetScroll>
    </Animated.View>
  );

  return (
    <View style={{ flexShrink: 1 }}>
      {done ? <SheetSuccess key="ok" minHeight={formH.current} title={done.title} txs={done.txs ?? [{ hash: done.hash }]} /> : form}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
        {mode === "fund" && <SlideToConfirm key={`f${sel}${amount}${error}`} label={`Slide to move US$${amount}`} doneLabel="Moved" disabled={!chosen || !wallet} onConfirm={doFund} />}
        {mode === "return" && <SlideToConfirm key={`r${sel}${error}`} auto="return.slide" label="Slide to return funds" doneLabel="Returned" disabled={!chosen || !wallet || chosen.balance === 0n} onConfirm={doReturn} />}
        {mode === "revoke" && (done ? <View style={{ height: 64 }} /> : <HoldToRevoke auto="revoke.hold" label={chosen && chosen.balance > 0n ? `Hold to revoke and return ${money(chosen.balance)}` : "Hold to revoke"} disabled={!chosen || !wallet} busy={busy} onComplete={doRevoke} />)}
        <Button label={done ? "Done" : "Cancel"} kind={done ? "secondary" : "text"} auto={done ? "sheet.close" : undefined} onPress={close} />
      </View>
    </View>
  );
}

/** The one pocket this sheet is about: a small card face with its name, balance and agent. */
function OnePocket({ p, tone }: { p: Pocket; tone: number }) {
  const face = faceOf(tone);
  const agent = agentInfo(p.agentId ?? "");
  return (
    <View accessible accessibilityLabel={`${cleanText(p.name, 30)}, ${money(p.balance)}, held by ${agent?.name ?? "ChainBrain"}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: c.fill }}>
      <View style={{ width: 56, height: 36, borderRadius: 7, backgroundColor: face.face, borderWidth: "hatch" in face ? 1 : 0, borderColor: c.line, justifyContent: "flex-end", padding: 5 }}>
        <View style={{ height: 5, borderRadius: 2, backgroundColor: face.band, opacity: 0.9 }} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="row" numberOfLines={1}>{cleanText(p.name, 30)}</T>
        <T v="cap" color="muted">{`${money(p.balance)} · ${agent?.name ?? "ChainBrain"} · *${p.address.slice(-4).toUpperCase()}`}</T>
      </View>
      {agent ? <AgentAvatar kind={agent.id} size={28} /> : null}
    </View>
  );
}

/** What revoking does, in money and in who can act, before the owner holds. */
function RevokeOutcome({ p }: { p: Pocket }) {
  const who = agentInfo(p.agentId ?? "")?.name ?? "Its agent";
  const lines: [string, string][] = [
    ["ban", `${who} can never pay from it again`],
    ["arrowIn", p.balance > 0n ? `${money(p.balance)} comes back to your main wallet` : "It is empty, nothing to return"],
    ["check", "Payments already made stay made"],
  ];
  return (
    <View style={{ gap: 10 }}>
      {lines.map(([icon, text]) => (
        <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name={icon as IconName} size={18} color={icon === "ban" ? c.vermillionInk : c.ink} stroke={2} />
          <T v="body" color="ink2" style={{ flex: 1 }}>{text}</T>
        </View>
      ))}
      <T v="cap" color="muted">This can't be undone. To give the agent money again, make a new pocket.</T>
    </View>
  );
}

/** A pocket's card colour as a small chip in the picker (instead of a letter). */
function FaceChip({ tone, on }: { tone: number; on: boolean }) {
  const face = faceOf(tone);
  return (
    <View style={{ width: 44, height: 30, borderRadius: 6, backgroundColor: face.face, borderWidth: on ? 2 : "hatch" in face ? 1 : 0, borderColor: on ? c.ink : c.line, justifyContent: "flex-end", padding: 4 }}>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: face.band }} />
    </View>
  );
}
