// Fund / Return funds / Revoke: pick one of your pockets, then confirm with the matching ceremony. Real owner transactions, signed on this phone.
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";
import { useApp, type Pocket } from "../store";
import { Sheet } from "../ui/Sheet";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { HoldToRevoke } from "../ui/HoldToRevoke";
import { Button, Chip, Press } from "../ui/primitives";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import { parseUsd } from "../lib/shared";
import { usd } from "../lib/util";
import { radius } from "../tokens";
import { gradientFor } from "./PocketCard";

type Mode = "fund" | "return" | "revoke";
const COPY: Record<Mode, { title: string; hint: string }> = {
  fund: { title: "Fund a pocket", hint: "Send USDC from your main wallet into a pocket. The balance is the agent's budget." },
  return: { title: "Return funds", hint: "Send the pocket's whole balance back to your main wallet. This does not revoke the pocket." },
  revoke: { title: "Revoke a pocket", hint: "The agent can no longer spend from it. Final: you can still return the funds afterwards." },
};
const AMOUNTS = ["0.50", "1.00", "2.00", "5.00"];

export const txError = (e: unknown) => {
  const m = String((e as Error)?.message ?? e);
  if (/insufficient funds|exceeds the balance|gas/i.test(m)) return "Your main wallet needs a little ETH for gas (and enough USDC). In Settings you can get test funds on the dev stack.";
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
  const { c } = useTheme();
  const { pockets, wallet, refreshPockets, fireFlash, balances } = useApp();
  const [sel, setSel] = useState<string | undefined>(initial);
  const [amount, setAmount] = useState("1.00");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSel(initial ?? (pockets.filter((p) => p.owned && !p.revoked).length === 1 ? pockets.find((p) => p.owned && !p.revoked)?.address : undefined)); setError(null); }, [initial, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const eligible = (p: Pocket) => p.owned && (mode === "return" ? true : !p.revoked);
  const chosen = pockets.find((p) => p.address === sel);
  const fail = (e: unknown): never => { haptic.error(); setError(txError(e)); throw e; };

  const doFund = async () => { try { await wallet!.fund(chosen!.address, parseUsd(amount)); await refreshPockets(); setTimeout(close, 900); } catch (e) { fail(e); } };
  const doReturn = async () => { try { await wallet!.returnFunds(chosen!.address); await refreshPockets(); setTimeout(close, 900); } catch (e) { fail(e); } };
  const doRevoke = async () => {
    setBusy(true); setError(null);
    try { await wallet!.revoke(chosen!.address); fireFlash(); haptic.heavy(); await refreshPockets(); close(); }
    catch (e) { haptic.error(); setError(txError(e)); } finally { setBusy(false); }
  };

  return (
    <View>
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <T v="headingMd">{COPY[mode].title}</T>
          <T v="bodySm" color="text2">{COPY[mode].hint}</T>
          {mode === "fund" && balances ? <T v="caption" color="text3">Main wallet: {usd(balances.usdc)} USDC</T> : null}
        </View>
        <View style={{ gap: 8 }}>
          {pockets.length === 0 && <T v="bodySm" color="text3">No pockets yet.</T>}
          {pockets.map((p) => {
            const ok = eligible(p);
            const on = sel === p.address;
            return (
              <Press key={p.address} haptics="select" onPress={ok ? () => { setSel(p.address); setError(null); } : undefined} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? c.accent : c.hairline, backgroundColor: on ? c.bgElev2 : c.bgElev1, opacity: ok ? 1 : 0.45 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, overflow: "hidden" }}><LinearGradient colors={gradientFor(p.style)} style={{ flex: 1 }} /></View>
                <View style={{ flex: 1 }}>
                  <T v="body" weight="semi">{cleanText(p.name, 30)}</T>
                  <T v="caption" color="text3">{usd(p.balance)} USDC{p.revoked ? " · revoked" : ""}</T>
                </View>
                {!p.owned ? <T v="caption" color="text3">Other key</T> : on ? <Icon name="check" size={18} color={c.accent} stroke={2.6} /> : null}
              </Press>
            );
          })}
        </View>
        {mode === "fund" && chosen && (
          <View style={{ gap: 10 }}>
            <T v="caption" color="text3">AMOUNT (USDC)</T>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {AMOUNTS.map((a) => (
                <Press key={a} haptics="select" onPress={() => setAmount(a)} style={{ flex: 1, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: amount === a ? c.accent : c.bgElev2, borderWidth: 1, borderColor: amount === a ? c.accent : c.hairline }}>
                  <T v="bodySm" weight="semi" color={amount === a ? "onAccent" : "text"} num>{a}</T>
                </Press>
              ))}
            </View>
          </View>
        )}
        {mode === "return" && chosen && <Chip kind="info" label={`${usd(chosen.balance)} USDC comes back to you`} dot />}
        {error && (
          <View style={{ backgroundColor: c.refusedBg, borderColor: c.refusedBorder, borderWidth: 1, borderRadius: radius.md, padding: 12 }}>
            <T v="bodySm" color="refused">{error}</T>
          </View>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>
        {mode === "fund" && <SlideToConfirm key={`f${sel}${amount}${error}`} label={`Slide to fund ${amount}`} doneLabel="Funded" disabled={!chosen || !wallet} onConfirm={doFund} />}
        {mode === "return" && <SlideToConfirm key={`r${sel}${error}`} label="Slide to return funds" doneLabel="Returned" disabled={!chosen || !wallet || chosen.balance === 0n} onConfirm={doReturn} />}
        {mode === "revoke" && <HoldToRevoke disabled={!chosen || !wallet} busy={busy} onComplete={doRevoke} />}
        <Button label="Cancel" kind="ghost" onPress={close} />
      </View>
    </View>
  );
}
