// Fund / Return funds / Revoke: pick one of your pockets, then confirm with the matching ceremony. Real owner transactions, signed on this phone.
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useApp, type Pocket } from "../store";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { HoldToRevoke } from "../ui/HoldToRevoke";
import { Avatar, Button, Chip, ListRow } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import { parseUsd } from "../lib/shared";
import { usd, money } from "../lib/util";
import { notify, DEMO_MSG } from "../lib/toast";
import { c } from "../tokens";
import { SheetSuccess } from "./SheetSuccess";
import { ErrorNote } from "./ErrorNote";

type Mode = "fund" | "return" | "revoke";
const COPY: Record<Mode, { title: string; hint: string }> = {
  fund: { title: "Add money", hint: "Move money from your main wallet into a pocket. What is in the pocket is your agent's whole budget." },
  return: { title: "Return funds", hint: "Send everything left in the pocket back to your main wallet. The pocket stays active." },
  revoke: { title: "Revoke a pocket", hint: "Your agent stops spending from it right away. You can still return the money afterwards." },
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
  const { pockets, wallet, refreshPockets, balances, demo, recordTx, setNotice } = useApp();
  const [done, setDone] = useState<{ title: string; hash: string } | null>(null);
  const [sel, setSel] = useState<string | undefined>(initial);
  const [amount, setAmount] = useState("1.00");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formH = useRef(0);
  useEffect(() => { setDone(null); setSel(initial ?? (pockets.filter((p) => p.owned && !p.revoked).length === 1 ? pockets.find((p) => p.owned && !p.revoked)?.address : undefined)); setError(null); }, [initial, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // revoke: let the success moment play, then close (the pocket page shows the hash notice)
  useEffect(() => {
    if (mode !== "revoke" || !done) return;
    const t = setTimeout(close, 1400);
    return () => clearTimeout(t);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const eligible = (p: Pocket) => p.owned && (mode === "return" ? true : !p.revoked);
  const chosen = pockets.find((p) => p.address === sel);
  const fail = (e: unknown): never => { setError(txError(e)); throw e; };
  const guard = () => { if (demo) { notify(DEMO_MSG); return true; } return false; };

  // fund and return stay open on success so the owner reads the transaction hash; revoke closes and the pocket page shows it
  const doFund = async () => {
    if (guard()) throw new Error("demo");
    try {
      const v = parseUsd(amount); const r = await wallet!.fund(chosen!.address, v);
      recordTx({ kind: "fund", pocket: chosen!.address, hash: r.hash, amount: v.toString() });
      setDone({ title: `Added US$${amount} to ${cleanText(chosen!.name, 30)}`, hash: r.hash }); await refreshPockets();
    } catch (e) { fail(e); }
  };
  const doReturn = async () => {
    if (guard()) throw new Error("demo");
    try {
      const had = chosen!.balance; const r = await wallet!.returnFunds(chosen!.address);
      recordTx({ kind: "return", pocket: chosen!.address, hash: r.hash, amount: had.toString() });
      setDone({ title: `Returned ${money(had)} to your main wallet`, hash: r.hash }); await refreshPockets();
    } catch (e) { fail(e); }
  };
  const doRevoke = async () => {
    if (guard()) return;
    setBusy(true); setError(null);
    try {
      const r = await wallet!.revoke(chosen!.address);
      recordTx({ kind: "revoke", pocket: chosen!.address, hash: r.hash });
      const name = cleanText(chosen!.name, 30);
      setNotice({ title: `${name} revoked`, pocket: chosen!.address, txs: [{ hash: r.hash }] });
      setDone({ title: `${name} revoked`, hash: r.hash });
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
        {pockets.length === 0 ? <T v="sub" color="muted">No pockets yet.</T> : (
          <View style={{ backgroundColor: c.canvas, borderRadius: 20, overflow: "hidden" }}>
            {pockets.map((p, i) => {
              const ok = eligible(p);
              const on = sel === p.address;
              return (
                <ListRow key={p.address} last={i === pockets.length - 1} a11y={`Choose ${cleanText(p.name, 30)}`}
                  onPress={ok ? () => { setSel(p.address); setError(null); } : undefined}
                  avatar={<Avatar label={p.name} tone={on ? "solid" : "soft"} />}
                  title={cleanText(p.name, 30)} sub={`${money(p.balance)}${p.revoked ? " · revoked" : ""}${!p.owned ? " · other key" : ""}`}>
                  {on ? <Icon name="check" size={20} color={c.accent} stroke={2.2} /> : null}
                </ListRow>
              );
            })}
          </View>
        )}
        {mode === "fund" && chosen && (
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
      {done ? <SheetSuccess key="ok" minHeight={formH.current} title={done.title} txs={[{ hash: done.hash }]} /> : form}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
        {mode === "fund" && <SlideToConfirm key={`f${sel}${amount}${error}`} label={`Slide to fund ${amount}`} doneLabel="Funded" disabled={!chosen || !wallet} onConfirm={doFund} />}
        {mode === "return" && <SlideToConfirm key={`r${sel}${error}`} label="Slide to return funds" doneLabel="Returned" disabled={!chosen || !wallet || chosen.balance === 0n} onConfirm={doReturn} />}
        {mode === "revoke" && (done ? <View style={{ height: 64 }} /> : <HoldToRevoke disabled={!chosen || !wallet} busy={busy} onComplete={doRevoke} />)}
        <Button label={done ? "Done" : "Cancel"} kind={done ? "secondary" : "text"} onPress={close} />
      </View>
    </View>
  );
}
