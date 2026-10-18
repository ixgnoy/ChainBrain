// Owner-signed edit of a pocket's rules: per-payment cap, the ask-me threshold and the period allowance
// (Pocket.setCap / setAskAbove / setPeriodLimit), then the tx hash.
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
import { NEVER, parseHkd } from "../lib/shared";
import { money, hkd } from "../lib/util";
import { txError } from "./ActionSheet";
import { SheetSuccess } from "./SheetSuccess";
import { ErrorNote } from "./ErrorNote";
import { curSign } from "../lib/runtime";

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

const PERIOD: Record<number, string> = { 1: "day", 2: "week", 3: "month" };
const validAmount = (s: string) => /^\d+(\.\d{1,6})?$/.test(s.trim());

function Body({ r, close }: { r: NonNullable<ReturnType<typeof useApp>["rules"]>; close: () => void }) {
  const { findPocket, wallet, refreshPockets, recordTx } = useApp();
  const pocket = findPocket(r.pocket);
  const isCap = r.field === "cap", isAllow = r.field === "allowance";
  const initial = r.amount ?? (pocket ? (isCap ? hkd(pocket.cap) : isAllow ? (pocket.periodKind ? hkd(pocket.periodLimit ?? 0n) : "") : pocket.askAbove === NEVER ? "" : hkd(pocket.askAbove)) : "");
  const [text, setText] = useState(initial);
  // "never ask" for the ask-me limit; "no allowance" for the allowance
  const [never, setNever] = useState(!isCap && !!pocket && (isAllow ? !pocket.periodKind : pocket.askAbove === NEVER));
  const [kind, setKind] = useState(pocket?.periodKind || 2); // 1 day, 2 week, 3 month
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ title: string; txs: { label: string; hash: string }[] } | null>(null);
  const formH = useRef(0);
  const capDone = useRef<{ text: string; hash: string } | null>(null); // a cap already set whose top-up failed: a retry only repeats the top-up
  useEffect(() => { setError(null); }, [text, never]);

  if (!pocket) return null;
  const ok = isCap || isAllow ? never && isAllow || validAmount(text) && parseHkd(text) > 0n : never || validAmount(text);
  const topUp = isCap ? r.topUp ?? 0n : 0n;
  const name = cleanText(pocket.name, 30);

  const save = async () => {
    if (!wallet || !ok) throw new Error("invalid");
    try {
      const txs: { label: string; hash: string }[] = [];
      if (isCap) {
        const v = parseHkd(text);
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
      } else if (isAllow) {
        const v = never ? 0n : parseHkd(text);
        const a = await wallet.setPeriodLimit(pocket.address, never ? 0 : kind, v);
        recordTx({ kind: "allowance", pocket: pocket.address, hash: a.hash, amount: never ? undefined : v.toString(), note: never ? "no allowance" : `${money(v)} a ${PERIOD[kind]}` });
        txs.push({ label: "New allowance", hash: a.hash });
        setDone({ title: never ? "No allowance: only the cap and the balance limit your agent" : `Your agent can spend ${money(v)} a ${PERIOD[kind]} on its own`, txs });
      } else {
        const v = never ? NEVER : parseHkd(text);
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
    : isAllow
    ? `The most your agent can spend from ${name} in a day, week or month (Hong Kong time). The pocket counts it on-chain; past it, a payment needs your co-sign. Now ${pocket.periodKind ? `${money(pocket.periodLimit ?? 0n)} a ${PERIOD[pocket.periodKind]}` : "none"}.`
    : `Payments up to this amount go through on their own; above it your agent waits for your OK. Now ${pocket.askAbove === NEVER || pocket.askAbove > pocket.cap ? "never" : money(pocket.askAbove)}.`;
  const form = (
    <Animated.View key="form" onLayout={(e) => { formH.current = Math.max(formH.current, e.nativeEvent.layout.height); }} style={{ flexShrink: 1 }}>
      <SheetScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <T v="section">{isCap ? "Payment cap" : isAllow ? "Allowance" : "Ask me above"}</T>
          <T v="body" color="ink2">{hint}</T>
        </View>
        {isAllow ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[1, 2, 3].map((k) => <Chip key={k} label={`A ${PERIOD[k]}`} on={!never && kind === k} onPress={() => { setNever(false); setKind(k); }} />)}
            <Chip label="No allowance" on={never} onPress={() => setNever(true)} />
          </View>
        ) : !isCap ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="Above an amount" on={!never} onPress={() => setNever(false)} />
            <Chip label="Never ask" on={never} onPress={() => setNever(true)} />
          </View>
        ) : null}
        {!never ? (
          <View>
            <Field label={isCap ? `Cap in ${curSign()}` : isAllow ? `Allowance a ${PERIOD[kind]}, in ${curSign()}` : `Ask above, in ${curSign()}`} value={text} onChangeText={(t) => setText(t.replace(/[^0-9.]/g, "").slice(0, 12))} keyboardType="decimal-pad" inputMode="decimal" placeholder="0.00" accessibilityLabel={isCap ? `Cap in ${curSign()}` : isAllow ? `Allowance in ${curSign()}` : `Ask above in ${curSign()}`} />
            {!isCap && !isAllow ? <T v="cap" color="muted" style={{ marginTop: 6 }}>Use 0 to be asked about every payment.</T> : null}
          </View>
        ) : isAllow
          ? <T v="sub" color="warning">With no allowance a stolen agent key could spend the whole balance in payments under the cap.</T>
          : <T v="sub" color="warning">With "Never ask" the agent spends freely up to the cap. The card balance is still its whole budget.</T>}
        {topUp > 0n ? <T v="sub" color="ink2">The pocket holds less than this price, so {money(topUp)} from your main wallet is added in a second step.</T> : null}
        {error ? <ErrorNote text={error} /> : null}
      </SheetScroll>
    </Animated.View>
  );
  return (
    <View style={{ flexShrink: 1 }}>
      {done ? <SheetSuccess key="ok" minHeight={formH.current} title={done.title} txs={done.txs} /> : form}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
        <SlideToConfirm key={`${text}${never}${kind}${error}`} auto="rules.slide" label={isCap && topUp > 0n ? "Slide to raise cap and add money" : "Slide to confirm"} doneLabel="Saved" disabled={!ok || !wallet} onConfirm={save} />
        <Button label={done ? "Done" : "Cancel"} kind={done ? "secondary" : "text"} auto={done ? "sheet.close" : undefined} onPress={close} />
      </View>
    </View>
  );
}
