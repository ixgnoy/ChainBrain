// Chat transcripts per pocket. POST /api/chat stays open for the whole agent turn (it can wait up to 10 minutes on
// owner approvals), so there is no client timeout, the UI renders from the event stream meanwhile, and a second send
// on the same pocket is refused while one is in flight.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { API } from "./shared";

export type ChatMsg = { id: string; role: "user" | "agent"; text: string; at: number; pending?: boolean; error?: boolean; sentAt?: number; doneAt?: number; stopped?: string };
type Ctx = { messages(pocket?: string): ChatMsg[]; busy(pocket?: string): boolean; send(pocket: string, text: string): Promise<void> };
const C = createContext<Ctx>({ messages: () => [], busy: () => false, send: async () => {} });
export const useChat = () => useContext(C);

export const STOPPED_TEXT: Record<string, string> = {
  llm_error: "The model was unavailable. Nothing was retried.",
  max_steps: "The agent hit its step limit and stopped.",
  refusal: "The model declined to continue.",
  max_tokens: "The reply was cut off at the token limit.",
};
const k = (p?: string) => (p ?? "").toLowerCase();
let n = 0;
const id = () => `m${Date.now().toString(36)}${(n++).toString(36)}`;

export function ChatProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Record<string, ChatMsg[]>>({});
  const [inflight, setInflight] = useState<Record<string, boolean>>({});
  const flying = useRef(new Set<string>());

  const patch = useCallback((pocket: string, fn: (m: ChatMsg[]) => ChatMsg[]) => setStore((s) => ({ ...s, [k(pocket)]: fn(s[k(pocket)] ?? []) })), []);

  const send = useCallback(async (pocket: string, raw: string) => {
    const text = raw.trim();
    if (!text || flying.current.has(k(pocket))) return;
    flying.current.add(k(pocket));
    setInflight((s) => ({ ...s, [k(pocket)]: true }));
    const now = Date.now();
    const agentId = id();
    patch(pocket, (m) => [...m, { id: id(), role: "user", text, at: now }, { id: agentId, role: "agent", text: "", at: now, sentAt: now, pending: true }]);
    const done = (p: Partial<ChatMsg>) => patch(pocket, (m) => m.map((x) => (x.id === agentId ? { ...x, pending: false, doneAt: Date.now(), ...p } : x)));
    try {
      // pocket is sent exactly as the address string used elsewhere: the server keys history by that exact string
      const r = await fetch(`${API}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pocket, text }) });
      const j = await r.json().catch(() => ({}));
      done({ text: j.reply ?? j.error ?? "(no reply)", stopped: j.stopped, error: !r.ok });
    } catch (e) {
      done({ text: `Could not reach the agent: ${(e as Error).message}`, error: true });
    } finally {
      flying.current.delete(k(pocket));
      setInflight((s) => ({ ...s, [k(pocket)]: false }));
    }
  }, [patch]);

  const value = useMemo<Ctx>(() => ({ messages: (p) => store[k(p)] ?? [], busy: (p) => !!inflight[k(p)], send }), [store, inflight, send]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
