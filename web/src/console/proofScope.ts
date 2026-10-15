// Which pockets the scorecard and the evidence table read, and "since when". Pure.
import { PRESENTER } from "@sim/autopilot";
import type { PocketState, ChainTx } from "./chain";

const lc = (a?: string) => (a ?? "").toLowerCase();

/** The linked phone's pockets when there is one, else the presenter's pockets of the built-in story; a server shows everything (undefined). */
export function proofPockets(o: { linked: boolean; builtin: boolean; phonePockets: string[]; pockets: PocketState[] }): string[] | undefined {
  if (o.linked) return o.phonePockets;
  if (o.builtin) return o.pockets.filter((p) => lc(p.owner) === lc(PRESENTER)).map((p) => p.address);
  return undefined;
}

/** Just past the newest thing in scope, on the sources' own clocks (a phone's clock may differ from this laptop's). */
export function horizon(events: { pocket?: string; at: number }[], txs: Pick<ChainTx, "pocket" | "at">[], scope?: string[]): number {
  const keep = scope ? new Set(scope.map(lc)) : undefined;
  let t = 0;
  for (const e of events) if ((!keep || keep.has(lc(e.pocket))) && e.at > t) t = e.at;
  for (const x of txs) if ((!keep || keep.has(lc(x.pocket))) && (x.at ?? 0) > t) t = x.at ?? 0;
  return t ? t + 1 : 0;
}
