import { useEffect, useState } from "react";
import type { Address } from "viem";
import { readPocket, type PocketView } from "../wallet";
import { formatUsd, shortAddr } from "../shared";

export const status = (p: PocketView) => (p.revoked ? "Revoked" : Number(p.expiresAt) * 1000 < Date.now() ? "Expired" : "Active");

/** Main wallet balance and pockets as cards. */
export function Home(props: { owner?: Address; mainBalance?: bigint; pockets: Address[]; active?: Address; onOpen(p: Address): void; onNew(): void; refresh: number }) {
  const [views, setViews] = useState<Record<string, PocketView>>({});
  useEffect(() => {
    for (const p of props.pockets) readPocket(p).then((v) => setViews((x) => ({ ...x, [p]: v }))).catch(() => {});
  }, [props.pockets, props.refresh]);
  return (
    <section className="card">
      <div className="row">
        <div>
          <div className="muted">Main wallet {shortAddr(props.owner)}</div>
          <div className="big">{props.mainBalance === undefined ? "—" : `US$${formatUsd(props.mainBalance)}`}</div>
        </div>
        <button onClick={props.onNew}>New pocket</button>
      </div>
      <div className="pockets">
        {props.pockets.length === 0 && <p className="muted">No pockets yet. Give your AI a pocket, not your wallet.</p>}
        {props.pockets.map((p) => {
          const v = views[p];
          return (
            <button key={p} className={`pocket ${p === props.active ? "on" : ""}`} onClick={() => props.onOpen(p)}>
              <span>{shortAddr(p)}</span>
              <strong>{v ? `US$${formatUsd(v.balance)}` : "…"}</strong>
              <span className="muted">{v ? `${status(v)} · agent ${shortAddr(v.agent)}` : ""}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
