import { randomUUID } from "node:crypto";
import type { Hex } from "viem";
import { bus } from "./events";
import { table } from "../store";

export type Approval = {
  id: string;
  pocket: string;
  kind: "intent" | "payment" | "question";
  text: string;
  data?: unknown;
  status: "pending" | "approved" | "declined" | "timeout";
  signature?: Hex;
  answer?: string;
};

// kept across restarts (DATA_DIR); one still pending after a restart has lost the agent turn that waited for it: timed out
const saved = table<Approval>("approvals");
let all_: Map<string, Approval> | undefined;
const all = { get map() {
  if (!all_) {
    all_ = new Map(saved.all().map((a) => [a.id, a.status === "pending" ? { ...a, status: "timeout" as const } : a]));
    for (const a of all_.values()) saved.set(a.id, a);
  }
  return all_;
} };
const keep = (a: Approval) => saved.set(a.id, a);
const waiters = new Map<string, (a: Approval) => void>();
const eventType = (k: Approval["kind"]) => (k === "question" ? "question" : k === "intent" ? "intent" : "approval");

export const approvals = {
  create(a: Omit<Approval, "id" | "status">): Approval {
    const x: Approval = { ...a, id: randomUUID(), status: "pending" };
    all.map.set(x.id, x);
    keep(x);
    bus.publish({ type: eventType(a.kind), pocket: a.pocket, approval: x });
    return x;
  },
  get: (id: string) => all.map.get(id),
  pending: (pocket: string) => [...all.map.values()].filter((a) => a.status === "pending" && a.pocket.toLowerCase() === pocket.toLowerCase()),
  wait(id: string, ms = 600_000): Promise<Approval> {
    const a = all.map.get(id)!;
    if (a.status !== "pending") return Promise.resolve(a);
    return new Promise((res) => {
      const t = setTimeout(() => {
        a.status = "timeout";
        keep(a);
        waiters.delete(id);
        res(a);
      }, ms);
      waiters.set(id, (x) => (clearTimeout(t), res(x)));
    });
  },
  resolve(id: string, r: { approved: boolean; signature?: Hex; answer?: string }): boolean {
    const a = all.map.get(id);
    if (!a || a.status !== "pending") return false;
    Object.assign(a, { status: r.approved ? "approved" : "declined", signature: r.signature, answer: r.answer });
    keep(a);
    bus.publish({ type: eventType(a.kind), pocket: a.pocket, approval: a });
    waiters.get(id)?.(a);
    waiters.delete(id);
    return true;
  },
};
