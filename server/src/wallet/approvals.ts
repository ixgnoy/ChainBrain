import { randomUUID } from "node:crypto";
import type { Hex } from "viem";
import { bus } from "./events";

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

const all = new Map<string, Approval>();
const waiters = new Map<string, (a: Approval) => void>();
const eventType = (k: Approval["kind"]) => (k === "question" ? "question" : k === "intent" ? "intent" : "approval");

export const approvals = {
  create(a: Omit<Approval, "id" | "status">): Approval {
    const x: Approval = { ...a, id: randomUUID(), status: "pending" };
    all.set(x.id, x);
    bus.publish({ type: eventType(a.kind), pocket: a.pocket, approval: x });
    return x;
  },
  get: (id: string) => all.get(id),
  pending: (pocket: string) => [...all.values()].filter((a) => a.status === "pending" && a.pocket.toLowerCase() === pocket.toLowerCase()),
  wait(id: string, ms = 600_000): Promise<Approval> {
    const a = all.get(id)!;
    if (a.status !== "pending") return Promise.resolve(a);
    return new Promise((res) => {
      const t = setTimeout(() => {
        a.status = "timeout";
        waiters.delete(id);
        res(a);
      }, ms);
      waiters.set(id, (x) => (clearTimeout(t), res(x)));
    });
  },
  resolve(id: string, r: { approved: boolean; signature?: Hex; answer?: string }): boolean {
    const a = all.get(id);
    if (!a || a.status !== "pending") return false;
    Object.assign(a, { status: r.approved ? "approved" : "declined", signature: r.signature, answer: r.answer });
    bus.publish({ type: eventType(a.kind), pocket: a.pocket, approval: a });
    waiters.get(id)?.(a);
    waiters.delete(id);
    return true;
  },
};
