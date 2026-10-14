// Fund / Return funds / Revoke: pick one of your pockets, then confirm with the matching ceremony. Real owner transactions, signed on this phone.
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useApp, type Pocket } from "../store";
import { Sheet } from "../ui/Sheet";
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
  const { pockets, wallet, refreshPockets, balances, demo } = useApp();
  const [sel, setSel] = useState<string | undefined>(initial);
  const [amount, setAmount] = useState("1.00");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSel(initial ?? (pockets.filter((p) => p.owned && !p.revoked).length === 1 ? pockets.find((p) => p.owned && !p.revoked)?.address : undefined)); setError(null); }, [initial, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const eligible = (p: Pocket) => p.owned && (mode === "return" ? true : !p.revoked);
  const chosen = pockets.find((p) => p.address === sel);
  const fail = (e: unknown): never => { haptic.error(); setError(txError(e)); throw e; };
  const guard = () => { if (demo) { notify(DEMO_MSG); return true; } return false; };

  const doFund = async () => { if (guard()) throw new Error("demo"); try { await wallet!.fund(chosen!.address, parseUsd(amount)); await refreshPockets(); setTimeout(close, 900); } catch (e) { fail(e); } };
  const doReturn = async () => { if (guard()) throw new Error("demo"); try { await wallet!.returnFunds(chosen!.address); await refreshPockets(); setTimeout(close, 900); } catch (e) { fail(e); } };
  const doRevoke = async () => {
    if (guard()) return;
    setBusy(true); setError(null);
    try { await wallet!.revoke(chosen!.address); haptic.heavy(); await refreshPockets(); close(); }
    catch (e) { haptic.error(); setError(txError(e)); } finally { setBusy(false); }
  };

  return (
    <View>
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }} showsVerticalScrollIndicator={false}>
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
        {error && (
          <View style={{ backgroundColor: c.negativeSoft, borderRadius: 16, padding: 14 }}>
            <T v="sub" color="negative">{error}</T>
          </View>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
        {mode === "fund" && <SlideToConfirm key={`f${sel}${amount}${error}`} label={`Slide to fund ${amount}`} doneLabel="Funded" disabled={!chosen || !wallet} onConfirm={doFund} />}
        {mode === "return" && <SlideToConfirm key={`r${sel}${error}`} label="Slide to return funds" doneLabel="Returned" disabled={!chosen || !wallet || chosen.balance === 0n} onConfirm={doReturn} />}
        {mode === "revoke" && <HoldToRevoke disabled={!chosen || !wallet} busy={busy} onComplete={doRevoke} />}
        <Button label="Cancel" kind="text" onPress={close} />
      </View>
    </View>
  );
}
