// Every routine on the network on one week's timeline (the Pockets tab): a row per pocket with a routine, its runs as dots
// where they happened (ink: paid on its own; vermillion: it asked its owner, who co-signed or declined; hollow: nothing to
// pay, or only watched the price; a green ring: a seller's text tried to change the routine and nothing changed), its next
// runs as dashed dots ahead of the vermillion "now" line. Read from the event stream only (routineFromEvents, runsOf).
import { useEffect, useMemo, useState } from "react";
import { appFromEvents, routineFromEvents, runningNow, runsOf } from "@sim/pocketAppData";
import { cadenceText, nextRuns } from "@sim/pocketApp";
import { useNetwork } from "./network";
import { AgentTag, usd } from "./parts";
import { Card } from "../seller/ui";
import { cn } from "../lib/cn";

const DAY = 86_400_000;
const BACK = 4, AHEAD = 3; // days shown before and after now
const LAYOUT_DOT = { research: "bg-ink", deal: "bg-blue", subscriptions: "hatch", haggle: "bg-vermillion" } as const;
const when = (ms: number) => new Date(ms).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function RoutineTimeline({ open }: { open(addr: string): void }) {
  const { listed, events, nameOf } = useNetwork();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const from = new Date(now - BACK * DAY).setHours(0, 0, 0, 0);
  const to = new Date(now + AHEAD * DAY).setHours(24, 0, 0, 0);
  const x = (t: number) => `${(((t - from) / (to - from)) * 100).toFixed(3)}%`;
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
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
        <h3 className="text-[18px] font-bold leading-6 tracking-[-0.02em]">Routines this week</h3>
        <p className="text-[13px] text-muted"><span className="num font-semibold text-ink2">{total}</span> runs in view · each checked against its allowance before it pays</p>
      </div>
      <div className="mt-3 overflow-x-auto">
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
            {rows.map(({ p, rt, app, runs, next, running }) => (
              <li key={p.address} className="group relative flex h-14 items-center border-b border-line last:border-0">
                <button type="button" onClick={() => open(p.address)} className="absolute inset-0 z-0 rounded-lg transition-colors hover:bg-tile" aria-label={`${nameOf(p.address)}: ${cadenceText(rt.cadence)}, ${runs.length} runs this week. Open the pocket`} />
                <div className="pointer-events-none relative z-10 flex w-[200px] shrink-0 items-center gap-2 pr-3">
                  {app && <span aria-hidden className={cn("size-2.5 shrink-0 rounded-[3px]", LAYOUT_DOT[app.layout])} />}
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold leading-5">{nameOf(p.address)}</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-muted"><AgentTag agentKey={p.agent} className="py-0 text-[11px]" />{rt.status === "paused" ? "paused" : p.revoked ? "revoked" : ""}</span>
                  </span>
                </div>
                <div className="pointer-events-none relative z-10 h-full flex-1">
                  {/* day lines */}
                  {days.slice(1).map((d) => <span key={d} aria-hidden className="absolute inset-y-2 w-px bg-line/70" style={{ left: x(d) }} />)}
                  <span aria-hidden className="absolute inset-y-0 w-0.5 bg-vermillion" style={{ left: x(now) }} />
                  <ul className="contents">
                    {runs.map((r) => {
                      const asked = r.asked;
                      const paid = r.paid > 0n;
                      const label = `Run ${r.run}, ${when(r.at)}: ${asked ? "asked the owner" : paid ? `paid US$${usd(r.paid)}` : "nothing paid"}${r.ignored.length ? `; ${r.ignored.length} seller text ignored` : ""}${r.early ? "; ran early" : ""}`;
                      return (
                        <li key={r.run} title={label} aria-label={label} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: x(r.at) }}>
                          <span className={cn("block size-3.5 rounded-full ring-2 ring-card", asked ? "bg-vermillion" : paid ? "bg-ink" : "bg-card shadow-[inset_0_0_0_2px_var(--color-ink)]", r.ignored.length && "outline outline-2 outline-offset-2 outline-green")} />
                        </li>
                      );
                    })}
                    {next.map((t, i) => (
                      <li key={t} title={`Next run${i ? ` ${i + 1}` : ""}: ${when(t)}`} aria-label={`Scheduled ${when(t)}`} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: x(t) }}>
                        <span className="block size-3.5 rounded-full border-2 border-dashed border-muted bg-card" />
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
