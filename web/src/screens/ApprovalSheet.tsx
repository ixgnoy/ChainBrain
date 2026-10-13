import { useState } from "react";
import { API } from "../shared";
import { signTransfer } from "../wallet";

/** Payment above the ask-me threshold: the owner signs the exact USDC transfer the wallet built. */
export function ApprovalSheet(props: { approval: any; onDone(): void }) {
  const a = props.approval;
  const d = a.data;
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const post = (body: object) => fetch(`${API}/api/approvals/${a.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  async function approve() {
    setBusy(true);
    setErr("");
    try {
      const signature = await signTransfer(d.auth);
      const r = await post({ approved: true, signature });
      if (!r.ok) throw new Error((await r.json()).error);
      props.onDone();
    } catch (e) {
      setErr((e as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Approve payment">
      <div className="card">
        <h2>Approve payment</h2>
        <div className="big">US${d.amount}</div>
        <p>to <b>{d.sellerId}</b> for “{d.description}”</p>
        <p className="agent"><b>Agent:</b> {a.text}</p>
        <div className="muted">Task</div>
        <pre>{d.intent}</pre>
        <p className="muted">Your wallet will ask you to sign a USDC “TransferWithAuthorization” from this pocket to {d.sellerId}. It can only be used for this one payment, within 10 minutes.</p>
        {err && <p className="error">{err}</p>}
        <div className="row">
          <button className="ghost" disabled={busy} onClick={() => void post({ approved: false }).then(props.onDone)}>Decline</button>
          <button disabled={busy} onClick={() => void approve()}>{busy ? "Signing…" : "Approve and sign"}</button>
        </div>
      </div>
    </div>
  );
}
