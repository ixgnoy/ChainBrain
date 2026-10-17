// Every routine on the network on one week's timeline (the Pockets tab): a row per pocket with a routine, its runs as dots
// where they happened (ink: paid on its own; vermillion: it asked its owner, who co-signed or declined; hollow: nothing to
// pay, or only watched the price; a green ring: a seller's text tried to change the routine and nothing changed), its next
// runs as dashed dots ahead of the vermillion "now" line. Read from the event stream only (routineFromEvents, runsOf).
import { useEffect, useMemo, useState } from "react";
import { appFromEvents, routineFromEvents, runningNow, runsOf } from "@sim/pocketAppData";
import { cadenceText, nextRuns } from "@sim/pocketApp";
import { useNetwork } from "./network";
import { AgentTag, SellerLogo, usd } from "./parts";
import { Card } from "../seller/ui";
import { cn } from "../lib/cn";
import { curSign } from "../shared";

const DAY = 86_400_000;
const BACK = 4, AHEAD = 3; // days shown before and after now
const LAYOUT_DOT = { research: "bg-ink", deal: "bg-blue", subscriptions: "hatch", haggle: "bg-vermillion" } as const;
const when = (ms: number) => new Date(ms).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** A dot's detail card: shown on hover and on keyboard focus, above the dot, kept inside the row's width. */
function Hover({ title, lines, sellers, edge, seller, below }: { title: string; lines: string[]; sellers?: string[]; edge: "left" | "right" | "mid"; seller(id: string): string; /** the first row opens downwards (the card clips above it) */ below?: boolean }) {
  return (
    <span role="tooltip" className={cn("pointer-events-none absolute z-30 hidden w-56 rounded-xl bg-ink p-3 text-left text-on-accent shadow-level3 group-hover/dot:block group-focus-visible/dot:block", below ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]",
      edge === "left" ? "left-0" : edge === "right" ? "right-0" : "left-1/2 -translate-x-1/2")}>
      <span className="block text-[13px] font-bold leading-4">{title}</span>
      {lines.map((l) => <span key={l} className="mt-1 block text-[12px] leading-4 text-white/70">{l}</span>)}
      {sellers?.length ? <span className="mt-2 flex gap-1">{sellers.map((id) => <SellerLogo key={id} id={id} name={seller(id)} className="size-5 rounded-[6px] text-[10px]" />)}</span> : null}
    </span>
  );
}

export function RoutineTimeline({ open }: { open(addr: string): void }) {
  const { listed, events, nameOf, cfg } = useNetwork();
  const seller = (id: string) => cfg.sellers.find((x) => x.id === id)?.name ?? id;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const from = new Date(now - BACK * DAY).setHours(0, 0, 0, 0);
  const to = new Date(now + AHEAD * DAY).setHours(24, 0, 0, 0);
  const x = (t: number) => `${(((t - from) / (to - from)) * 100).toFixed(3)}%`;
  const edge = (t: number) => ((t - from) / (to - from) < 0.2 ? "left" : (t - from) / (to - from) > 0.8 ? "right" : "mid") as "left" | "right" | "mid";
  const today = new Date(now).setHours(0, 0, 0, 0);
  const rows = useMemo(() => listed([], { all: true }).flatMap((p) => {
    const rt = routineFromEvents(events as never, p.address);
    if (!rt) return [];
    const app = appFromEvents(events as never, p.address);
    const runs = runsOf(events as never, p.address).filter((r) => r.at >= from && r.at < to);
    const next = rt.status === "active" && !p.revoked ? nextRuns(rt.cadence, now, 12).filter((t) => t < to) : [];
    return [{ p, rt, app, runs, next, running: runningNow(events as never, p.address) }];
  }), [listed, events, now, from, to]);
  if (!rows.length) return null;
  const days = Array.from({ length: BACK + AHEAD + 1 }, (_, i) => from + i * DAY);
  const total = rows.reduce((n, r) => n + r.runs.length, 0);
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
        <h3 className="text-[18px] font-bold leading-6 tracking-[-0.02em]">Routines this week</h3>
        <p className="text-[13px] text-muted"><span className="num font-semibold text-ink2">{total}</span> runs in view · each checked against its allowance before it pays</p>
      </div>
      <div className="mt-3 max-lg:overflow-x-auto">
        <div className="min-w-[720px] px-5 pb-4">
          {/* the day axis */}
          <div className="relative ml-[200px] h-6 border-b border-line">
            {days.map((d) => (
              <span key={d} className={cn("absolute top-0 -translate-x-0 pl-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]", new Date(d).toDateString() === new Date(now).toDateString() ? "text-ink" : "text-muted")} style={{ left: x(d) }}>
                {new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}
              </span>
            ))}
          </div>
          <ol aria-label="Routines">
            {rows.map(({ p, rt, app, runs, next, running }, row) => (
              <li key={p.address} className="relative flex h-14 items-center border-b border-line last:border-0 hover:z-20 focus-within:z-20">
                <button type="button" onClick={() => open(p.address)} className="absolute inset-0 z-0 rounded-lg transition-colors hover:bg-tile" aria-label={`${nameOf(p.address)}: ${cadenceText(rt.cadence)}, ${runs.length} runs this week. Open the pocket`} />
                <div className="pointer-events-none relative z-10 flex w-[200px] shrink-0 items-center gap-2 pr-3">
                  {app && <span aria-hidden className={cn("size-2.5 shrink-0 rounded-[3px]", LAYOUT_DOT[app.layout])} />}
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold leading-5">{nameOf(p.address)}</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-muted"><AgentTag agentKey={p.agent} className="py-0 text-[11px]" />{rt.status === "paused" ? "paused" : p.revoked ? "revoked" : ""}</span>
                  </span>
                </div>
                <div className="pointer-events-none relative z-10 h-full flex-1">
                  {/* today, as a band across every row */}
                  <span aria-hidden className="absolute inset-y-0 bg-blue-soft/50" style={{ left: x(today), width: `${(DAY / (to - from)) * 100}%` }} />
                  {/* day lines */}
                  {days.slice(1).map((d) => <span key={d} aria-hidden className="absolute inset-y-2 w-px bg-line/70" style={{ left: x(d) }} />)}
                  <span aria-hidden className="absolute inset-y-0 w-0.5 bg-vermillion" style={{ left: x(now) }} />
                  <ul className="contents">
                    {runs.map((r) => {
                      const asked = r.asked;
                      const paid = r.paid > 0n;
                      const label = `Run ${r.run}, ${when(r.at)}: ${asked ? "asked the owner" : paid ? `paid ${curSign()}${usd(r.paid)}` : "nothing paid"}${r.ignored.length ? `; ${r.ignored.length} seller text ignored` : ""}${r.early ? "; ran early" : ""}`;
                      return (
                        <li key={r.run} tabIndex={0} aria-label={label} className="group/dot pointer-events-auto absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink" style={{ left: x(r.at) }}>
                          <span className={cn("block size-3.5 rounded-full ring-2 ring-card transition-transform group-hover/dot:scale-125", asked ? "bg-vermillion" : paid ? "bg-ink" : "bg-card shadow-[inset_0_0_0_2px_var(--color-ink)]", r.ignored.length && "outline outline-2 outline-offset-2 outline-green")} />
                          <Hover below={row === 0} edge={edge(r.at)} seller={seller} title={`Run ${r.run} · ${when(r.at)}`}
                            sellers={[...new Set(r.outs.filter((o) => o.outcome === "paid" || o.outcome === "cosigned").map((o) => String(o.sellerId)))]}
                            lines={[asked ? `Asked its owner: ${r.outs.some((o) => o.outcome === "cosigned") ? "co-signed" : "declined"}` : paid ? `Paid ${curSign()}${usd(r.paid)} on its own` : r.outs.some((o) => o.outcome === "watching") ? "Checked the price: above the limit, so no buy" : "Nothing to pay",
                              ...(r.ignored.length ? [`${r.ignored.length} seller text ignored: the routine didn't change`] : []), ...(r.early ? ["Ran early, by its owner"] : [])]} />
                        </li>
                      );
                    })}
                    {next.map((t, i) => (
                      <li key={t} tabIndex={0} aria-label={`Scheduled ${when(t)}`} className="group/dot pointer-events-auto absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink" style={{ left: x(t) }}>
                        <span className="block size-3.5 rounded-full border-2 border-dashed border-muted bg-card transition-transform group-hover/dot:scale-125" />
                        <Hover below={row === 0} edge={edge(t)} seller={seller} title={i === 0 ? `Next run · ${when(t)}` : `Scheduled · ${when(t)}`}
                          sellers={[...new Set(rt.items.map((it) => it.sellerId))]}
                          lines={[rt.kind === "price-watch" ? `Buys only at ${curSign()}${rt.limitPrice} or less` : `${rt.items.length} ${rt.items.length === 1 ? "item" : "items"} from the sellers named`, `Inside ${curSign()}${rt.allowance.amount} a ${rt.allowance.period}, or it asks its owner`]} />
                      </li>
                    ))}
                    {running && (
                      <li aria-label={`Run ${running.run} going on now`} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: x(now) }}>
                        <span className="block size-4 animate-pulse rounded-full bg-vermillion ring-4 ring-vermillion/25" />
                      </li>
                    )}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted" aria-hidden>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-ink" />Paid on its own</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-vermillion" />Asked its owner</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-card shadow-[inset_0_0_0_2px_var(--color-ink)]" />Nothing paid</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-card outline outline-2 outline-offset-1 outline-green" />Seller text ignored</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full border-2 border-dashed border-muted" />Scheduled</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-vermillion" />Now</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
