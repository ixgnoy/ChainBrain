// Receipt for a ledger row (payment, refusal, quote-time block, disclosure, approval, task) with a "how it happened" rail built from v2 events.
import React, { useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import { useTheme } from "../theme";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { Button, DevBadge, ReasonLine } from "../ui/primitives";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { cleanText } from "../lib/sanitize";
import { chainFor, type LedgerRow } from "../lib/events";
import { usd, dayLabel, timeLabel } from "../lib/util";
import { radius } from "../tokens";
import { RowVerdict } from "./Verdict";
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

type State = "done" | "fail" | "wait" | "skip";
function Rail({ nodes }: { nodes: { key: string; title: string; state: State; lines: string[]; tx?: string }[] }) {
  const { c } = useTheme();
  return (
    <View>
      {nodes.map((node, i) => {
        const col = node.state === "fail" ? c.refused : node.state === "done" ? c.ok : node.state === "wait" ? c.stepup : c.text3;
        const last = i === nodes.length - 1;
        return (
          <View key={node.key} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ alignItems: "center", width: 22 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: node.state === "skip" ? c.bgElev3 : col + "26", borderWidth: 1.5, borderColor: col }}>
                {node.state === "done" ? <Icon name="check" size={12} color={col} stroke={2.8} /> : node.state === "fail" ? <Icon name="x" size={12} color={col} stroke={2.8} /> : node.state === "wait" ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: col }} /> : null}
              </View>
              {!last && <View style={{ flex: 1, width: 2, minHeight: 18, backgroundColor: node.state === "done" ? c.ok + "66" : c.hairlineStrong, marginVertical: 2 }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : 14, gap: 3 }}>
              <T v="bodySm" weight="semi" color={node.state === "skip" ? "text3" : "text"}>{node.title}</T>
              {node.lines.map((l, k) => <T key={k} v="bodySm" color="text2" style={{ fontSize: 13, lineHeight: 18 }}>{l}</T>)}
              {node.tx && <TxLink tx={node.tx} />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Body({ row, close }: { row: LedgerRow; close: () => void }) {
  const { c } = useTheme();
  const { sellerName, findPocket, events, dev } = useApp();
  const pocket = findPocket(row.pocket);
  const bad = row.outcome === "refused" || row.outcome === "declined";
  const seller = cleanText(sellerName(row.sellerId), 60);
  const chain = useMemo(() => (row.kind === "payment" ? chainFor(events, row) : null), [events, row]);
  const head = row.kind === "payment" ? "PAID" : row.kind === "disclosure" ? "DATA REQUEST REFUSED" : row.kind === "intent" ? "TASK" : row.kind === "approval" ? "APPROVAL" : bad ? "REFUSED" : "RECEIPT";
  const cell = (k: string, v: React.ReactNode) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 11, gap: 16 }}>
      <T v="bodySm" color="text2">{k}</T><View style={{ flexShrink: 1, alignItems: "flex-end" }}>{typeof v === "string" ? <T v="bodySm" weight="semi" style={{ textAlign: "right" }}>{v}</T> : v}</View>
    </View>
  );
  const rule = <View style={{ height: 1, backgroundColor: c.hairline }} />;
  const nodes: { key: string; title: string; state: State; lines: string[]; tx?: string }[] = [];
  if (chain) {
    nodes.push({ key: "task", title: "Task you confirmed", state: chain.task ? "done" : "skip", lines: chain.task ? cleanText(chain.task, 400).split("\n") : ["No confirmed task found in this session"] });
    nodes.push({ key: "quote", title: "Quote", state: "done", lines: [`${cleanText(row.sku, 80)} from ${seller}`, ...(chain.quote?.price ? [`US$${cleanText(chain.quote.price, 12)}`] : [])] });
    nodes.push({ key: "sign", title: row.cosigned ? "You co-signed" : "Within your limits", state: "done", lines: [row.cosigned ? "You signed this exact USDC transfer on your phone." : "Under your ask-me threshold, so no signature was needed."] });
    nodes.push({ key: "pay", title: "Payment", state: "done", lines: [dev ? "Settled on the local fork" : "Settled on Base Sepolia (testnet)"], tx: row.tx });
  }
  return (
    <View>
      <ScrollView style={{ maxHeight: 640 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", gap: 8, paddingTop: 4 }}>
          {dev && <DevBadge />}
          <T v="caption" color="text3">{head}</T>
          {row.amount == null || row.kind === "disclosure" || row.kind === "intent" ? (
            <T v="headingLg" color="text2" style={{ paddingVertical: 14, textAlign: "center" }}>{row.kind === "disclosure" ? "Nothing was shared" : row.kind === "intent" ? (row.outcome === "approved" ? "Task confirmed" : "Task declined") : "No payment made"}</T>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
              <T v="displayXl" num color={bad ? "text3" : "text"} style={bad ? { textDecorationLine: "line-through" } : undefined}>{usd(row.amount)}</T>
              <T v="body" weight="semi" color="text2">USDC</T>
            </View>
          )}
          <RowVerdict row={row} />
          <T v="bodySm" color="text3">{dayLabel(row.at)} · {timeLabel(row.at)}</T>
        </View>

        <View style={{ backgroundColor: c.bgElev1, borderRadius: radius.lg, borderWidth: 1, borderColor: c.hairline, paddingHorizontal: 16 }}>
          {row.kind !== "intent" && <>{cell("Seller", seller)}{rule}</>}
          {row.sku || row.description ? <>{cell("Item", cleanText(row.description ?? row.sku, 80))}{rule}</> : null}
          {cell("Pocket", pocket ? cleanText(pocket.name, 40) : "n/a")}
          {rule}
          {cell("Network", dev ? "Local fork (dev stack)" : "Base Sepolia (testnet)")}
          {row.tx && <>{rule}{cell("Transaction", <TxLink tx={row.tx} />)}</>}
        </View>

        {row.kind === "disclosure" && (
          <View style={{ gap: 10 }}>
            <T v="caption" color="text3">THE SELLER ASKED FOR</T>
            <T v="bodySm">{(row.asked ?? []).map((a) => cleanText(a, 40)).join(", ") || "your data"}{row.signRequest ? ", and a signature that is not a payment" : ""}.</T>
            {row.reasons.map((r) => <ReasonLine key={r} code={r} />)}
          </View>
        )}
        {(row.kind === "refusal" || row.kind === "blocked" || (row.kind === "approval" && bad)) && row.reasons.length > 0 && (
          <View style={{ gap: 10 }}>
            <T v="caption" color="text3">WHY</T>
            {row.reasons.map((r) => <ReasonLine key={r} code={r} />)}
            {row.detail ? <T v="caption" color="text3">{cleanText(row.detail, 200)}</T> : null}
          </View>
        )}
        {(row.kind === "intent" || row.kind === "approval") && row.text ? (
          <View style={{ gap: 8 }}>
            <T v="caption" color="text3">{row.kind === "intent" ? "FIXED TEMPLATE YOU SAW" : "AGENT'S REASON"}</T>
            <T v={row.kind === "intent" ? "mono" : "bodySm"} color="text2" style={row.kind === "intent" ? { fontSize: 13, lineHeight: 19 } : undefined}>{cleanText(row.text, 500)}</T>
          </View>
        ) : null}
        {chain && (
          <View>
            <T v="caption" color="text3" style={{ marginBottom: 12 }}>HOW IT HAPPENED</T>
            <Rail nodes={nodes} />
          </View>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 10 }}>
        <Button label="Done" onPress={close} />
      </View>
    </View>
  );
}
