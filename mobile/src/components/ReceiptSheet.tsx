// Receipt for a ledger row: big amount, a plain sentence about what happened, a few facts, and an expandable "Details" area.
import React, { useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import { c } from "../tokens";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { Button, CodePill, Details, Pill } from "../ui/kit";
import { Money } from "../ui/Money";
import { Reveal } from "../ui/Reveal";
import { T } from "../ui/Text";
import { cleanText } from "../lib/sanitize";
import { chainFor, type LedgerRow } from "../lib/events";
import { plainReason } from "../lib/plain";
import { usd, stamp, shortHex } from "../lib/util";
import { TxLink } from "./TxLink";

export function ReceiptSheet() {
  const { receipt, setReceipt } = useApp();
  const last = useRef<LedgerRow | null>(null);
  if (receipt) last.current = receipt;
  const row = receipt ?? last.current;
  return (
    <Sheet visible={!!receipt} onClose={() => setReceipt(null)}>
      {row ? <Body row={row} close={() => setReceipt(null)} /> : null}
    </Sheet>
  );
}

function Body({ row, close }: { row: LedgerRow; close: () => void }) {
  const { sellerName, findPocket, events, dev, source } = useApp();
  const pocket = findPocket(row.pocket);
  const bad = row.outcome === "refused" || row.outcome === "declined";
  const seller = cleanText(sellerName(row.sellerId), 60);
  const chain = useMemo(() => (row.kind === "payment" ? chainFor(events, row) : null), [events, row]);
  const noMoney = row.amount == null || row.kind === "disclosure" || row.kind === "intent" || (row.kind === "owner" && row.amount == null);
  const headline = row.kind === "owner" ? row.text : row.kind === "disclosure" ? "Nothing was shared" : row.kind === "intent" ? (row.outcome === "approved" ? "Task confirmed" : "Task declined") : null;
  const status = row.kind === "owner" ? "Confirmed on chain" : row.kind === "payment" ? (row.cosigned ? "Paid, co-signed by you" : "Paid") : row.outcome === "pending" ? "Waiting for your OK" : bad ? "Refused" : row.outcome === "approved" ? "Approved" : "Done";
  const sentence = row.kind === "owner" ? `${row.text}${row.detail ? ` (${cleanText(row.detail, 80)})` : ""}. You signed this on your phone.`
    : row.kind === "payment"
    ? row.cosigned ? `Your agent paid ${seller}. You co-signed this payment on your phone.` : `Your agent paid ${seller} on its own, within your limits.`
    : row.kind === "disclosure" ? `${seller} asked for ${(row.asked ?? []).map((a) => cleanText(a, 40)).join(", ") || "your data"}${row.signRequest ? " and a signature" : ""}. Your wallet refused, so nothing was shared.`
    : row.kind === "intent" ? cleanText(row.text, 300)
    : bad ? `This payment was not made: ${plainReason(row.reasons[0] ?? "")}.` : row.outcome === "pending" ? "Your agent is waiting for you to approve this payment." : cleanText(row.text, 300);
  // rows enter 40 ms apart (8 pt rise + fade) once the sheet is mostly up; the transaction hash comes last
  const R = (i: number) => ({ index: i, step: 40, base: 140, dy: 8 });
  const cell = (k: string, v: string, i: number) => (
    <Reveal key={k} {...R(i)}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, gap: 16 }}>
        <T v="sub" color="muted">{k}</T><T v="sub" w="medium" style={{ flexShrink: 1, textAlign: "right" }}>{v}</T>
      </View>
    </Reveal>
  );
  const facts: [string, string][] = [];
  if (row.kind !== "intent" && row.kind !== "owner") facts.push(["Seller", seller]);
  if (row.description) facts.push(["Item", cleanText(row.description, 80)]);
  facts.push(["Pocket", pocket ? cleanText(pocket.name, 40) : "n/a"], ["When", stamp(row.at)]);
  const tech: [string, string][] = [["Network", dev ? "Local test network" : source === "builtin" ? "Test network" : "Base Sepolia (test network)"]];
  if (row.reasons.length) tech.push(["Reason code", row.reasons.join(", ")]);
  if (row.detail) tech.push(["Detail", cleanText(row.detail, 200)]);
  if (row.sku) tech.push(["Item code", cleanText(row.sku, 60)]);
  if (row.intentHash) tech.push(["Task id", shortHex(row.intentHash)]);
  if (chain?.task) tech.push(["Task you confirmed", cleanText(chain.task, 300)]);
  if (chain?.quote?.price) tech.push(["Quoted price", `US$${cleanText(chain.quote.price, 12)}`]);
  return (
    <View>
      <ScrollView style={{ maxHeight: 640 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", gap: 10, paddingTop: 4 }}>
          <Reveal {...R(0)}>
            {noMoney ? <T v="amount" color={bad ? "negative" : "ink"} style={{ textAlign: "center" }}>{headline ?? "No payment made"}</T> : (
              <Money v="balance" value={usd(row.amount)} countIn color={bad ? "muted" : "ink"} strike={bad} />
            )}
          </Reveal>
          <Reveal {...R(1)}><View style={{ alignSelf: "center" }}><Pill label={status} tone={bad ? "negative" : row.outcome === "pending" ? "warning" : "accent"} /></View></Reveal>
        </View>
        <Reveal {...R(2)}><T v="body" color="ink2" style={{ textAlign: "center" }}>{sentence}</T></Reveal>
        <View style={{ backgroundColor: c.canvas, borderRadius: 20, paddingHorizontal: 16 }}>
          {facts.map(([k, v], i) => cell(k, v, 3 + i))}
        </View>
        {row.tx ? (
          <Reveal {...R(3 + facts.length)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <T v="sub" color="muted">Transaction</T>
              <TxLink tx={row.tx} />
            </View>
          </Reveal>
        ) : null}
        {row.reasons.length ? <Reveal {...R(4 + facts.length)}><View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>{row.reasons.map((k) => <CodePill key={k} code={k} />)}</View></Reveal> : null}
        <Reveal {...R(5 + facts.length)}><Details rows={tech} /></Reveal>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <Button label="Done" onPress={close} />
      </View>
    </View>
  );
}
