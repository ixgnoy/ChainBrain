// Bank / Compliance view: what a bank's risk team (or a read-only regulator) sees across all pockets.
// Everything is derived in the browser from the v2 event trail and on-chain reads of the pocket contracts.
// There is no history route on the server: figures cover the events this session has seen (the server keeps the last 1000).
import { useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Download, FileJson, FileSpreadsheet, Gauge, Lock, Scale, ShieldAlert, ShieldCheck, Fingerprint, X } from "lucide-react";
import { Button, Chip, Drawer, Empty, Money, Pane, ReasonChip, TxLink } from "../components/ui";
import { useConsole } from "../console";
import { useEvents } from "../useEvents";
import { useDev } from "../useDev";
import { buildLedger, type LedgerRow } from "../lib/ledger";
import { applyFilters, CONVENTION, CONVENTION_FOOTNOTE, exportCsv, exportJson, exportRows, kpis, NO_FILTER, refusalCounts, securityEvents, sha256Hex, type Filters, type SecEvent } from "../lib/bank";
import { pocketStatus, usePocketViews } from "../lib/usePocketViews";
import { clock, dateOnly, dateTime, pseudonym, usd, usdNumber } from "../lib/format";
import { cleanText } from "../lib/sanitize";
import { NEVER, REASONS, formatUsd, reasonLayer, shortAddr } from "../shared";
import { cn } from "../lib/cn";
import type { Address } from "viem";

const SEV: Record<SecEvent["severity"], string> = { high: "bg-refused", medium: "bg-stepup", low: "bg-t3" };
const selectCls = "h-8 rounded-full border border-hair2 bg-e2 px-3 text-xs font-medium text-fg outline-none focus:border-accent";

function Kpi({ label, children, sub, tone }: { label: string; children: React.ReactNode; sub?: string; tone?: "ok" | "refused" | "stepup" | "revoked" }) {
  const dot = tone ? { ok: "bg-ok", refused: "bg-refused", stepup: "bg-stepup", revoked: "bg-revoked" }[tone] : "bg-t3";
  return (
    <div className="card px-4 py-3">
      <div className="flex items-center gap-2"><span className={cn("size-1.5 rounded-full", dot)} /><span className="caps">{label}</span></div>
      <div className="display mt-1.5 text-[30px] leading-9">{children}</div>
      {sub && <div className="mt-0.5 text-xs text-t3">{sub}</div>}
    </div>
  );
}

const Verdict = ({ r }: { r: LedgerRow }) => (r.outcome === "paid" ? <Chip kind="ok">Paid</Chip> : <Chip kind="refused">Refused</Chip>);
const money = (n: bigint) => (n === NEVER ? "never" : `$${formatUsd(n)}`);

export default function Bank() {
  const { events } = useEvents();
  const { pockets, readOnly, refresh } = useConsole();
  const dev = useDev();
  const [filters, setFilters] = useState<Filters>(NO_FILTER);
  const [detail, setDetail] = useState<LedgerRow | null>(null);
  const ledgerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => buildLedger(events), [events]);
  const known = useMemo(() => {
    const seen = new Map<string, Address>();
    for (const p of pockets) seen.set(p.toLowerCase(), p);
    for (const e of events) if (typeof e.pocket === "string" && /^0x[0-9a-fA-F]{40}$/.test(e.pocket) && !seen.has(e.pocket.toLowerCase())) seen.set(e.pocket.toLowerCase(), e.pocket as Address);
    return [...seen.values()].slice(0, 12);
  }, [pockets, events]);
  const { views } = usePocketViews(known, refresh);
  const viewList = known.map((a) => ({ addr: a, v: views[a.toLowerCase()] }));
  const label = (a?: string) => (!a ? "–" : readOnly ? pseudonym(a) : shortAddr(a));

  const shown = useMemo(() => applyFilters(rows, filters).slice().reverse(), [rows, filters]);
  const k = useMemo(() => kpis(rows, viewList.filter((x) => x.v?.revoked).length), [rows, viewList]);
  const refusals = useMemo(() => refusalCounts(rows), [rows]);
  const sec = useMemo(() => securityEvents(events, { redactOwnerText: readOnly }), [events, readOnly]);
  const sellerIds = useMemo(() => [...new Set(rows.map((r) => r.sellerId).filter(Boolean))], [rows]);
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTER);
  const drill = (f: Partial<Filters>) => { setFilters({ ...NO_FILTER, ...f }); ledgerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  // ---- export (deterministic: asOf = last event time, so the shown hash is the hash of the downloaded bytes)
  const asOf = events.length ? events[events.length - 1].at : 0;
  const network = dev.state ? "Local fork of Base Sepolia (dev stack, not a public chain)" : "Base Sepolia (testnet)";
  const ex = useMemo(() => {
    const r = exportRows(applyFilters(rows, filters), { regulator: readOnly });
    return { json: exportJson(r, { network, asOf, regulator: readOnly }), csv: exportCsv(r, dev.state ? "local fork data: tx hashes are not on Base Sepolia" : undefined), n: r.length };
  }, [rows, filters, readOnly, network, asOf, dev.state]);
  const [hash, setHash] = useState({ json: "", csv: "" });
  useEffect(() => {
    let live = true;
    Promise.all([sha256Hex(ex.json), sha256Hex(ex.csv)]).then(([json, csv]) => live && setHash({ json, csv })).catch(() => live && setHash({ json: "", csv: "" }));
    return () => { live = false; };
  }, [ex]);
  const download = (name: string, text: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const maxRef = Math.max(1, ...refusals.map((r) => r.count));

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 pt-1">
        <div className="flex items-center gap-2"><Banknote className="size-5 text-t2" /><h1 className="display text-xl">Bank / Compliance</h1></div>
        <span className="rounded-full border border-hair2 bg-e2 px-2.5 py-1 text-xs text-t2">Bank: WeBank <span className="text-t3">(hypothetical demo)</span></span>
        <Chip kind={readOnly ? "info" : "neutral"}>{readOnly ? "Regulator · read-only" : "Bank risk team"}</Chip>
        <span className="ml-auto text-xs text-t3">Derived in this browser from the event trail and on-chain reads. Covers events seen this session.</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Payments" tone="ok" sub="settled, one per purchase"><span className="num">{k.payments}</span></Kpi>
        <Kpi label="Total paid" tone="ok" sub="USDC, testnet"><span className="text-xl text-t2">$</span><Money value={Number(k.totalPaid) / 1e6} /></Kpi>
        <Kpi label="Refusals" tone="refused" sub="at quote check or settlement"><span className="num">{k.refusals}</span></Kpi>
        <Kpi label="Owner co-signed" tone="stepup" sub="payments above the ask-me amount"><span className="num">{k.cosigned}</span></Kpi>
        <Kpi label="Revoked pockets" tone="revoked" sub={`of ${known.length} pockets seen`}><span className="num">{k.revokedPockets}</span></Kpi>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <div ref={ledgerRef} className="min-w-0 scroll-mt-16 xl:col-span-8">
          <Pane title="Agent payments ledger" icon={<Gauge className="size-4" />} count={filtered ? `${shown.length} of ${rows.length}` : rows.length} bodyClassName="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-hair px-4 py-2.5" role="group" aria-label="Ledger filters">
              <select aria-label="Pocket" className={selectCls} value={filters.pocket} onChange={(e) => setFilters({ ...filters, pocket: e.target.value })}><option value="all">All pockets</option>{known.map((a) => <option key={a} value={a}>{label(a)}</option>)}</select>
              <select aria-label="Seller" className={selectCls} value={filters.seller} onChange={(e) => setFilters({ ...filters, seller: e.target.value })}><option value="all">All sellers</option>{sellerIds.map((a) => <option key={a} value={a}>{a}</option>)}</select>
              <select aria-label="Verdict" className={selectCls} value={filters.verdict} onChange={(e) => setFilters({ ...filters, verdict: e.target.value as Filters["verdict"] })}><option value="all">All verdicts</option><option value="paid">Paid</option><option value="refused">Refused</option></select>
              {filters.reason && <button type="button" onClick={() => setFilters({ ...filters, reason: undefined })} className="mono inline-flex h-8 items-center gap-1.5 rounded-full border border-accent bg-accent/10 px-3 text-xs text-accent-ink">{filters.reason}<X className="size-3" aria-label="Clear reason filter" /></button>}
              {filters.cosigned && <button type="button" onClick={() => setFilters({ ...filters, cosigned: false })} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-accent bg-accent/10 px-3 text-xs text-accent-ink">co-signed<X className="size-3" aria-label="Clear co-signed filter" /></button>}
              {filtered && <Button size="sm" variant="ghost" onClick={() => setFilters(NO_FILTER)}>Clear filters</Button>}
            </div>
            <div className="max-h-[460px] overflow-auto">
              {shown.length === 0 ? <Empty>{rows.length ? "No rows match these filters." : "No payments yet. Ask the agent to buy something."}</Empty> : (
                <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-[13px]">
                  <thead className="sticky top-0 z-10 bg-e1"><tr>{["Time", "Pocket", "Seller / SKU", "Amount", "Verdict", "Reason", "Approval", "Tx"].map((h) => <th key={h} scope="col" className="caps border-b border-hair px-3 py-2 font-semibold first:pl-4 last:pr-4">{h}</th>)}</tr></thead>
                  <tbody>
                    {shown.slice(0, 150).map((r) => (
                      <tr key={r.key} tabIndex={0} onClick={() => setDetail(r)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetail(r); } }}
                        className="cursor-pointer outline-none hover:bg-e2 focus-visible:bg-e2 [&>td]:h-11 [&>td]:border-b [&>td]:border-hair [&>td]:px-3 [&>td:first-child]:pl-4 [&>td:last-child]:pr-4">
                        <td className="mono whitespace-nowrap text-[11.5px] text-t3">{clock(r.at)}</td>
                        <td className="mono whitespace-nowrap text-[12px]">{label(r.pocket)}</td>
                        <td className="max-w-[200px] truncate"><span className="font-medium">{r.sellerId}</span>{r.sku && <span className="text-t3">/{r.sku}</span>}</td>
                        <td className="num whitespace-nowrap">{r.amount != null ? `$${usd(r.amount)}` : "–"}</td>
                        <td><Verdict r={r} /></td>
                        <td><div className="flex max-w-[210px] flex-wrap gap-1">{r.reasons.length ? r.reasons.map((c) => <ReasonChip key={c} code={c} />) : <span className="text-t3">–</span>}</div></td>
                        <td className="whitespace-nowrap text-xs text-t2">{r.outcome === "paid" ? (r.cosigned ? "co-signed" : "within rules") : "–"}</td>
                        <td onClick={(e) => e.stopPropagation()}><TxLink hash={r.tx} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Pane>
        </div>

        <div className="min-w-0 xl:col-span-4">
          <Pane title="Refusals by reason code" icon={<ShieldAlert className="size-4" />} count={refusals.reduce((s, r) => s + r.count, 0) || undefined} className="h-full" bodyClassName="max-h-[520px] overflow-y-auto">
            {refusals.length === 0 ? <Empty>No refusals recorded.</Empty> : (
              <ul className="space-y-1 p-3">{refusals.map((r) => (
                <li key={r.reason}>
                  <button type="button" onClick={() => drill({ verdict: "refused", reason: r.reason })} aria-label={`${r.reason}: ${r.count}. Filter ledger.`} className={cn("group w-full rounded-xl px-2.5 py-2 text-left hover:bg-e2", filters.reason === r.reason && "bg-e2")}>
                    <div className="flex items-center gap-2"><span className="mono truncate text-[12px] font-medium">{r.reason}</span><span className="ml-auto text-[11px] text-t3">{reasonLayer(r.reason)}</span><span className="num w-5 text-right text-[13px] font-semibold">{r.count}</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-e3"><div className="h-full rounded-full bg-refused transition-[width] duration-500" style={{ width: `${(r.count / maxRef) * 100}%` }} /></div>
                    <div className="mt-1 truncate text-[11px] text-t3">{REASONS[r.reason] ?? ""}</div>
                  </button>
                </li>))}</ul>
            )}
          </Pane>
        </div>

        <div className="min-w-0 xl:col-span-7">
          <Pane title="Controls in force" icon={<Lock className="size-4" />} count={known.length || undefined} bodyClassName="overflow-x-auto">
            {known.length === 0 ? <Empty>No pockets seen yet.</Empty> : (
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[13px]">
                <caption className="sr-only">Pocket rules read from the contracts</caption>
                <thead><tr>{["Pocket", "Balance", "Per-payment cap", "Ask above", "Allowlist", "Expires", "State", "Owner"].map((h) => <th key={h} scope="col" className="caps border-b border-hair px-3 py-2 font-semibold first:pl-4">{h}</th>)}</tr></thead>
                <tbody>{viewList.map(({ addr, v }) => (
                  <tr key={addr} className="[&>td]:border-b [&>td]:border-hair [&>td]:px-3 [&>td]:py-2.5 [&>td:first-child]:pl-4">
                    <td className="whitespace-nowrap"><div className="mono text-[12px] font-medium">{label(addr)}</div>{v && <div className="mono text-[11px] text-t3">agent {shortAddr(v.agent)}</div>}</td>
                    {v ? <>
                      <td className="num whitespace-nowrap">${usd(v.balance)}</td>
                      <td className="num">{money(v.cap)}</td>
                      <td className="num">{v.askAbove === NEVER ? "never" : v.askAbove === 0n ? "every payment" : money(v.askAbove)}</td>
                      <td className="text-[12px] text-t2">{v.allowed.length ? v.allowed.join(", ") : "nobody"}</td>
                      <td className="whitespace-nowrap">{dateOnly(Number(v.expiresAt) * 1000)}</td>
                      <td>{pocketStatus(v) === "Revoked" ? <Chip kind="revoked" /> : pocketStatus(v) === "Expired" ? <Chip kind="neutral">Expired</Chip> : <Chip kind="ok" dot>Active</Chip>}</td>
                      <td className="mono whitespace-nowrap text-[11.5px] text-t2">{readOnly ? pseudonym(v.owner, "OWNER") : shortAddr(v.owner)}</td>
                    </> : <td colSpan={7} className="text-xs text-t3">Reading the contract…</td>}
                  </tr>))}</tbody>
              </table>
            )}
            <p className="border-t border-hair px-4 py-2.5 text-xs text-t3">Read straight from each pocket contract, so these are the limits the chain enforces, not a copy.</p>
          </Pane>
        </div>

        <div className="min-w-0 xl:col-span-5">
          <Pane title="Security events" icon={<ShieldAlert className="size-4" />} count={sec.length || undefined} className="h-full" bodyClassName="max-h-[420px] overflow-y-auto">
            {sec.length === 0 ? <Empty>No security events.</Empty> : (
              <ul>{sec.slice(0, 40).map((s) => (
                <li key={s.key} className="flex gap-3 border-b border-hair px-4 py-2.5 last:border-0">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", SEV[s.severity])} title={`${s.severity} severity`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-[13px] font-semibold">{s.title}</span>{s.reasons.map((c) => <ReasonChip key={c} code={c} />)}<span className="mono ml-auto text-[11px] text-t3">{clock(s.at)}</span></div>
                    <p className="mt-0.5 break-words text-[12.5px] text-t2">{s.detail}</p>
                  </div>
                </li>))}</ul>
            )}
          </Pane>
        </div>

        <div className="min-w-0 xl:col-span-7">
          <Pane title="Convention alignment" icon={<Scale className="size-4" />} actions={<Chip kind="neutral">self-assessment</Chip>}>
            <p className="px-4 pt-3 text-[13px] text-t2">How ChainBrain's controls line up with items reported in the press for the Payment &amp; Clearing Association of China's agent-payment self-regulatory convention. Each row is aligned with a reported item; none is a statement of compliance.</p>
            <ul className="p-2">
              {CONVENTION.map((c) => {
                const n = c.evidence ? applyFilters(rows, { ...NO_FILTER, ...c.evidence.filter }).length : 0;
                return (
                  <li key={c.id} className="flex items-start gap-3 rounded-2xl px-2.5 py-2.5 hover:bg-e2">
                    <span className="mt-0.5">{c.status === "aligned" ? <ShieldCheck className="size-4 text-ok" aria-hidden /> : <Fingerprint className="size-4 text-info" aria-hidden />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-[13px] font-semibold">{c.item}</span>{c.status === "aligned" ? <Chip kind="ok" dot>Aligned with</Chip> : <Chip kind="info" dot>Our addition</Chip>}</div>
                      <p className="mt-0.5 text-[12.5px] leading-5 text-t2">{c.feature}</p>
                      {c.evidence && <button type="button" onClick={() => drill(c.evidence!.filter)} className="mt-1 text-xs font-medium text-accent-ink hover:underline">Evidence: {c.evidence.label} · {n} {n === 1 ? "row" : "rows"} →</button>}
                    </div>
                  </li>);
              })}
            </ul>
            <p className="border-t border-hair px-4 py-3 text-xs text-t3">{CONVENTION_FOOTNOTE}</p>
          </Pane>
        </div>

        <div className="min-w-0 xl:col-span-5">
          <Pane title="Export" icon={<Download className="size-4" />} className="h-full">
            <div className="space-y-3 p-4">
              <p className="text-[13px] text-t2">Exports the {filtered ? "filtered " : ""}ledger ({ex.n} rows) as downloaded from this browser. {readOnly && "Pocket ids are pseudonymised and owner text is removed in the regulator view."}</p>
              {([["JSON", "chainbrain-ledger.json", ex.json, hash.json, FileJson, "application/json"], ["CSV", "chainbrain-ledger.csv", ex.csv, hash.csv, FileSpreadsheet, "text/csv"]] as const).map(([lbl, file, text, h, Icon, type]) => (
                <div key={lbl} className="rounded-2xl border border-hair bg-e2 p-3">
                  <div className="flex items-center gap-2"><Icon className="size-4 text-t2" aria-hidden /><span className="text-[13px] font-semibold">{lbl}</span><Button size="sm" variant="secondary" className="ml-auto" onClick={() => download(file, text, type)}><Download className="size-3.5" />Download</Button></div>
                  <div className="mt-2 text-[11px] text-t3">SHA-256{dev.state ? " (local fork data: this hash proves nothing about a public chain)" : ""}</div>
                  <div className="mono mt-0.5 break-all text-[11.5px] leading-4 text-fg" data-testid={`hash-${lbl.toLowerCase()}`}>{h || "computing…"}</div>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-hair2 px-3 py-2 text-[13px] text-t2"><Lock className="size-4 text-t3" aria-hidden />Anchor the export hash on FISCO BCOS<Chip kind="neutral" className="ml-auto">Planned</Chip></div>
            </div>
          </Pane>
        </div>
      </div>

      <Drawer open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={detail ? `${detail.sellerId}${detail.sku ? `/${detail.sku}` : ""}` : "Payment"} description={detail ? `${dateTime(detail.at)} · pocket ${label(detail.pocket)}` : undefined}>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2"><Verdict r={detail} />{detail.amount != null && <span className="num text-lg font-semibold">${usd(detail.amount)} <span className="text-xs font-normal text-t3">USDC · {usdNumber(detail.amount).toFixed(2)}</span></span>}</div>
            <p className="text-[13px] text-t2">{detail.outcome === "paid" ? (detail.cosigned ? "Settled with the owner's co-signature (above the ask-me amount)." : "Settled inside the pocket's rules without needing approval.") : detail.source === "quote" ? "Refused when the agent asked for a quote; no payment was attempted." : "Refused when the agent tried to pay; nothing was spent."}</p>
            {detail.reasons.map((c) => <div key={c} className="flex flex-wrap items-center gap-2 text-[13px]"><ReasonChip code={c} /><span className="text-t2">{REASONS[c]}</span><span className="text-t3">· {reasonLayer(c)}</span></div>)}
            {detail.detail && <p className="mono break-all text-[11.5px] text-t3">{cleanText(detail.detail, 300)}</p>}
            {detail.tx && <div className="flex items-center gap-2 text-sm">tx <TxLink hash={detail.tx} /></div>}
            {detail.intentHash && <div className="mono break-all text-[11.5px] text-t3">intent {detail.intentHash}</div>}
            {detail.task && !readOnly && <pre className="mono whitespace-pre-wrap rounded-2xl bg-e2 p-3 text-[12px] leading-5 text-t2">{cleanText(detail.task, 500)}</pre>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
