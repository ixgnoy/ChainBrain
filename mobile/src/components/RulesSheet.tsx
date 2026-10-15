// Owner-signed edit of a pocket's rules: per-payment cap and the ask-me threshold (Pocket.setCap / setAskAbove), then the tx hash.
// Also the one-tap fix of the scene 8 dead end: opened prefilled, optionally adding money so the pocket can pay the quote.
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useApp } from "../store";
import { c } from "../tokens";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { Button, Chip, Field } from "../ui/kit";
import { T } from "../ui/Text";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import { NEVER, parseUsd } from "../lib/shared";
import { money, usd } from "../lib/util";
import { txError } from "./ActionSheet";
import { SheetSuccess } from "./SheetSuccess";
import { ErrorNote } from "./ErrorNote";

export function RulesSheet() {
  const { rules, setRules } = useApp();
  const last = useRef(rules);
  if (rules) last.current = rules;
  const r = rules ?? last.current;
  return (
    <Sheet visible={!!rules} onClose={() => setRules(null)}>
      {r ? <Body key={`${r.pocket}${r.field}${r.amount ?? ""}`} r={r} close={() => setRules(null)} /> : null}
    </Sheet>
  );
}

const validAmount = (s: string) => /^\d+(\.\d{1,6})?$/.test(s.trim());

function Body({ r, close }: { r: NonNullable<ReturnType<typeof useApp>["rules"]>; close: () => void }) {
  const { findPocket, wallet, refreshPockets, recordTx } = useApp();
  const pocket = findPocket(r.pocket);
  const isCap = r.field === "cap";
  const initial = r.amount ?? (pocket ? (isCap ? usd(pocket.cap) : pocket.askAbove === NEVER ? "" : usd(pocket.askAbove)) : "");
  const [text, setText] = useState(initial);
  const [never, setNever] = useState(!isCap && !!pocket && pocket.askAbove === NEVER);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ title: string; txs: { label: string; hash: string }[] } | null>(null);
  const formH = useRef(0);
  const capDone = useRef<{ text: string; hash: string } | null>(null); // a cap already set whose top-up failed: a retry only repeats the top-up
  useEffect(() => { setError(null); }, [text, never]);

  if (!pocket) return null;
  const ok = isCap ? validAmount(text) && parseUsd(text) > 0n : never || validAmount(text);
  const topUp = isCap ? r.topUp ?? 0n : 0n;
  const name = cleanText(pocket.name, 30);

  const save = async () => {
    if (!wallet || !ok) throw new Error("invalid");
    try {
      const txs: { label: string; hash: string }[] = [];
      if (isCap) {
        const v = parseUsd(text);
        let capHash = capDone.current?.text === text ? capDone.current.hash : undefined;
        if (!capHash) {
          const a = await wallet.setCap(pocket.address, v);
          capHash = a.hash; capDone.current = { text, hash: a.hash };
          recordTx({ kind: "cap", pocket: pocket.address, hash: a.hash, amount: v.toString(), note: `to ${money(v)}` });
        }
        txs.push({ label: "New cap", hash: capHash });
        if (topUp > 0n) {
          const b = await wallet.fund(pocket.address, topUp);
          recordTx({ kind: "fund", pocket: pocket.address, hash: b.hash, amount: topUp.toString() });
          txs.push({ label: `Added ${money(topUp)}`, hash: b.hash });
        }
        setDone({ title: topUp > 0n ? `Cap is ${money(v)} and ${money(topUp)} was added` : `Cap is now ${money(v)}`, txs });
      } else {
        const v = never ? NEVER : parseUsd(text);
        const a = await wallet.setAskAbove(pocket.address, v);
        recordTx({ kind: "ask", pocket: pocket.address, hash: a.hash, amount: never ? undefined : v.toString(), note: never ? "never ask" : `above ${money(v)}` });
        txs.push({ label: "New ask-me limit", hash: a.hash });
        setDone({ title: never ? "Your agent will never ask you" : v === 0n ? "Your agent will ask you every time" : `Your agent now asks above ${money(v)}`, txs });
      }
      await refreshPockets();
    } catch (e) { setError(txError(e)); throw e; }
  };

  const hint = isCap
    ? `The most your agent can pay in one go from ${name}. Now ${money(pocket.cap)}.`
    : `Payments up to this amount go through on their own; above it your agent waits for your OK. Now ${pocket.askAbove === NEVER || pocket.askAbove > pocket.cap ? "never" : money(pocket.askAbove)}.`;
  const form = (
    <Animated.View key="form" onLayout={(e) => { formH.current = Math.max(formH.current, e.nativeEvent.layout.height); }} style={{ flexShrink: 1 }}>
      <SheetScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <T v="section">{isCap ? "Payment cap" : "Ask me above"}</T>
          <T v="body" color="ink2">{hint}</T>
        </View>
        {!isCap ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="Above an amount" on={!never} onPress={() => setNever(false)} />
            <Chip label="Never ask" on={never} onPress={() => setNever(true)} />
          </View>
        ) : null}
        {!never ? (
          <View>
            <Field label={isCap ? "Cap in US$" : "Ask above, in US$"} value={text} onChangeText={(t) => setText(t.replace(/[^0-9.]/g, "").slice(0, 12))} keyboardType="decimal-pad" inputMode="decimal" placeholder="0.00" accessibilityLabel={isCap ? "Cap in US$" : "Ask above in US$"} />
            {!isCap ? <T v="cap" color="muted" style={{ marginTop: 6 }}>Use 0 to be asked about every payment.</T> : null}
          </View>
        ) : <T v="sub" color="warning">With "Never ask" the agent spends freely up to the cap. The pocket balance is still its whole budget.</T>}
        {topUp > 0n ? <T v="sub" color="ink2">The pocket holds less than this price, so {money(topUp)} from your main wallet is added in a second step.</T> : null}
        {error ? <ErrorNote text={error} /> : null}
      </SheetScroll>
    </Animated.View>
  );
  return (
    <View style={{ flexShrink: 1 }}>
      {done ? <SheetSuccess key="ok" minHeight={formH.current} title={done.title} txs={done.txs} /> : form}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
        <SlideToConfirm key={`${text}${never}${error}`} label={isCap && topUp > 0n ? "Slide to raise cap and add money" : "Slide to confirm"} doneLabel="Saved" disabled={!ok || !wallet} onConfirm={save} />
        <Button label={done ? "Done" : "Cancel"} kind={done ? "secondary" : "text"} onPress={close} />
      </View>
    </View>
  );
}
