import { useEffect, useState } from "react";
import type { Address } from "viem";
import { readPocket, revoke, returnFunds, setCap, setAskAbove, setSeller, type PocketView } from "../wallet";
import { formatUsd, parseUsd, NEVER, txUrl, shortAddr, REASONS, type Config } from "../shared";
import type { WalletEvent } from "../useEvents";
import { status } from "./Home";
import { HandPalm, ArrowUDownLeft } from "@phosphor-icons/react";

/** Balance, rules, allowed sellers, activity trail; owner-only edits, Revoke, Return funds. */
export function PocketDetail(props: { cfg: Config; pocket: Address; events: WalletEvent[]; refresh: number; onChanged(): void }) {
  const [v, setV] = useState<PocketView>();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { readPocket(props.pocket).then(setV).catch((e) => setMsg(String(e))); }, [props.pocket, props.refresh]);

  async function act(label: string, f: () => Promise<{ hash: string }>) {
    setBusy(label);
    setMsg("");
    try {
      const { hash } = await f();
      setMsg(`${label}: ${hash}`);
      props.onChanged();
    } catch (e) {
      setMsg((e as Error).message.split("\n")[0]);
    } finally {
      setBusy("");
    }
  }
  const askEdit = (label: string, current: bigint, apply: (n: bigint) => Promise<{ hash: string }>) => {
    const s = prompt(`${label} (US$${label.startsWith("Ask") ? ', or "never"' : ""})`, formatUsd(current));
    if (s === null) return;
    void act(label, () => apply(s.trim() === "never" ? NEVER : parseUsd(s)));
  };

  const trail = props.events.filter((e) => ["intent", "payment", "refusal", "disclosure"].includes(e.type) && (e.type !== "intent" || e.approval?.status === "approved"));
  if (!v) return <section className="card">{msg || "Loading pocket…"}</section>;
  return (
    <section className="card">
      <div className="row">
        <h2>Pocket {shortAddr(v.address)}</h2>
        <span className={`badge ${status(v).toLowerCase()}`}>{status(v)}</span>
      </div>
      <div className="big">US${formatUsd(v.balance)}</div>
      <dl>
        <dt>Agent</dt><dd>{shortAddr(v.agent)}</dd>
        <dt>Per-payment cap</dt><dd>US${formatUsd(v.cap)} <button className="link" onClick={() => askEdit("Cap", v.cap, (n) => setCap(v.address, n))}>edit</button></dd>
        <dt>Ask me above</dt><dd>{v.askAbove === NEVER ? "never" : `US$${formatUsd(v.askAbove)}`} <button className="link" onClick={() => askEdit("Ask me above", v.askAbove, (n) => setAskAbove(v.address, n))}>edit</button></dd>
        <dt>Expires</dt><dd>{new Date(Number(v.expiresAt) * 1000).toLocaleString()}</dd>
      </dl>
      <h3>Allowed sellers</h3>
      {props.cfg.sellers.map((s) => {
        const on = v.allowed.includes(s.id);
        return (
          <label key={s.id} className="check">
            <input type="checkbox" checked={on} disabled={!!busy} onChange={() => void act(on ? `Remove ${s.name}` : `Allow ${s.name}`, () => setSeller(v.address, s.payTo, !on))} />
            {s.name} <span className="muted">{s.category}</span>
          </label>
        );
      })}
      <div className="row">
        <button className="danger big-button" disabled={!!busy || v.revoked} onClick={() => void act("Revoked", () => revoke(v.address))}><HandPalm size={16} weight="bold" />Revoke</button>
        <button className="ghost" disabled={!!busy || v.balance === 0n} onClick={() => void act("Returned funds", () => returnFunds(v.address))}><ArrowUDownLeft size={16} weight="bold" />Return funds</button>
      </div>
      {busy && <p className="muted">{busy} (sign in your wallet)…</p>}
      {msg && <p className="muted">{msg.startsWith("0x") || msg.includes(": 0x") ? <a href={txUrl(msg.split(": ")[1])} target="_blank">{msg}</a> : msg}</p>}
      <h3>Activity</h3>
      <ol className="trail">
        {trail.length === 0 && <li className="muted">Nothing yet.</li>}
        {trail.map((e, i) => (
          <li key={i}>
            {e.type === "intent" && <>Task confirmed: <pre>{e.approval.text}</pre></>}
            {e.type === "payment" && <>Paid US${formatUsd(BigInt(e.amount))} to {e.sellerId} ({e.sku}) {e.cosigned && <span className="badge">co-signed</span>} <a href={txUrl(e.tx)} target="_blank">tx</a></>}
            {e.type === "refusal" && <>Refused {e.sellerId}: <code>{e.reason}</code> <span className="muted">{REASONS[e.reason] ?? ""}</span></>}
            {e.type === "disclosure" && <>{e.sellerId} asked for {e.asked?.join(", ") || "data"}{e.signRequest ? " and a signature" : ""}: refused</>}
          </li>
        ))}
      </ol>
    </section>
  );
}
