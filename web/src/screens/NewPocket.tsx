import { useState } from "react";
import type { Address } from "viem";
import { PRESETS, toPocketArgs, type PresetValues, type Lifetime } from "../presets";
import { createPocket, fund } from "../wallet";
import { txUrl, type Config } from "../shared";

/** Preset picker → settings → Create (owner tx 1) → Fund (owner tx 2). */
export function NewPocket(props: { cfg: Config; onCreated(p: Address): void; onCancel(): void }) {
  const [v, setV] = useState<PresetValues>(PRESETS.research);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [txs, setTxs] = useState<{ label: string; hash: string }[]>([]);
  const set = (k: keyof PresetValues, val: any) => setV({ ...v, [k]: val });
  const payTo = Object.fromEntries(props.cfg.sellers.map((s) => [s.id, s.payTo]));
  const categories = [...new Set(props.cfg.sellers.map((s) => s.category))];

  async function go() {
    setErr("");
    try {
      const a = toPocketArgs(v, props.cfg.agent, payTo);
      setBusy("Creating pocket (sign in your wallet)…");
      const { pocket, tx } = await createPocket(a);
      setTxs([{ label: "Created", hash: tx }]);
      setBusy("Funding pocket (sign in your wallet)…");
      const f = await fund(pocket, a.budget);
      setTxs((x) => [...x, { label: "Funded", hash: f.hash }]);
      setBusy("");
      props.onCreated(pocket);
    } catch (e) {
      setBusy("");
      setErr((e as Error).message.split("\n")[0]);
    }
  }

  return (
    <section className="card">
      <h2>New pocket</h2>
      <div className="chips">
        {Object.values(PRESETS).map((p) => (
          <button key={p.label} className={v.label === p.label ? "chip on" : "chip"} onClick={() => setV(p)}>{p.label}</button>
        ))}
      </div>
      <label>Budget (US$) <input value={v.budget} onChange={(e) => set("budget", e.target.value)} inputMode="decimal" /></label>
      <fieldset>
        <legend>Sellers <span className="muted">(categories help you pick; the pocket enforces only these sellers)</span></legend>
        {categories.map((c) => (
          <div key={c}>
            <div className="muted">{c}</div>
            {props.cfg.sellers.filter((s) => s.category === c).map((s) => (
              <label key={s.id} className="check">
                <input type="checkbox" checked={v.sellers.includes(s.id)}
                  onChange={(e) => set("sellers", e.target.checked ? [...v.sellers, s.id] : v.sellers.filter((x) => x !== s.id))} />
                {s.name} <span className="muted">{s.items.map((i) => (i.price ? `US$${i.price}` : "free")).join(", ")}</span>
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      <label>Per-payment cap (US$) <input value={v.cap} onChange={(e) => set("cap", e.target.value)} inputMode="decimal" /></label>
      <label>Ask me above (US$, 0 = every time, "never") <input value={v.askAbove} onChange={(e) => set("askAbove", e.target.value)} /></label>
      <label>Lifetime
        <select value={v.lifetime} onChange={(e) => set("lifetime", e.target.value as Lifetime)}>
          <option value="one-task">One task (24 h)</option>
          <option value="until-tonight">Until 23:59 tonight</option>
          <option value="ongoing">Ongoing (1 year)</option>
        </select>
      </label>
      {err && <p className="error">{err}</p>}
      {busy && <p className="muted">{busy}</p>}
      {txs.map((t) => <p key={t.hash}>{t.label}: <a href={txUrl(t.hash)} target="_blank">{t.hash.slice(0, 18)}…</a></p>)}
      <div className="row">
        <button onClick={props.onCancel} className="ghost">Cancel</button>
        <button onClick={go} disabled={!!busy}>Create and fund</button>
      </div>
    </section>
  );
}
