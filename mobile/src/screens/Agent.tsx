import { useState } from "react";
import { Modal, TextInput, View } from "react-native";
import type { Address } from "viem";
import { API, REASONS } from "../lib/shared";
import { approvalsFrom, type WalletEvent } from "../lib/events";
import type { OwnerWallet } from "../lib/wallet";
import { Btn, Card, T, s, usePalette, useReduceMotion } from "../ui";
import { Warning } from "phosphor-react-native/src/icons/Warning";
import { PaperPlaneTilt } from "phosphor-react-native/src/icons/PaperPlaneTilt";
import { SealCheck } from "phosphor-react-native/src/icons/SealCheck";

const post = (path: string, body: object) => fetch(`${API}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const reasonOf = (r: any): string | undefined => r?.reason ?? r?.allowedByPocket?.reason ?? r?.intentCheck?.reason ?? (r?.refused ? r.refused.join(", ") : undefined);

/** Chat with the agent, confirm the intent card, approve payments above ask-me (signed on this phone), and see the trace. */
export function Agent(props: { pocket: Address; wallet: OwnerWallet; events: WalletEvent[]; onChanged(): void }) {
  const reduceMotion = useReduceMotion();
  const p = usePalette();
  const [lines, setLines] = useState<{ who: string; text: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [signing, setSigning] = useState(false);
  const [err, setErr] = useState("");
  const approvals = approvalsFrom(props.events);
  const intent = approvals.filter((a) => a.kind === "intent" && a.status === "pending").at(-1);
  const pay = approvals.find((a) => a.kind === "payment" && a.status === "pending");
  const questions = approvals.filter((a) => a.kind === "question" && a.status === "pending");
  const trace = props.events.filter((e) => e.type === "trace" && (e.phase === "tool_call" || e.phase === "tool_result"));
  const disclosures = props.events.filter((e) => e.type === "disclosure");

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    setLines((x) => [...x, { who: "You", text: t }]);
    setBusy(true);
    try {
      const j = await (await post("/api/chat", { pocket: props.pocket, text: t })).json();
      setLines((x) => [...x, { who: "Agent", text: j.reply ?? j.error ?? "(no reply)" }]);
    } catch (e) {
      setLines((x) => [...x, { who: "Agent", text: `Error: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
      props.onChanged();
    }
  }
  async function approve() {
    setSigning(true);
    setErr("");
    try {
      const signature = await props.wallet.signTransfer(pay.data.auth);
      const r = await post(`/api/approvals/${pay.id}`, { approved: true, signature });
      if (!r.ok) throw new Error((await r.json()).error);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSigning(false);
    }
  }

  return (
    <View>
      {disclosures.map((d, i) => (
        <View key={i} style={{ backgroundColor: p.warnBg, padding: 12, borderRadius: 10, marginBottom: 12, flexDirection: "row", gap: 8 }}>
          <Warning size={18} weight="fill" color={p.warn} />
          <T color={p.warn} style={{ flex: 1 }}>{d.sellerId} asked for {d.asked?.join(", ") || "your data"}{d.signRequest ? " and an approval signature" : ""}. Refused.</T>
        </View>
      ))}
      <Card>
        {lines.map((l, i) => (
          <View key={i} style={{ alignSelf: l.who === "Agent" ? "flex-start" : "flex-end", maxWidth: "88%", paddingVertical: 9, paddingHorizontal: 13, borderRadius: 16, backgroundColor: l.who === "Agent" ? p.sunken : p.accent }}>
            <T color={l.who === "Agent" ? p.text : p.accentText}>{l.text}</T>
          </View>
        ))}
        {questions.map((q) => <T key={q.id}><T bold color={p.accent}>Agent asks: </T>{q.text}</T>)}
        {busy && <T muted>Agent is working…</T>}
        {intent && (
          <View style={[s.input, { borderColor: p.accent, backgroundColor: p.accentSoft, borderRadius: 12, gap: 6 }]}>
            <T muted>Confirm this task (fixed template)</T>
            <T mono>{intent.text}</T>
            <View style={s.row}>
              <Btn kind="ghost" label="Decline" onPress={() => void post(`/api/approvals/${intent.id}`, { approved: false })} />
              <Btn label="Confirm" onPress={() => void post(`/api/approvals/${intent.id}`, { approved: true })} />
            </View>
          </View>
        )}
        <TextInput value={text} onChangeText={setText} onSubmitEditing={() => void send()} placeholder="Tell the agent what to buy…"
          placeholderTextColor={p.muted} returnKeyType="send" style={[s.input, { color: p.text, borderColor: p.line, backgroundColor: p.sunken, borderRadius: 999, paddingHorizontal: 16 }]} />
        <Btn icon={(c) => <PaperPlaneTilt size={18} weight="fill" color={c} />} label="Send" disabled={busy || !text.trim()} onPress={() => void send()} />
      </Card>
      <Card>
        <T bold>Trace ({trace.filter((e) => e.phase === "tool_call").length} tool calls)</T>
        {trace.map((e, i) => {
          const why = e.phase === "tool_result" ? reasonOf(e.result) : undefined;
          return e.phase === "tool_call"
            ? <T key={i} mono>{e.tool}</T>
            : <T key={i} muted>   {why ? <T color={p.danger}>{why} </T> : null}{why ? REASONS[why.split(",")[0]] ?? "" : e.result?.tx ? `paid, tx ${e.result.tx.slice(0, 12)}…` : "ok"}</T>;
        })}
      </Card>
      <Modal visible={!!pay} transparent animationType={reduceMotion ? "none" : "slide"} onRequestClose={() => {}}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,12,14,.5)", padding: 12 }}>
          {pay && (
            <Card>
              <T bold>Approve payment</T>
              <T big>US${pay.data.amount}</T>
              <T>to {pay.data.sellerId} for “{pay.data.description}”</T>
              <T><T bold color={p.accent}>Agent: </T>{pay.text}</T>
              <T muted>Task</T>
              <T mono>{pay.data.intent}</T>
              <T muted>You sign a USDC transfer authorization from this pocket to {pay.data.sellerId}, valid for this one payment for 10 minutes.</T>
              {!!err && <T color={p.danger}>{err}</T>}
              <View style={s.row}>
                <Btn kind="ghost" label="Decline" disabled={signing} onPress={() => void post(`/api/approvals/${pay.id}`, { approved: false })} />
                <Btn icon={(c) => <SealCheck size={18} weight="bold" color={c} />} label={signing ? "Signing…" : "Approve and sign"} disabled={signing} onPress={() => void approve()} />
              </View>
            </Card>
          )}
        </View>
      </Modal>
    </View>
  );
}
