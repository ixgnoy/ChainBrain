import { useMemo, useRef, useState } from "react";
import { Activity, Bot, Landmark, Link2, ShieldCheck, UserRound, TriangleAlert } from "lucide-react";
import { Button, Chip, Drawer, Empty, Pane, ReasonChip, Segmented, TxLink } from "../components/ui";
import { useConsole } from "../console";
import { useEvents, type WalletEvent } from "../useEvents";
import { forPocket } from "../lib/events";
import { argSummary, traceRows, untrustedOf, type Actor, type TraceRow } from "../lib/trace";
import { cleanText } from "../lib/sanitize";
import { clock, pseudonym } from "../lib/format";
import { REASONS, reasonLayer, shortAddr } from "../shared";
import { cn } from "../lib/cn";

type Filter = "all" | "ok" | "refused" | "stepup";
type Scope = "pocket" | "all";
const ACTOR_ICON: Record<Actor, typeof Bot> = { Agent: Bot, Seller: Landmark, Policy: ShieldCheck, Owner: UserRound, Chain: Link2 };

/** Quarantined, monospace box for seller-supplied text. Plain text only, always through cleanText. */
export function Untrusted({ source, text, injection }: { source?: string; text: string; injection?: boolean }) {
  return (
    <div className={cn("mt-2 overflow-hidden rounded-xl border border-dashed", injection ? "border-refused/50 bg-refused-bg" : "border-hair2 bg-e2")}>
      <div className="flex items-center gap-1.5 border-b border-dashed border-inherit px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-t2">
        <TriangleAlert className={cn("size-3", injection && "text-refused")} aria-hidden />
        Untrusted seller content{source ? ` · ${cleanText(source, 40)}` : ""}
        {injection && <span className="ml-auto rounded-full bg-refused/20 px-1.5 py-0.5 text-refused-ink">instruction-like text</span>}
      </div>
      <pre className="mono max-h-28 overflow-auto whitespace-pre-wrap break-words px-2.5 py-2 text-[11.5px] leading-4 text-t2">{text}</pre>
    </div>
  );
}

function Row({ row, onOpen, fresh, showPocket, readOnly }: { row: TraceRow; onOpen: () => void; fresh: boolean; showPocket: boolean; readOnly: boolean }) {
  const e = row.event;
  const Icon = ACTOR_ICON[row.actor] ?? Activity;
  const first = row.reasons[0];
  const u = untrustedOf({ ...e, type: "trace", phase: "tool_result", result: row.result });
  const args = e.type === "trace" && e.args && Object.keys(e.args).length ? JSON.stringify(e.args, null, 2) : null;
  const title = readOnly && row.actor === "Owner" ? "(owner text hidden)" : row.title;
  return (
    <li className={cn("group relative border-b border-hair last:border-0", fresh && "row-in")}>
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-e2" aria-label={`Open raw event: ${row.label} ${title}`}>
        <span className="mono mt-0.5 w-[60px] shrink-0 text-[11px] text-t3">{clock(row.at)}</span>
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-e3 text-t2"><Icon className="size-3" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="mono text-[12px] font-semibold text-fg">{row.label}</span>
            {row.verdict && <Chip kind={row.kind}>{row.verdict}</Chip>}
            {row.reasons.map((c) => <ReasonChip key={c} code={c} />)}
            {showPocket && e.pocket && <span className="mono text-[11px] text-t3">{readOnly ? pseudonym(e.pocket) : shortAddr(e.pocket)}</span>}
          </span>
          <span className="mt-0.5 block break-words text-[13px] leading-5 text-t2">{title}</span>
          {first && <span className="mt-0.5 block text-[12px] text-t3">{REASONS[first] ?? ""} · {reasonLayer(first)}</span>}
        </span>
      </button>
      {(args || row.tx || u) && (
        <div className="px-4 pb-2.5 pl-[111px]">
          {args && !readOnly && (
            <details className="text-xs text-t3"><summary className="cursor-pointer select-none hover:text-t2">args {argSummary(e.args)}</summary>
              <pre className="mono mt-1 max-h-32 overflow-auto rounded-lg bg-e2 p-2 text-[11px] text-t2">{cleanText(args, 1500)}</pre></details>
          )}
          {row.tx && <div className="mt-1 flex items-center gap-1.5 text-xs text-t2">tx <TxLink hash={row.tx} /></div>}
          {u && <Untrusted source={u.source} text={u.text} injection={u.injection} />}
        </div>
      )}
    </li>
  );
}

export default function Trace() {
  const { active, readOnly } = useConsole();
  const { events, connected } = useEvents();
  const [filter, setFilter] = useState<Filter>("all");
  const [scope, setScope] = useState<Scope>("pocket");
  const [open, setOpen] = useState<WalletEvent | null>(null);
  const mounted = useRef(Date.now());
  const scoped = useMemo(() => (scope === "all" || !active ? events : forPocket(events, active)), [events, scope, active]);
  const rows = useMemo(() => traceRows(scoped), [scoped]);
  const redact = (ev: WalletEvent) => (readOnly ? { ...ev, text: undefined, args: undefined, approval: ev.approval ? { ...ev.approval, text: undefined } : undefined } : ev);
  const shown = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.kind === filter)).slice(-300).reverse(), [rows, filter]); // newest first

  return (
    <>
      <Pane title="Live trace" icon={<Activity className="size-4" />} count={rows.length}
        actions={<span className={cn("flex items-center gap-1.5 text-xs", connected ? "text-ok-ink" : "text-t3")}><span className={cn("size-1.5 rounded-full", connected ? "bg-ok" : "bg-t3")} />{connected ? "Live" : "Offline"}</span>}
        toolbar={<>
          <Segmented<Scope> label="Trace scope" value={scope} onChange={setScope} options={[{ value: "pocket", label: "This pocket" }, { value: "all", label: "All pockets" }]} />
          <Segmented<Filter> label="Verdict filter" className="ml-auto" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "ok", label: "Allowed" }, { value: "refused", label: "Refused" }, { value: "stepup", label: "Needs you" }]} />
        </>}
        bodyClassName="overflow-y-auto">
        {shown.length === 0 ? <Empty icon={<Landmark className="size-6" />}>{connected ? (active || scope === "all" ? "No events yet. Ask the agent to buy something." : "Create a pocket to see the agent at work.") : "Waiting for the event stream…"}</Empty> : (
          <ul>{shown.map((r) => <Row key={r.key} row={r} fresh={r.at >= mounted.current} showPocket={scope === "all"} readOnly={readOnly} onOpen={() => setOpen(r.event)} />)}</ul>
        )}
      </Pane>
      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open ? `${open.type} event` : "Event"} description="Raw JSON, exactly as received from the stream.">
        {open && (<>
          <pre className="mono overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-hair bg-e2 p-3 text-[12px] leading-5 text-t2">{cleanText(JSON.stringify(redact(open), null, 2), 20000)}</pre>
          <div className="mt-3 flex justify-end"><Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(JSON.stringify(redact(open), null, 2)).catch(() => {})}>Copy JSON</Button></div>
        </>)}
      </Drawer>
    </>
  );
}
