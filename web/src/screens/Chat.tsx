import { useState } from "react";
import type { Address } from "viem";
import { API, REASONS } from "../shared";
import { approvalsFrom, type WalletEvent } from "../useEvents";
import { Warning, PaperPlaneTilt } from "@phosphor-icons/react";

type Line = { who: "you" | "agent"; text: string };
const reasonOf = (r: any): string | undefined => r?.reason ?? r?.allowedByPocket?.reason ?? r?.intentCheck?.reason ?? (r?.refused ? r.refused.join(", ") : undefined);

/** Conversation, the intent card (fixed-template text), and a collapsible trace of every tool call. */
export function Chat(props: { pocket: Address; events: WalletEvent[] }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const approvals = approvalsFrom(props.events);
  const intent = approvals.filter((a) => a.kind === "intent" && a.status === "pending").at(-1);
  const questions = approvals.filter((a) => a.kind === "question" && a.status === "pending");
  const trace = props.events.filter((e) => e.type === "trace" && (e.phase === "tool_call" || e.phase === "tool_result"));
  const disclosures = props.events.filter((e) => e.type === "disclosure");

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    setLines((x) => [...x, { who: "you", text: t }]);
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pocket: props.pocket, text: t }) });
      const j = await r.json();
      setLines((x) => [...x, { who: "agent", text: j.reply ?? j.error ?? "(no reply)" }]);
    } catch (e) {
      setLines((x) => [...x, { who: "agent", text: `Error: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }
  const decide = (id: string, approved: boolean) =>
    fetch(`${API}/api/approvals/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ approved }) });

  return (
    <section className="card chat">
      <h2>Agent</h2>
      {disclosures.map((d, i) => (
        <div key={i} className="banner"><Warning size={18} weight="fill" /><span>{d.sellerId} asked for {d.asked?.join(", ") || "personal data"}{d.signRequest ? " and an approval signature" : ""}. Refused: {d.refused.join(", ")}.</span></div>
      ))}
      <div className="lines">
        {lines.map((l, i) => <p key={i} className={l.who}><b>{l.who === "you" ? "You" : "Agent"}:</b> {l.text}</p>)}
        {questions.map((q) => <p key={q.id} className="agent ask"><b>Agent asks:</b> {q.text}</p>)}
        {busy && <p className="muted">Agent is working…</p>}
      </div>
      {intent && (
        <div className="intent">
          <div className="muted">Confirm this task (shown from a fixed template)</div>
          <pre>{intent.text}</pre>
          <div className="row">
            <button className="ghost" onClick={() => void decide(intent.id, false)}>Decline</button>
            <button onClick={() => void decide(intent.id, true)}>Confirm</button>
          </div>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="row">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell the agent what to buy…" />
        <button type="submit" disabled={busy} aria-label="Send"><PaperPlaneTilt size={16} weight="fill" />Send</button>
      </form>
      <details open>
        <summary>Trace ({trace.filter((e) => e.phase === "tool_call").length} tool calls)</summary>
        <ul className="trace">
          {trace.map((e, i) => {
            const why = e.phase === "tool_result" ? reasonOf(e.result) : undefined;
            return (
              <li key={i} className={e.phase}>
                {e.phase === "tool_call" ? <><code>{e.tool}</code> <span className="muted">{JSON.stringify(e.args)}</span></> :
                  <>{why ? <><code className="reason">{why}</code> <span className="muted">{REASONS[why.split(",")[0]] ?? ""}</span></> : e.result?.tx ? <>paid, tx {e.result.tx.slice(0, 12)}…</> : <span className="muted">ok</span>}</>}
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
