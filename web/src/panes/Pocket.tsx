import { useMemo, useState } from "react";
import { Wallet, Plus, Undo2, Clock, Bot, ChevronDown, Pencil, Coins } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "viem";
import HoldButton from "../components/vendor/HoldButton";
import CreatePocket from "../components/CreatePocket";
import { Button, Chip, Empty, Field, Money, Pane, ReasonChip, Switch, TxLink, inputCls } from "../components/ui";
import { useConsole } from "../console";
import { useEvents } from "../useEvents";
import { fund, returnFunds, revoke, setAskAbove, setCap, setSeller, type PocketView } from "../wallet";
import { buildLedger, type LedgerRow } from "../lib/ledger";
import { forPocket } from "../lib/events";
import { pocketStatus, usePocketViews } from "../lib/usePocketViews";
import { dateOnly, dateTime, usd, usdNumber } from "../lib/format";
import { cleanText } from "../lib/sanitize";
import { NEVER, REASONS, formatUsd, parseUsd, shortAddr } from "../shared";
import { cn } from "../lib/cn";
import { Spotlight } from "../components/bits/presets";

const money = (n: bigint) => (n === NEVER ? "never" : `$${formatUsd(n)}`);

function PocketCard({ addr, v, selected, onSelect, maxSeen }: { addr: Address; v?: PocketView; selected: boolean; onSelect(): void; maxSeen: number }) {
  const bal = v ? usdNumber(v.balance) : 0;
  const left = maxSeen > 0 ? Math.min(1, Math.max(0, bal / maxSeen)) : 0;
  const st = v ? pocketStatus(v) : undefined;
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`Pocket ${shortAddr(addr)}`}
      className={cn("block w-[272px] shrink-0 cursor-pointer snap-start rounded-[14px] text-left transition-[transform,box-shadow] duration-150 active:scale-[0.99]",
        selected ? "shadow-[0_0_0_2px_var(--accent)]" : "hover:shadow-[0_0_0_1px_var(--hair2)]")}>
      <Spotlight className={cn("flex h-[172px] flex-col justify-between p-4", v?.revoked && "text-t3")}>
        {v?.revoked && <span className="hatch absolute inset-0 -z-10" aria-hidden />}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><div className="mono truncate text-sm font-medium">Pocket {shortAddr(addr)}</div><div className="mt-0.5 flex items-center gap-1 text-xs text-t3"><Bot className="size-3" aria-hidden />agent {v ? shortAddr(v.agent) : "…"}</div></div>
          {st && <Chip kind={st === "Active" ? "ok" : st === "Revoked" ? "revoked" : "neutral"} dot={st === "Active"}>{st}</Chip>}
        </div>
        <div>
          <div className="display flex items-baseline gap-1.5 text-[34px] leading-9"><span className="text-xl text-t3">$</span>{v ? <Money value={bal} /> : <span>–</span>}<span className="text-xs font-medium text-t3">USDC</span></div>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-e3" aria-hidden><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${left * 100}%` }} /></div>
          <div className="num mt-2 text-xs text-t3">{v ? `Cap ${money(v.cap)} · Ask above ${money(v.askAbove)}` : "Reading the contract…"}</div>
        </div>
      </Spotlight>
    </button>
  );
}

/** Inline rule editor (replaces window.prompt): shows the value, an Edit button, then an input with Save / Cancel. */
function RuleEdit({ label, value, current, allowNever, disabled, onSave }: { label: string; value: string; current: bigint; allowNever?: boolean; disabled?: boolean; onSave(v: bigint): Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [never, setNever] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const open = () => { setText(current === NEVER ? "" : formatUsd(current)); setNever(current === NEVER); setErr(""); setEditing(true); };
  const save = async () => {
    let n: bigint;
    try { n = never ? NEVER : parseUsd(text); } catch { setErr("Enter an amount like 2 or 0.50"); return; }
    setBusy(true);
    try { await onSave(n); setEditing(false); } catch (e) { setErr(cleanText((e as Error).message.split("\n")[0], 120)); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-[10px] border border-hair bg-e1 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2"><dt className="caps">{label}</dt>
        {!editing && !disabled && <button type="button" onClick={open} className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-accent-ink hover:underline" aria-label={`Edit ${label}`}><Pencil className="size-3" aria-hidden />Edit</button>}</div>
      {!editing ? <dd className="num mt-0.5 text-[15px] font-semibold">{value}</dd> : (
        <form className="mt-1.5 space-y-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <input className={cn(inputCls, "h-9")} aria-label={label} value={text} disabled={never || busy} onChange={(e) => setText(e.target.value)} inputMode="decimal" placeholder="US$" autoFocus />
          {allowNever && <label className="flex items-center gap-2 text-xs text-t2"><input type="checkbox" className="accent-[var(--accent)]" checked={never} onChange={(e) => setNever(e.target.checked)} />Never ask (the cap still applies)</label>}
          {err && <p role="alert" className="text-xs text-refused-ink">{err}</p>}
          <div className="flex justify-end gap-1.5"><Button size="sm" variant="ghost" type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button><Button size="sm" variant="primary" type="submit" disabled={busy}>{busy ? "Check your wallet…" : "Save"}</Button></div>
        </form>
      )}
    </div>
  );
}

function Activity({ rows, readOnly }: { rows: LedgerRow[]; readOnly: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <p className="py-4 text-center text-xs text-t3">No payments or refusals in this pocket yet.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const isOpen = open === r.key;
        return (
          <li key={r.key} className="row-in rounded-[10px] border border-hair bg-e1">
            <button type="button" onClick={() => setOpen(isOpen ? null : r.key)} aria-expanded={isOpen} className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left">
              <span className="min-w-0 flex-1 truncate text-[13px]"><span className="font-medium">{r.sellerId}</span>{r.sku && <span className="text-t3">/{r.sku}</span>}</span>
              {r.amount != null && <span className="num text-[13px] font-semibold">${usd(r.amount)}</span>}
              {r.outcome === "paid" ? <Chip kind="ok">Paid</Chip> : <Chip kind="refused">Refused</Chip>}
              <ChevronDown className={cn("size-4 text-t3 transition-transform", isOpen && "rotate-180")} aria-hidden />
            </button>
            {isOpen && (
              <div className="space-y-2 border-t border-hair px-3 py-3 text-[13px] text-t2">
                <div>{dateTime(r.at)} · {r.outcome === "paid" ? (r.cosigned ? "co-signed by you" : "inside your rules, no approval needed") : r.source === "quote" ? "refused when the agent asked for a quote" : "refused when the agent tried to pay"}</div>
                {r.reasons.map((c) => <div key={c} className="flex flex-wrap items-center gap-2"><ReasonChip code={c} /><span>{REASONS[c] ?? ""}</span></div>)}
                {r.tx && <div className="flex items-center gap-2">tx <TxLink hash={r.tx} /></div>}
                {r.task && !readOnly && <pre className="mono whitespace-pre-wrap rounded-[8px] bg-e2 p-2 text-xs leading-5">{cleanText(r.task, 400)}</pre>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Pocket() {
  const { cfg, owner, pockets, active, setActive, readOnly, refresh, bump, mainBalance } = useConsole();
  const { events } = useEvents();
  const { views, failed } = usePocketViews(pockets, refresh);
  const [creating, setCreating] = useState(false);
  const [addFunds, setAddFunds] = useState<string | null>(null);
  const [maxSeen] = useState<Record<string, number>>({});
  const current = active ? views[active.toLowerCase()] : undefined;
  for (const p of pockets) { const v = views[p.toLowerCase()]; if (v) maxSeen[p.toLowerCase()] = Math.max(maxSeen[p.toLowerCase()] ?? 0, usdNumber(v.balance)); }
  const rows = useMemo(() => buildLedger(forPocket(events, active)).slice(-15).reverse(), [events, active]);
  const expired = !!current && pocketStatus(current) === "Expired";
  const busyOk = !readOnly && !!current;

  const act = async (label: string, f: () => Promise<{ hash: string }>) => {
    const t = toast.loading(`${label}… check your wallet`);
    try { const { hash } = await f(); toast.success(label, { id: t, description: `tx ${hash.slice(0, 10)}…${hash.slice(-6)}` }); bump(); }
    catch (e) { toast.error(`${label} failed`, { id: t, description: cleanText((e as Error).message.split("\n")[0], 140) }); throw e; }
  };
  const quiet = (label: string, f: () => Promise<{ hash: string }>) => void act(label, f).catch(() => {});

  return (
    <>
      <Pane title="Pocket" icon={<Wallet className="size-4" />} count={pockets.length || undefined}
        actions={owner && !readOnly && <Button size="sm" variant="primary" onClick={() => setCreating(true)}><Plus className="size-3.5" />New pocket</Button>} bodyClassName="overflow-y-auto">
        <div className="space-y-4 p-4">
          {owner && (
            <div className="flex items-center justify-between rounded-[10px] border border-hair bg-e2 px-3.5 py-3">
              <div><div className="caps">Main wallet</div><div className="mono text-xs text-t3">{shortAddr(owner)}</div></div>
              <div className="display num text-xl">{mainBalance === undefined ? "…" : <>US$<Money value={usdNumber(mainBalance)} /></>}</div>
            </div>
          )}
          {!pockets.length ? (
            <Empty>No pockets yet.{!readOnly && owner && " Give your AI a pocket, not your wallet."}</Empty>
          ) : (
            <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 py-1" role="group" aria-label="Pockets">
              {pockets.map((p) => <PocketCard key={p} addr={p} v={views[p.toLowerCase()]} selected={active?.toLowerCase() === p.toLowerCase()} onSelect={() => setActive(p)} maxSeen={maxSeen[p.toLowerCase()] ?? 0} />)}
              {!readOnly && <button type="button" onClick={() => setCreating(true)} className="grid h-[172px] w-[160px] shrink-0 cursor-pointer place-items-center rounded-[14px] border border-dashed border-hair2 text-t3 transition-colors hover:border-accent hover:text-accent-ink"><span className="flex flex-col items-center gap-1 text-sm"><Plus className="size-5" />New pocket</span></button>}
            </div>
          )}
          {active && failed.has(active.toLowerCase()) && !current && <p role="status" className="rounded-[10px] border border-refused/30 bg-refused-bg px-3 py-2 text-[13px] text-refused-ink">Could not read this pocket from the chain. Check your wallet is on Base Sepolia.</p>}

          {current && active && cfg && (<>
            <dl className="grid grid-cols-2 gap-2">
              <RuleEdit label="Per-payment cap" value={money(current.cap)} current={current.cap} disabled={!busyOk || current.revoked} onSave={(n) => act("Cap updated", () => setCap(active, n))} />
              <RuleEdit label="Ask me above" value={current.askAbove === NEVER ? "never" : current.askAbove === 0n ? "every payment" : money(current.askAbove)} current={current.askAbove} allowNever disabled={!busyOk || current.revoked} onSave={(n) => act("Ask-me amount updated", () => setAskAbove(active, n))} />
              {[["Expires", dateOnly(Number(current.expiresAt) * 1000)], ["Agent key", shortAddr(current.agent)]].map(([k, v]) => (
                <div key={k} className="rounded-[10px] border border-hair bg-e1 px-3 py-2.5"><dt className="caps">{k}</dt><dd className="num mt-0.5 text-[15px] font-semibold">{v}</dd></div>
              ))}
            </dl>

            <section>
              <h3 className="caps mb-2">Allowed sellers</h3>
              <ul className="divide-y divide-hair rounded-[10px] border border-hair bg-e1">
                {cfg.sellers.map((s) => {
                  const on = current.allowed.includes(s.id);
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="grid size-7 place-items-center rounded-[6px] bg-e2 text-xs font-semibold uppercase text-t2">{s.name[0]}</span>
                      <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium">{s.name}</div><div className="truncate text-xs text-t3">{s.category} · {s.items.map((i) => (i.price ? `US$${i.price}` : "free")).join(", ")}</div></div>
                      <Switch checked={on} label={`Allow ${s.name}`} disabled={!busyOk || current.revoked} onChange={(next) => quiet(next ? `${s.name} allowed` : `${s.name} removed`, () => setSeller(active, s.payTo, next))} />
                    </li>
                  );
                })}
              </ul>
            </section>

            {busyOk && (
              <section className="space-y-3 rounded-[14px] border border-hair2 bg-e2 p-3">
                <div className="flex items-center gap-2 text-[13px] text-t2"><Clock className="size-4" aria-hidden />{current.revoked ? "Revoked. The agent cannot spend from this pocket." : expired ? "Expired. The agent cannot spend from this pocket." : "Revoke is permanent. Return funds sends the whole balance back to your wallet."}</div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <HoldButton key={`${active}-${current.revoked}`} glow={false} size="lg" radius={10} holdTime={700} resetAfter={1500} backgroundColor="var(--e1)" fillColor="var(--fg)" textColor="var(--fg)" fillTextColor="var(--bg)"
                    disabled={current.revoked} className="w-full sm:flex-1" doneLabel="Revoked" onHold={() => quiet("Pocket revoked", () => revoke(active))}>{current.revoked ? "Revoked" : "Hold to revoke"}</HoldButton>
                  <Button variant="secondary" className="h-[52px] rounded-[10px] px-5" disabled={current.balance === 0n} onClick={() => quiet("Funds returned", () => returnFunds(active))}><Undo2 className="size-4" />Return funds</Button>
                </div>
                {!current.revoked && (addFunds === null ? (
                  <button type="button" onClick={() => setAddFunds("1")} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-accent-ink hover:underline"><Coins className="size-3.5" aria-hidden />Add funds</button>
                ) : (
                  <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); let n: bigint; try { n = parseUsd(addFunds); } catch { toast.error("Enter an amount like 1 or 0.50"); return; } quiet("Funds added", () => fund(active, n)); setAddFunds(null); }}>
                    <div className="flex-1"><Field label="Add (US$)"><input className={cn(inputCls, "h-9")} value={addFunds} onChange={(e) => setAddFunds(e.target.value)} inputMode="decimal" aria-label="Amount to add" autoFocus /></Field></div>
                    <Button size="sm" variant="ghost" type="button" onClick={() => setAddFunds(null)}>Cancel</Button><Button size="sm" variant="primary" type="submit">Send</Button>
                  </form>
                ))}
              </section>
            )}

            <section><h3 className="caps mb-2">Activity</h3><Activity rows={rows} readOnly={readOnly} /></section>
          </>)}
        </div>
      </Pane>
      {owner && !readOnly && <CreatePocket open={creating} onOpenChange={setCreating} />}
    </>
  );
}
