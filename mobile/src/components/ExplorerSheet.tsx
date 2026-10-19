// The in-app ChainBrain explorer: every transaction hash on the phone opens here. On the built-in network (and a local fork) the
// hash exists on no public chain, so it is explained here and never linked out; the chain is labelled "Test network". Only a real
// real server (explorerEnabled) also offers "Open in the explorer". Payments, refusals and attacks show the checks path they
// travelled (shared/sim attemptsFrom), the gate that stopped them, and the reason codes under "Why".
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { c, radius } from "../tokens";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { Button, CodePill, Details, Pill, SummaryCard } from "../ui/kit";
import { Money } from "../ui/Money";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { builtin } from "../lib/builtin";
import { explorerEnabled, fetchTimeout, getApi, txUrl } from "../lib/runtime";
import { sameAddr } from "../lib/events";
import { cleanText } from "../lib/sanitize";
import { shortAddr, shortHex, stamp, money } from "../lib/util";
import { attemptsFrom, explainTx, networkLabel, type Attempt, type ExplorerInput, type ExplorerTx, type Field, type Gate } from "../../../shared/sim";
import { TxLink } from "./TxLink";

export function ExplorerSheet() {
  const { explorerTx, setExplorerTx } = useApp();
  const last = useRef(explorerTx);
  if (explorerTx) last.current = explorerTx;
  const hash = explorerTx ?? last.current;
  return (
    <Sheet visible={!!explorerTx} onClose={() => setExplorerTx(null)}>
      {hash ? <Body hash={hash} close={() => setExplorerTx(null)} /> : null}
    </Sheet>
  );
}

const MARK: Record<Gate["state"], { bg: string; fg: string; icon: "check" | "shield" | "alert" | null; word: string }> = {
  pass: { bg: c.accent, fg: c.onAccent, icon: "check", word: "Passed" },
  stop: { bg: c.ink, fg: c.onAccent, icon: "shield", word: "Stopped here" },
  fooled: { bg: c.warning, fg: c.onAccent, icon: "alert", word: "Was fooled" },
  skip: { bg: c.fill, fg: c.muted, icon: null, word: "Not needed" },
  idle: { bg: c.card, fg: c.faint, icon: null, word: "Never reached" },
};

function GatePath({ attempt }: { attempt: Attempt }) {
  const gates = attempt.gates;
  return (
    <View accessibilityLabel="Checks path" style={{ gap: 0 }}>
      {gates.map((g, i) => {
        const m = g.state === "stop" && g.id === "agent" ? { ...MARK.stop, bg: c.accent } : MARK[g.state]; // the agent's own refusal is teal, a gate that held is a navy shield
        const lastRow = i === gates.length - 1;
        return (
          <View key={`${g.id}${i}`} accessible accessibilityLabel={`${g.title}: ${m.word}${g.note ? `. ${g.note}` : ""}`} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ alignItems: "center", width: 22 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: m.bg, borderWidth: g.state === "idle" ? 1.5 : 0, borderColor: c.line, alignItems: "center", justifyContent: "center" }}>
                {m.icon ? <Icon name={m.icon} size={13} color={m.fg} stroke={2.6} /> : g.state === "skip" ? <View style={{ width: 8, height: 2, borderRadius: 1, backgroundColor: m.fg }} /> : null}
              </View>
              {lastRow ? null : <View style={{ width: 1.5, flex: 1, minHeight: 14, backgroundColor: c.line }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: lastRow ? 0 : 12 }}>
              <T v="sub" w="semi" color={g.state === "idle" ? "faint" : "ink"} style={{ color: g.state === "idle" ? c.muted : undefined }}>{g.title}</T>
              <T v="cap" color={g.state === "fooled" ? "warning" : g.state === "stop" ? "ink2" : "muted"}>{g.note ?? m.word}</T>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** The server's reading of a hash (GET /api/tx/:hash): status, the call decoded with our ABIs, and why it reverted. */
type ChainView = { status: "success" | "reverted"; blockNumber: string; from: string; to: string | null; call?: { contract: string; function: string } | null; revert?: { name: string; message: string }; revertSource?: "native" | "replay" };

function Body({ hash, close }: { hash: string; close: () => void }) {
  const { cfg, pockets, wallet, events, ledger, ownerTxs, sellerName, dev, source } = useApp();
  const isBuiltin = source === "builtin";
  // on a server, the chain's own record (the demo network has none)
  const [chain, setChain] = useState<ChainView | null>(null);
  useEffect(() => {
    if (isBuiltin) return;
    let alive = true;
    fetchTimeout(`${getApi()}/api/tx/${hash}`, {}, 10_000).then((r) => (r.ok ? r.json() : null)).then((j) => alive && setChain(j), () => {});
    return () => { alive = false; };
  }, [hash, isBuiltin]);
  const nameOf = (a: string) => pockets.find((p) => sameAddr(p.address, a))?.name
    ?? cfg?.sellers.find((s) => sameAddr(s.payTo, a))?.name
    ?? (wallet && sameAddr(a, wallet.address) ? "Your wallet" : cfg && sameAddr(a, cfg.agent) ? "Your agent" : undefined);
  const tx: ExplorerTx | null = useMemo(() => {
    if (!cfg) return null;
    let all: ExplorerInput[] = [];
    if (isBuiltin) all = builtin().txs() as ExplorerInput[];
    let t = all.find((x) => x.hash.toLowerCase() === hash.toLowerCase());
    if (!t) {
      // a server or fork: what the phone itself knows about this hash
      // the owner's own transactions first: they are also ledger rows (kind "owner"), and a fund or return read as an agent's
      // payment ("Research data paid someone", transferWithAuthorization) when the ledger row was taken for one
      const own = ownerTxs.find((o) => o.hash.toLowerCase() === hash.toLowerCase());
      const row = ledger.find((r) => r.kind !== "owner" && r.tx?.toLowerCase() === hash.toLowerCase());
      // rule edits (the allowance and seller caps too) are RulesChanged, never a payment: their amount is a limit, not money moved
      const rule = ["cap", "ask", "seller", "unfreeze", "allowance", "sellerCap"].includes(own?.kind ?? "");
      if (own) t = { hash, kind: rule ? "rules" : own.kind, pocket: own.pocket, at: own.at, amount: rule ? undefined : own.amount, status: "success", from: wallet?.address, counterparty: own.kind === "return" ? wallet?.address : undefined,
        label: own.kind === "unfreeze" ? "unfrozen" : own.kind === "allowance" ? "allowance changed" : own.kind === "sellerCap" ? "seller cap changed" : own.note };
      else if (row) t = { hash, kind: row.kind === "forced" ? "out" : "payment", pocket: row.pocket, at: row.at, amount: row.amount, status: row.outcome === "refused" ? "reverted" : "success", counterparty: cfg.sellers.find((s) => s.id === row.sellerId)?.payTo, reason: row.reasons[0], args: row.cosigned ? { cosigned: "true" } : undefined };
    }
    return t ? explainTx(t, { ehkd: cfg.token, factory: cfg.factory, nameOf }, all) : null;
  }, [hash, cfg, isBuiltin, ledger, ownerTxs, pockets]); // eslint-disable-line react-hooks/exhaustive-deps
  const attempt = useMemo(() => attemptsFrom(events, { sellerName: (id) => sellerName(id) }).find((a) => a.tx === hash || a.txs?.includes(hash)), [events, hash, sellerName]);
  const net = networkLabel({ builtin: isBuiltin, dev: !!dev });
  const who = (a?: string) => (a ? `${nameOf(a) ? `${cleanText(nameOf(a)!, 30)} · ` : ""}${shortAddr(a)}` : "n/a");
  const bad = tx?.status === "reverted";
  const field = (f: Field): string => (f.kind === "address" ? who(f.value) : f.kind === "amount" ? (/^\d+$/.test(f.value) ? money(BigInt(f.value)) : f.value) : f.kind === "hash" ? shortHex(f.value, 10, 6) : cleanText(f.value, 60));
  const codes = [...new Set([...(attempt?.gates.filter((g) => g.code).map((g) => g.code!) ?? []), tx?.rule, tx?.revert].filter((x): x is string => !!x))];
  const url = txUrl(hash);

  return (
    <View style={{ flexShrink: 1 }}>
      <SheetScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 18 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T v="section" accessibilityRole="header">Transaction</T>
          <View accessibilityLabel={net} style={{ minHeight: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: c.fill, justifyContent: "center" }}><T v="cap" w="medium" color="ink2" style={{ fontSize: 12, lineHeight: 16 }}>{net}</T></View>
        </View>
        {chain ? (
          <SummaryCard rows={[
            ["On the chain", chain.status === "reverted" ? "Reverted · nothing moved" : "Success"],
            ["Block", `#${chain.blockNumber}`],
            ...(chain.call ? [["Call", `${chain.call.contract}.${chain.call.function}`] as [string, string]] : []),
            ...(chain.revert ? [["Why it reverted", chain.revert.message] as [string, string], ["Read from", chain.revertSource === "native" ? "The node's own receipt" : "A replay on the latest state"] as [string, string]] : []),
          ]} />
        ) : null}
        {!tx ? (
          chain ? null : <T v="body" color="ink2">This transaction is not in the records this phone holds. {shortHex(hash, 10, 8)}</T>
        ) : (
          <>
            <View style={{ alignItems: "center", gap: 10 }}>
              {tx.value ? <Money v="balance" value={tx.value} color={bad ? "muted" : "ink"} strike={bad} /> : null}
              <Pill label={bad ? "Reverted · nothing moved" : "Success"} tone={bad ? "fill" : "accent"} />
            </View>
            <T v="body" color="ink2" style={{ textAlign: "center" }}>{tx.summary}</T>
            {attempt ? (
              <View style={{ backgroundColor: c.canvas, borderRadius: radius.card, padding: 16, gap: 14 }}>
                <T v="row" w="semi" style={{ fontSize: 15, lineHeight: 22 }}>How it was checked</T>
                <GatePath attempt={attempt} />
                <T v="sub" color="ink2">{attempt.headline}</T>
                {codes.length ? <Details compact title="Why" codes={codes} /> : null}
              </View>
            ) : codes.length ? <Details title="Why" codes={codes} /> : null}
            <SummaryCard rows={[
              ["Status", bad ? "Reverted" : "Success"],
              ["Block", tx.block ? `#${tx.block}${tx.position != null ? ` · position ${tx.position}` : ""}` : "n/a"],
              ["Time", tx.at ? stamp(tx.at) : "n/a"],
              ["From", who(tx.from)],
              ["To", `${tx.toName}${tx.to ? ` · ${shortAddr(tx.to)}` : ""}`],
              ["Method", tx.method],
              ...(bad && tx.revert ? [["On-chain error", tx.revert] as [string, string]] : []),
              ...(bad && tx.rule ? [["Card rule that failed", tx.rule] as [string, string]] : []),
            ]} />
            {tx.args.length ? <SummaryCard rows={tx.args.map((a): [string, string] => [a.name, field(a)])} /> : null}
            {tx.logs.length ? (
              <View style={{ gap: 8 }}>
                <T v="sub" w="semi" color="muted">Event logs</T>
                {tx.logs.map((l) => (
                  <View key={l.index} style={{ backgroundColor: c.canvas, borderRadius: 16, padding: 14, gap: 6 }}>
                    <T v="sub" w="semi">{l.event} <T v="sub" color="muted">· {l.contractName}</T></T>
                    {l.fields.map((f) => <View key={f.name} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><T v="cap" color="muted">{f.name}</T><T v="cap" color="ink2" style={{ flexShrink: 1, textAlign: "right" }}>{field(f)}</T></View>)}
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <T v="cap" color="muted">Hash</T>
          <TxLink tx={hash} inline />
        </View>
        {explorerEnabled() && url ? <Button label="Open in the explorer" kind="outline" small onPress={() => Linking.openURL(url)} /> : null}
      </SheetScroll>
      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}><Button label="Done" kind="secondary" onPress={close} /></View>
    </View>
  );
}
