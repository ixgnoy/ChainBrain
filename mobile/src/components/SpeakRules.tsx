// "Speak your rules" on the first step of New pocket: the owner says what the pocket is for in one sentence, the AI proposes
// the rules (two independent readings on a server; the fixed parser on the built-in network), and the proof card shows what
// can and cannot happen, computed by code from the pocket's own rule order. Open questions are one tap each; answering
// recomputes the card on the phone. "Use these rules" only fills the form: the owner still reviews and signs.
import React, { useState } from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Button, Field } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Rise } from "../ui/Rise";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import * as api from "../lib/api";
import { answer, proof, type Compiled, type Draft } from "../../../shared/sim/speak";

const HOSTILE = ["shadyfeed", "tradewire"];

/** The sample sentence, naming sellers this network really has: Exa, CoinGecko and Nansen on the built-in network, the
 *  first research sellers the server lists elsewhere (DataLite, DataPro on the dev stack). */
export function exampleFor(sellers: { id: string; name: string; category?: string }[]): string {
  // never suggest the demo's hostile shops (scenes 5-6 and the drainer story) as a place to send money
  const research = sellers.filter((s) => s.category === "Research data" && !HOSTILE.includes(s.id)).map((s) => s.name);
  const names = research.length ? research.slice(0, 3) : sellers.slice(0, 2).map((s) => s.name);
  const from = names.length ? ` from ${names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names[0]}` : "";
  return `US$1 for durian research${from}, at most US$0.05 each, ask me above US$0.02, until tonight`;
}

export function SpeakRules({ onUse }: { onUse(d: Draft): void }) {
  const { cfg } = useApp();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<(Compiled & { asked: Set<string> }) | null>(null);
  const sellers = (cfg?.sellers ?? []).map((s) => ({ id: s.id, name: s.name }));
  const EXAMPLE = exampleFor(cfg?.sellers ?? []);

  const build = async () => {
    const s = text.trim() || EXAMPLE;
    if (!text.trim()) setText(EXAMPLE);
    setBusy(true); setErr(null);
    try {
      const r = await api.compileRules(s);
      setRes({ ...r, asked: new Set() });
      haptic.success();
    } catch {
      setErr("Couldn't read that. Try again, or pick a starting point below.");
      haptic.error();
    } finally { setBusy(false); }
  };
  const pick = (field: keyof Draft, value: string) => {
    if (!res) return;
    haptic.select();
    setRes({ ...res, draft: answer(res.draft, field, value), asked: new Set([...res.asked, String(field)]) });
  };

  const p = res ? proof(res.draft, sellers) : null;
  const open = res ? res.questions.filter((q) => !res.asked.has(String(q.field))) : [];
  return (
    <View style={{ gap: 12, padding: 16, borderRadius: 20, backgroundColor: c.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="sparkles" size={18} color={c.accent} />
        <T v="row" w="semi">Say it in one sentence</T>
      </View>
      <Field value={text} onChangeText={(t) => setText(t.slice(0, 300))} placeholder={EXAMPLE} multiline accessibilityLabel="Describe the pocket in one sentence" style={{ minHeight: 84, paddingVertical: 12, textAlignVertical: "top" }} />
      <Button label={res ? "Read it again" : "Build my pocket"} kind={res || !text.trim() ? "secondary" : "primary"} small loading={busy} onPress={build} />
      {err ? <T v="sub" color="negative">{err}</T> : null}
      {res && p ? (
        <Rise dy={8} style={{ gap: 12 }}>
          <View style={{ gap: 2, padding: 14, borderRadius: 16, backgroundColor: c.canvas }} accessible accessibilityLabel={`Worst case: US$${p.worstCase}`}>
            <T v="cap" color="muted">Worst case, even if your agent is fooled</T>
            <T v="section">US${p.worstCase}</T>
            <T v="cap" color="muted">The pocket holds this and nothing else.</T>
          </View>
          <View style={{ gap: 6 }}>{p.lines.map((l, i) => <View key={i} style={{ flexDirection: "row", gap: 8 }}><Icon name="check" size={16} color={c.accent} /><T v="sub" style={{ flex: 1 }}>{cleanText(l, 120)}</T></View>)}</View>
          {p.neverPayable.length ? <T v="sub" color="ink2">Can never pay: {p.neverPayable.map((n) => cleanText(n, 24)).join(", ")} or any other address.</T> : null}
          <View style={{ gap: 4 }}>
            <T v="cap" w="semi" color="muted">Checked against the pocket's own rules</T>
            {p.tests.map((t, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name={t.ok ? "check" : "alert"} size={14} color={t.ok ? c.accent : c.negative} />
                <T v="cap" color="ink2" style={{ flex: 1 }}>{cleanText(t.label, 60)}</T>
                <T v="cap" w="semi" color={t.got === "OK" ? "accent" : "ink2"}>{t.got === "OK" ? "pays" : t.got}</T>
              </View>
            ))}
          </View>
          {open.map((q) => (
            <View key={String(q.field)} style={{ gap: 6, padding: 12, borderRadius: 14, backgroundColor: c.warningSoft }}>
              <T v="sub" w="semi">{cleanText(q.question, 120)}</T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {q.options.map((o) => <Button key={o.value} label={cleanText(o.label, 30)} kind="secondary" small onPress={() => pick(q.field, o.value)} />)}
              </View>
              <T v="cap" color="muted">Until you answer, the stricter choice is used.</T>
            </View>
          ))}
          {res.disagreements.length ? <T v="cap" color="muted">Two AI readings disagreed on {res.disagreements.length} {res.disagreements.length === 1 ? "thing" : "things"}; the stricter value is used. {res.disagreements.map((d) => cleanText(d, 80)).join(". ")}.</T> : null}
          <T v="cap" color="faint">Read by {res.by === "claude" ? "two independent Claude readings" : "a fixed reader (no AI)"}. The card above is computed, not written by the AI.</T>
          <Button label="Use these rules" onPress={() => { haptic.medium(); onUse(res.draft); }} disabled={!res.draft.sellers.length} />
          {!res.draft.sellers.length ? <T v="cap" color="muted">Pick at least one seller above.</T> : null}
        </Rise>
      ) : null}
    </View>
  );
}
