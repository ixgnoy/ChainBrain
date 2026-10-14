import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowUp, MessageSquare, ShieldAlert, TriangleAlert, HelpCircle, ListChecks } from "lucide-react";
import { toast } from "sonner";
import ThoughtLine from "../components/vendor/ThoughtLine";
import { AgentOrb, Button, Pane, Chip, ReasonChip } from "../components/ui";
import { useConsole } from "../console";
import { useChat, STOPPED_TEXT, type ChatMsg } from "../useChat";
import { useApprovals } from "../useApprovals";
import { useEvents } from "../useEvents";
import { useDev } from "../useDev";
import { forPocket, type Approval } from "../lib/events";
import { stepLines, traceRows, type TraceRow } from "../lib/trace";
import { cleanText } from "../lib/sanitize";
import { cn } from "../lib/cn";

const FALLBACK = "Get me a market report on durian exports, under US$2, by tonight.";

function AgentTurn({ m, rows }: { m: ChatMsg; rows: TraceRow[] }) {
  const win = useMemo(() => rows.filter((r) => r.at >= (m.sentAt ?? m.at) - 2000 && r.at <= (m.doneAt ?? Date.now() + 60_000) + 1500), [rows, m.sentAt, m.at, m.doneAt]);
  const steps = useMemo(() => stepLines(win).map((s) => s.text), [win]);
  const elapsed = m.doneAt && m.sentAt ? (m.doneAt - m.sentAt) / 1000 : undefined;
  return (
    <div className="row-in flex gap-3">
      <div className="pt-0.5"><AgentOrb state={m.pending ? "thinking" : m.error ? "blocked" : "idle"} size={26} /></div>
      <div className="min-w-0 flex-1">
        {m.text && <p className={cn("whitespace-pre-wrap break-words text-[14px] leading-6", m.error && "text-refused-ink")}>{cleanText(m.text, 4000)}</p>}
        {m.stopped && STOPPED_TEXT[m.stopped] && <p className="mt-1 text-xs text-stepup-ink">{STOPPED_TEXT[m.stopped]}</p>}
        {(m.pending || steps.length > 0) && (
          <div className={cn(m.text && "mt-2")}>
            <ThoughtLine working={!!m.pending} steps={steps} label={m.pending ? "Working…" : "Worked"} doneLabel="Worked for" elapsed={elapsed} fontSize={12.5} color="var(--t2)" glyphColor="var(--agent)" collapseOnSettle />
          </div>
        )}
      </div>
    </div>
  );
}

function IntentCard({ a, readOnly }: { a: Approval; readOnly: boolean }) {
  const { decide } = useApprovals();
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const go = async (approved: boolean) => {
    setBusy(approved ? "yes" : "no");
    const r = await decide(a.id, { approved });
    setBusy(null);
    if (!r.ok) toast.error(r.error === "NOT_PENDING" ? "Already resolved" : "Could not send your answer", { description: r.error === "NOT_PENDING" ? "This task card is no longer waiting for you." : r.error });
  };
  return (
    <div className="row-in rounded-2xl border border-accent/40 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] p-3.5" role="group" aria-label="Task card to confirm">
      <div className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="size-4 text-accent-ink" aria-hidden />Confirm this task<Chip kind="stepup" dot>Held for you</Chip></div>
      <p className="mt-0.5 text-xs text-t3">Shown from a fixed template, not the agent's own words.</p>
      <pre className="mono mt-2 whitespace-pre-wrap break-words rounded-xl bg-e2 p-3 text-[12.5px] leading-5">{cleanText(a.text, 800)}</pre>
      {!readOnly && (
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void go(false)}>Decline</Button>
          <Button size="sm" variant="primary" disabled={!!busy} onClick={() => void go(true)}>{busy === "yes" ? "Confirming…" : "Confirm"}</Button>
        </div>
      )}
    </div>
  );
}

export default function Chat({ onReview }: { onReview(a: Approval): void }) {
  const { active, readOnly, owner } = useConsole();
  const { messages, send, busy } = useChat();
  const { pendingFor } = useApprovals();
  const { events } = useEvents();
  const dev = useDev();
  const [text, setText] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const end = useRef<HTMLDivElement>(null);

  const mine = useMemo(() => forPocket(events, active), [events, active]);
  const rows = useMemo(() => traceRows(mine), [mine]);
  const msgs = messages(active);
  const isBusy = busy(active);
  const pend = pendingFor(active);
  const intent = pend.filter((a) => a.kind === "intent").at(-1);
  const question = pend.filter((a) => a.kind === "question").at(-1);
  const payments = pend.filter((a) => a.kind === "payment");
  const disclosures = mine.filter((e) => e.type === "disclosure");
  const lastDisclosure = disclosures.at(-1);
  const disclosureKey = lastDisclosure ? `${lastDisclosure.at}-${lastDisclosure.sellerId}` : "";
  const scenes = dev.state ? dev.scenes : [];
  const chips = scenes.length ? scenes.map((s) => ({ id: s.id, label: `${s.id}. ${s.title}`, text: s.text })) : [{ id: "0", label: FALLBACK, text: FALLBACK }];

  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [msgs.length, pend.length, msgs.at(-1)?.text]);

  const submit = (e: FormEvent) => { e.preventDefault(); if (!active || !text.trim() || isBusy) return; const t = text; setText(""); void send(active, t); };
  const state = payments.length || intent ? "waiting" : isBusy ? "thinking" : "idle";

  return (
    <Pane title="Agent chat" icon={<MessageSquare className="size-4" />} count={msgs.filter((m) => m.role === "user").length || undefined}
      actions={<span className="flex items-center gap-2 text-xs text-t2"><AgentOrb state={state} size={14} />{state === "waiting" ? "Waiting for you" : state === "thinking" ? "Working" : "Idle"}</span>}
      bodyClassName="flex flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Conversation">
        {lastDisclosure && !dismissed.has(disclosureKey) && (
          <div className="sticky top-0 z-10 rounded-2xl bg-e1"><div role="alert" className="row-in flex items-start gap-3 rounded-2xl border border-refused/30 bg-refused-bg p-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-refused" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-refused-ink">A seller asked for more than the purchase</div>
              <p className="mt-0.5 break-words text-[13px] text-t2">
                {cleanText(lastDisclosure.sellerId, 30)} asked for {(lastDisclosure.asked ?? []).map((x: string) => cleanText(x, 30)).join(", ") || "personal data"}{lastDisclosure.signRequest ? " and a signature" : ""}. The wallet refused and nothing was shared or signed.
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{(lastDisclosure.refused ?? []).map((c: string) => <ReasonChip key={c} code={c} />)}{disclosures.length > 1 && <span className="text-[11px] text-t3">{disclosures.length} requests this session</span>}</div>
            </div>
            <button type="button" onClick={() => setDismissed((s) => new Set(s).add(disclosureKey))} className="rounded-full px-2 py-1 text-xs text-t3 hover:bg-e3 hover:text-fg" aria-label="Dismiss this notice">Dismiss</button>
          </div></div>
        )}
        {!active ? (
          <div className="grid h-full place-items-center text-center"><div className="max-w-xs"><AgentOrb size={44} /><p className="display mt-4 text-base">No pocket yet</p><p className="mt-1 text-[13px] text-t2">{owner ? "Create a pocket to give the agent a budget, then ask it to buy something." : "Connect your wallet, then create a pocket."}</p></div></div>
        ) : msgs.length === 0 && !pend.length ? (
          <div className="grid h-full place-items-center text-center"><div className="max-w-xs"><AgentOrb size={44} /><p className="display mt-4 text-base">Procurement agent</p><p className="mt-1 text-[13px] text-t2">Ask it to buy something. It pays only from this pocket, inside the rules you set.</p></div></div>
        ) : null}
        {msgs.map((m) => m.role === "user" ? (
          <div key={m.id} className="row-in flex justify-end"><div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-accent px-4 py-2.5 text-[14px] leading-6 text-on-accent">{readOnly ? "(owner message hidden)" : cleanText(m.text, 2000)}</div></div>
        ) : <AgentTurn key={m.id} m={m} rows={rows} />)}
        {question && (
          <div className="row-in flex items-start gap-3 rounded-2xl border border-info/30 bg-info-bg p-3">
            <HelpCircle className="mt-0.5 size-5 shrink-0 text-info-ink" aria-hidden />
            <div className="min-w-0 flex-1"><div className="text-sm font-semibold">The agent asks</div><p className="mt-0.5 break-words text-[13px] text-t2">{cleanText(question.text, 400)}</p><p className="mt-1 text-xs text-t3">Your next message is the answer.</p></div>
          </div>
        )}
        {intent && <IntentCard a={intent} readOnly={readOnly} />}
        {payments.map((a) => (
          <div key={a.id} className="row-in flex items-start gap-3 rounded-2xl border border-stepup/30 bg-stepup-bg p-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-stepup" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold"><span>Approval needed</span><Chip kind="stepup" dot>Held for you</Chip></div>
              <p className="mt-0.5 line-clamp-2 break-words text-[13px] text-t2">US${cleanText(a.data?.amount, 12)} to {cleanText(a.data?.sellerId, 30)}. {cleanText(a.text, 160)}</p>
            </div>
            {!readOnly && <Button size="sm" variant="primary" onClick={() => onReview(a)}>Review</Button>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="shrink-0 border-t border-hair p-3">
        {!readOnly && active && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" aria-label="Suggested prompts">
            {chips.map((c) => (
              <button key={c.id} type="button" disabled={isBusy} onClick={() => void send(active, c.text)} title={c.text}
                className="max-w-[260px] shrink-0 truncate rounded-full border border-hair2 bg-e2 px-3 py-1.5 text-xs text-t2 transition-colors hover:border-accent hover:text-fg disabled:opacity-50">{c.label}</button>
            ))}
          </div>
        )}
        {readOnly ? (
          <p className="rounded-xl bg-e2 px-3 py-2 text-center text-xs text-t3">Read-only · Regulator view</p>
        ) : (
          <form onSubmit={submit} className="flex items-center gap-2 rounded-full border border-hair2 bg-e2 py-1 pl-4 pr-1 focus-within:border-accent">
            <input value={text} onChange={(e) => setText(e.target.value)} disabled={!active} aria-label="Message the agent"
              placeholder={!active ? "Create a pocket first" : question ? "Answer the agent…" : isBusy ? "The agent is working…" : "Ask the agent to buy something…"}
              className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-t3 focus-visible:shadow-none disabled:opacity-60" />
            <button type="submit" disabled={!text.trim() || isBusy || !active} aria-label="Send" className="grid size-9 place-items-center rounded-full bg-accent text-on-accent transition-opacity disabled:opacity-40"><ArrowUp className="size-4" /></button>
          </form>
        )}
      </div>
    </Pane>
  );
}
