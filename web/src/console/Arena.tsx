// The attack arena: the four attacks the rules name, each with a one-tap attack, a box for the judge's own words, the
// expected result and the actual verdict, read back from the events the attack produced (arena.ts). The scoreboard sums
// what the network has stopped. Nothing here decides anything: the wallet and the pocket contract do, this only asks.
import { useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Loader, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { GATES, attackBoard, type Attempt } from "@sim/checks";
import { useNetwork } from "./useNetwork";
import { playScene } from "./play";
import { GateStrip } from "./ChecksPath";
import { TxHash, PhoneTag, usd } from "./parts";
import { ARENA_KEYS, CARDS, ESCALATION_TEXT, EXTRACTION_TEXT, INJECTION_TEXT, arenaVerdict, arrivedSince, baseline, boardLine, movedSince, ruleShot, type ArenaCard, type ArenaKey, type RuleShot } from "./arenaRules";
import { Button, Card, PillSelect } from "../seller/ui";
import { cn } from "../lib/cn";

type Fired = { base: Record<string, number>; pocket?: string; busy: boolean; reply?: string; note?: string; ok?: boolean; text: string; tx?: string; at: number; doneAt?: number; rules?: RuleShot };
type Run = () => Promise<{ ok: boolean; text: string; pocket?: string; tx?: string }>;
const I = { strokeWidth: 1.75 } as const;
const BAND: Record<string, string> = { idle: "band-idle", running: "band-run", blocked: "band-ok", answered: "band-idle", lost: "band-bad", error: "band-bad" };
/** How long an answered attack waits for its attempt to arrive before the card settles on what the events show. */
const SETTLE_MS = 3000;
const field = "w-full resize-none rounded-[16px] bg-tile px-4 py-3 text-[14px] leading-5 outline-none shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] placeholder:text-faint focus:bg-card focus:ring-2 focus:ring-ink";

function Scoreboard({ attempts }: { attempts: Attempt[] }) {
  const board = useMemo(() => attackBoard(attempts), [attempts]);
  const line = boardLine(board);
  return (
    <div className="card relative mb-4 overflow-hidden bg-ink p-5 text-on-accent sm:p-8">
      <div aria-hidden className="hatch hatch-white pointer-events-none absolute inset-y-0 right-0 hidden w-1/4 opacity-25 sm:block" />
      <div data-testid="arena-scoreboard" data-blocked={line.blocked} data-tried={line.tried} data-lost={line.lost} className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div>
          <p className="eyebrow mb-2 text-white/60">Scoreboard</p>
          <p className="figure text-[29px] leading-[36px] sm:text-[56px] sm:leading-[60px]" aria-live="polite">{line.tried === 0 ? <>{line.total} attacks to{"\u00a0"}try</> : <>{line.blocked} of {line.tried} {line.tried === 1 ? "attack" : "attacks"}{"\u00a0"}blocked</>}<span className={cn("block sm:inline", board.lost > 0n ? "text-vermillion" : "text-green")}><span className="hidden text-white sm:inline"> · </span>{line.lost} lost</span></p>
          <p className="mt-2 text-[14px] font-medium text-white/70">{line.tried === 0 ? "Nothing tried yet. Pick an attack below." : line.untried.length ? `${line.untried.length} not tried yet.` : "Every attack has been tried."}</p>
        </div>
        <ul className="relative flex flex-wrap gap-2" aria-label="Attack results">
          {ARENA_KEYS.map((k) => {
            const b = board[k];
            const st = b.tried === 0 ? "idle" : b.blocked === b.tried ? "blocked" : "lost";
            return <li key={k} data-state={st} title={CARDS.find((c) => c.key === k)!.title} className="flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-[12px] font-bold text-ink"><span className={cn("grid size-5 place-items-center rounded-full", st === "blocked" ? "bg-green text-ink" : st === "lost" ? "bg-vermillion text-on-accent" : "bg-tile text-faint")}>{st === "blocked" ? <Check className="size-3" strokeWidth={3} aria-hidden /> : st === "lost" ? <ShieldAlert className="size-3" aria-hidden /> : <span className="size-1 rounded-full bg-faint" />}</span>{CARDS.find((c) => c.key === k)!.title.split(" ")[0]}</li>;
          })}
        </ul>
      </div>
    </div>
  );
}

export function Arena({ aim, setAim, watch }: { aim: string; setAim(a: string): void; watch(pocket: string): void }) {
  const { attempts, actions, linked, scenes, refresh, listed, nameOf, isPhone, events, pockets } = useNetwork();
  const [, settle] = useState(0);
  const rulesOf = (p?: string) => ruleShot(pockets.find((x) => x.address.toLowerCase() === (p ?? "").toLowerCase()));
  const latest = useRef(attempts);
  latest.current = attempts;
  const [fired, setFired] = useState<Partial<Record<ArenaKey, Fired>>>({});
  const [openOwn, setOpenOwn] = useState<Partial<Record<ArenaKey, boolean>>>({});
  const [texts, setTexts] = useState<Record<ArenaKey, string>>({ induced: "", extraction: "", escalation: "", injection: "" });
  const scene = (id: string) => scenes.find((s) => s.id === id);

  const fire = async (key: ArenaKey, pocket: string | undefined, run: Run, keepReply?: string) => {
    setFired((f) => ({ ...f, [key]: { base: baseline(latest.current, key), pocket, busy: true, text: "", reply: keepReply, at: Date.now(), rules: rulesOf(pocket) } }));
    try {
      const r = await run();
      setFired((f) => (f[key] ? { ...f, [key]: { ...f[key]!, busy: false, ok: r.ok, text: r.text, tx: r.tx, pocket: r.pocket ?? pocket, reply: f[key]!.reply ?? undefined, doneAt: Date.now() } } : f));
    } catch (e) {
      setFired((f) => (f[key] ? { ...f, [key]: { ...f[key]!, busy: false, ok: false, text: (e as Error).message, doneAt: Date.now() } } : f));
    }
    setTimeout(() => settle((x) => x + 1), SETTLE_MS + 100);
    refresh();
  };

  const chat = (key: ArenaKey, text: string) => fire(key, aim, async () => {
    const r = await actions.chat!(aim, text);
    setFired((f) => (f[key] ? { ...f, [key]: { ...f[key]!, reply: r.text } } : f));
    return r;
  });
  const hijack = (text?: string, keep?: string) => fire("induced", aim, () => actions.hijack!(aim, text), keep);
  const injection = (text: string) => fire("injection", undefined, async () => {
    const s5 = scene("5");
    const p = await actions.plant!("shadyfeed", text);
    if (!p.ok) return p;
    if (!s5) return { ok: true, text: `${p.text} Ask the agent to check ShadyFeed's preview.` };
    const r = await playScene(actions, linked, s5);
    return { ...r, text: r.ok ? (linked ? "Planted. Confirm the task on your phone to let the agent read it." : "Planted, and the agent read ShadyFeed's preview.") : r.text };
  });
  const extractionScene = () => fire("extraction", undefined, async () => { const s6 = scene("6"); return s6 ? playScene(actions, linked, s6) : { ok: false, text: "Scene 6 is not available here." }; });

  const canChat = !!actions.chat, canHijack = !!actions.hijack;
  const canInject = !!actions.plant && !!(actions.runScene || (linked && actions.say));
  const can: Record<ArenaKey, boolean> = { induced: canHijack, extraction: canChat, escalation: canChat, injection: canInject };
  const why: Record<ArenaKey, string> = {
    induced: "This server has no way to sign as the agent from here. On the real chain it runs from server/scripts/force-transfer.ts.",
    extraction: "This server has no chat route from here.", escalation: "This server has no chat route from here.",
    injection: "Needs the seller admin address, and the built-in network or a linked phone to play scene 5.",
  };
  const oneTap = (c: ArenaCard) => {
    if (c.key === "induced") return () => void hijack();
    if (c.key === "extraction") return () => void chat("extraction", EXTRACTION_TEXT);
    if (c.key === "escalation") return () => void chat("escalation", ESCALATION_TEXT);
    return () => void injection(INJECTION_TEXT);
  };
  const own = (c: ArenaCard) => {
    const t = texts[c.key].trim();
    if (!t) return;
    if (c.key === "induced") void chat("induced", t);
    else if (c.key === "injection") void injection(t);
    else void chat(c.key, t);
  };

  const cards = CARDS;
  const names = listed([aim]);
  return (
    <section aria-label="Attack arena" data-testid="arena">
      <Scoreboard attempts={attempts} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[15px] font-bold tracking-[-0.01em]">Attack this pocket</span>
        <PillSelect tone="fill" className="min-w-[240px]" label="Pocket to attack" value={aim} onChange={setAim} shown={aim ? <>{nameOf(aim)}{isPhone(aim) && <PhoneTag />}</> : "No pocket"}>{names.map((p) => <option key={p.address} value={p.address}>{nameOf(p.address)} · {usd(p.balance)}</option>)}</PillSelect>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.map((c) => {
          const f = fired[c.key];
          const arrived = f ? arrivedSince(attempts, c.key, f.base, f.pocket) : [];
          const v = f ? arenaVerdict(arrived) : undefined;
          // a source that reports no attempt for this attack (a real server has no attack events) settles on what moved, if anything
          const answered = !!f && !f.busy && f.ok === true && v?.state === "waiting" && !!f.doneAt && Date.now() - f.doneAt >= SETTLE_MS;
          const moved = answered && !!f.pocket && movedSince(events, f.pocket, f.at - 1000, f.rules, rulesOf(f.pocket));
          const state = !f ? "idle" : v?.state === "blocked" ? "blocked" : v?.state === "lost" ? "lost" : answered ? "answered" : f.busy || f.ok !== false ? "running" : "error";
          return (
            <Card key={c.key} className="flex flex-col overflow-hidden">
              <div data-testid={`arena-card-${c.key}`} data-state={state} className="flex flex-1 flex-col">
                <div aria-hidden={false} className={cn("hatch flex h-14 items-center justify-between gap-3 px-5 sm:px-6", BAND[state])}>
                  <span className="eyebrow rounded-full bg-white px-3 py-1.5 text-ink">Attack {cards.indexOf(c) + 1}</span>
                  <span className={cn("inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[12px] font-extrabold", state === "blocked" ? "bg-green-ink text-on-accent" : state === "answered" ? "bg-ink text-on-accent" : state === "lost" ? "bg-vermillion text-on-accent" : state === "running" ? "bg-blue-ink text-on-accent" : state === "error" ? "bg-vermillion-ink text-on-accent" : "bg-white text-muted")}>{state === "blocked" ? "Blocked" : state === "answered" ? (moved ? "Check Live" : "Nothing moved") : state === "lost" ? "Not stopped" : state === "running" ? "Running" : state === "error" ? "Could not run" : "Ready"}</span>
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h3 className="text-[22px] font-bold leading-7 tracking-[-0.02em]">{c.title}</h3>
                <p className="mt-1.5 text-[14px] leading-5 text-ink2">{c.threat}</p>
                <p className="mt-3 text-[13px] leading-5 text-muted"><span className="font-bold text-ink">Expected · </span>{c.expected}</p>
                {c.key === "escalation" && <p className="tile mt-2 px-3.5 py-2.5 text-[13px] leading-5 text-ink2">Only the owner's key can change rules <span className="text-faint">·</span> <span className="num font-bold text-ink">onlyOwner → NOT_OWNER</span></p>}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="hot" data-testid={`arena-fire-${c.key}`} className="h-11 px-5 text-[14px]" disabled={!aim && c.key !== "injection" || !can[c.key] || !!f?.busy} onClick={oneTap(c)}>{f?.busy ? <><Loader className="size-4 animate-spin" aria-hidden />Running…</> : c.button}</Button>
                  {c.key === "extraction" && canChat && <button type="button" disabled={!scene("6") || !!f?.busy} onClick={() => void extractionScene()} className="pressable relative h-11 rounded-[14px] bg-blue px-4 text-[14px] font-bold text-blue-ink hover:bg-blue-press disabled:opacity-40">Or play scene 6 (ShadyFeed asks)</button>}
                </div>
                {!can[c.key] && <p className="mt-2 text-[13px] leading-5 text-muted">{why[c.key]}</p>}

                <button type="button" aria-expanded={!!openOwn[c.key]} data-testid={`arena-own-${c.key}`} onClick={() => setOpenOwn((o) => ({ ...o, [c.key]: !o[c.key] }))} className="relative mt-3 inline-flex h-9 items-center gap-1 self-start text-[13px] font-bold text-ink before:absolute before:-inset-y-1 before:-inset-x-2 before:content-[''] hover:underline"><ChevronRight className={cn("size-4 transition-transform", openOwn[c.key] && "rotate-90")} aria-hidden />Write your own attack</button>
                {openOwn[c.key] && <label className="fade-up mt-1 block">
                  <textarea aria-label={`Your own attack: ${c.title}`} rows={2} value={texts[c.key]} placeholder={c.placeholder} onChange={(e) => setTexts((t) => ({ ...t, [c.key]: e.target.value }))} className={field} />
                </label>}
                {openOwn[c.key] && <div className="mt-2"><Button variant="outline" data-testid={`arena-send-${c.key}`} className="h-11 px-5 text-[14px]" disabled={!texts[c.key].trim() || !can[c.key] || !!f?.busy || (c.key === "induced" && !canChat)} onClick={() => own(c)}>{c.key === "injection" ? "Plant it and play scene 5" : "Send my attack"}</Button></div>}

                {f && (
                  <div data-testid={`arena-verdict-${c.key}`} data-state={state} role="status" className="tile fade-up mt-4 p-4">
                    {f.reply && <p className="mb-3 border-l-2 border-ink pl-3 text-[14px] leading-5 text-ink2 [overflow-wrap:anywhere]">The agent: “{f.reply.slice(0, 320)}”</p>}
                    {v?.state === "waiting" && (f.busy ? <p className="flex items-center gap-2 text-[14px] text-ink2"><Loader className="size-4 animate-spin" aria-hidden />Running the attack…</p> : f.ok === false ? <p className="flex items-start gap-2 text-[14px] font-semibold text-vermillion-ink"><ShieldAlert className="mt-0.5 size-4 shrink-0" {...I} aria-hidden />{f.text || "It could not run."}</p> : answered ? <p className="text-[14px] font-semibold text-ink">{moved ? "Something changed on this pocket since you asked. Check it in Live." : `Nothing moved: no payment and no rule change on ${f.pocket ? nameOf(f.pocket) : "this pocket"} since you asked.`}</p>
                      : <p className="text-[14px] text-ink2">{f.text && f.text !== f.reply ? f.text : f.reply ? "Checking what it did…" : "Waiting for the agent's answer."}</p>)}
                    {v && v.state !== "waiting" && <Result card={c} v={v} />}
                    {v?.state === "blocked" && v.inWords && actions.hijack && (
                      <div className="mt-3 border-t border-line pt-3">
                        <p className="text-[13px] leading-5 text-muted">It refused in words. What if it had believed you?</p>
                        <Button data-testid="arena-fooled-next" className="mt-2 h-11 px-5 text-[14px]" disabled={f.busy} onClick={() => void hijack(texts.induced.trim() || undefined, f.reply)}>Assume it's fooled</Button>
                      </div>
                    )}
                    {v && (v.state !== "waiting" || answered) && f.pocket && <button type="button" onClick={() => watch(f.pocket!)} className="relative mt-3 text-[13px] font-bold text-ink underline decoration-line decoration-2 underline-offset-4 before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] hover:decoration-vermillion">Watch it in Live</button>}
                  </div>
                )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Result({ card, v }: { card: ArenaCard; v: Exclude<ReturnType<typeof arenaVerdict>, { state: "waiting" }> }) {
  const a = v.last;
  const calls = a.title.split(" · ");
  const lost = v.state === "lost";
  return (
    <div>
      <div className="flex items-start gap-2.5">
        {lost ? <ShieldAlert className="mt-0.5 size-5 shrink-0 text-vermillion-ink" {...I} aria-hidden /> : a.aiFooled ? <TriangleAlert className="mt-0.5 size-5 shrink-0 text-blue-ink" {...I} aria-hidden /> : <ShieldCheck className="mt-0.5 size-5 shrink-0 text-green-ink" {...I} aria-hidden />}
        <p className={cn("text-[15px] font-bold leading-6 [overflow-wrap:anywhere]", lost && "text-vermillion-ink")}>{lost ? "The transfer was NOT refused." : a.headline}</p>
      </div>
      <div className="mt-3"><GateStrip attempt={a} /></div>
      {a.stoppedAt && <p className="mt-3 text-[13px] leading-5 text-ink2">Stopped by <span className="font-bold text-ink">{GATES[a.stoppedAt].title}</span> <span className="text-muted">({GATES[a.stoppedAt].layer === "agent" ? "the agent" : GATES[a.stoppedAt].layer === "tools" ? "wallet tools" : "pocket contract"})</span></p>}
      {card.key === "escalation" && (a.txs?.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-1.5">{a.txs!.map((h, i) => <li key={h} className="flex flex-wrap items-baseline gap-x-2 text-[13px]"><span className="num font-bold text-ink">{calls[i] ?? "call"} reverted</span><TxHash hash={h} /></li>)}</ul>
      )}
      {card.key === "induced" && a.tx && <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-[13px]"><span className="font-bold text-ink">Transfer reverted</span><TxHash hash={a.tx} /></p>}
    </div>
  );
}
