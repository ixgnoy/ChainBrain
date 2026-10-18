// Edit a pocket's routine, signed by the owner: when it runs (four cadences, four times) and its allowance (a stepper and
// the period). A preview says the next run and where the agent will stop and ask. Saving changes only those fields of
// the same routine (editRoutine keeps its id and runs; this period's spend still counts unless the period itself changes,
// which the card's contract counts from zero); the sellers and items stay as they were signed. Face ID (or the device passcode) signs it; on the built-in network only.
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { c, radius } from "../tokens";
import { Sheet } from "../ui/Sheet";
import { Button, Chip, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { AgentAvatar } from "../ui/AgentAvatar";
import { haptic } from "../haptics";
import { confirmOwner } from "../lib/biometric";
import * as api from "../lib/api";
import { parseHkd } from "../lib/shared";
import { useApp } from "../store";
import { cadenceText, nextRun, PERIOD_KIND, type Cadence, type Period, type Routine } from "../../../shared/sim/pocketApp";
import { useCoverDock } from "./AskDock";
import { agentName } from "./app/theme";
import { curSign } from "../lib/runtime";

const EVERY: { key: string; label: string; c: Pick<Cadence, "every" | "weekday" | "dayOfMonth"> }[] = [
  { key: "day", label: "Every day", c: { every: "day", weekday: null, dayOfMonth: null } },
  { key: "weekday", label: "Weekdays", c: { every: "weekday", weekday: null, dayOfMonth: null } },
  { key: "week", label: "Mondays", c: { every: "week", weekday: 1, dayOfMonth: null } },
  { key: "month", label: "The 1st", c: { every: "month", weekday: null, dayOfMonth: 1 } },
];
const HOURS = [7, 8, 9, 18];
const PERIODS: Period[] = ["day", "week", "month"];
const hm = (ms: number) => new Date(ms).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** Allowance steps: 8 cents at a time under HK$0.80, 40 cents to HK$8, then HK$2. */
const step = (x: number, dir: 1 | -1) => {
  const s = x < 0.8 || (dir === -1 && x <= 0.8) ? 0.08 : x < 8 || (dir === -1 && x <= 8) ? 0.4 : 2;
  return Math.max(0.08, Math.min(400, Math.round((x + dir * s) * 100) / 100));
};

export function EditRoutineSheet({ routine, agentId, visible, onClose, onSaved }: { routine: Routine; agentId?: string; visible: boolean; onClose(): void; onSaved?(): void }) {
  useCoverDock(visible); // the dock would sit on the sign button
  return (
    <Sheet visible={visible} onClose={onClose}>
      {visible ? <Body key={routine.id} routine={routine} agentId={agentId} onClose={onClose} onSaved={onSaved} /> : null}
    </Sheet>
  );
}

function Body({ routine, agentId, onClose, onSaved }: { routine: Routine; agentId?: string; onClose(): void; onSaved?(): void }) {
  const who = agentName(agentId);
  const [every, setEvery] = useState(EVERY.find((e) => e.c.every === routine.cadence.every)?.key ?? "day");
  const [hour, setHour] = useState(routine.cadence.hour);
  const [amount, setAmount] = useState(Number(routine.allowance.amount));
  const [touched, setTouched] = useState(false); // an untouched allowance keeps its exact string (up to 6 decimals)
  const bump = (dir: 1 | -1) => { setTouched(true); setAmount((x) => step(x, dir)); };
  const [period, setPeriod] = useState<Period>(routine.allowance.period);
  const { wallet, recordTx } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cadence: Cadence = useMemo(() => ({ ...EVERY.find((e) => e.key === every)!.c, hour, minute: 0 }), [every, hour]);
  const next = nextRun(cadence, Date.now());
  const was = Number(routine.allowance.amount);
  const amountStr = touched ? amount.toFixed(2) : routine.allowance.amount;
  const newPeriod = period !== routine.allowance.period;
  // any new period is looser: the contract counts the new period from zero, so it frees the allowance at once
  const looser = amount > was || newPeriod;
  const changed = amountStr !== routine.allowance.amount || newPeriod || cadenceText(cadence) !== cadenceText(routine.cadence);
  const save = async () => {
    setErr(null); setBusy(true);
    // a looser allowance is signed with Face ID (or the passcode); a stricter one or a new time can only lower the risk
    if (looser && (await confirmOwner(`Let ${who} spend up to ${curSign()}${amountStr} a ${period} on its own`)) === "cancel") { setBusy(false); return; }
    try {
      // a new allowance is an owner transaction: the pocket itself enforces it (past it, a payment needs your co-sign)
      if (wallet && (amountStr !== routine.allowance.amount || newPeriod)) {
        const limit = parseHkd(amountStr);
        const t = await wallet.setPeriodLimit(routine.pocket as `0x${string}`, PERIOD_KIND[period], limit);
        recordTx({ kind: "allowance", pocket: routine.pocket, hash: t.hash, amount: limit.toString(), note: `per ${period}` });
      }
      api.editRoutine(routine.pocket, { cadence, allowance: { amount: amountStr, period } });
      haptic.success(); onSaved?.(); onClose();
    } catch { haptic.error(); setErr("That change didn't save."); }
    finally { setBusy(false); }
  };
  return (
    <View style={{ padding: 20, gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AgentAvatar kind={agentId ?? "chainbrain"} size={40} />
        <View style={{ flex: 1 }}>
          <T v="section" accessibilityRole="header">Edit the routine</T>
          <T v="cap" color="muted">{`What ${who} buys and from whom stays as you signed it`}</T>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <T v="head">When it runs</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{EVERY.map((e) => <Chip key={e.key} label={e.label} on={every === e.key} onPress={() => setEvery(e.key)} />)}</View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{HOURS.map((h) => <Chip key={h} label={`${String(h).padStart(2, "0")}:00`} on={hour === h} onPress={() => setHour(h)} />)}</View>
      </View>

      <View style={{ gap: 10 }}>
        <T v="head">On its own, up to</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Stepper icon="arrowDown" label="Less" onPress={() => bump(-1)} disabled={amount <= 0.01} />
          <View style={{ flex: 1, alignItems: "center" }} accessible accessibilityLabel={`${curSign()}${amountStr} a ${period}`} accessibilityRole="adjustable"
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={(e) => bump(e.nativeEvent.actionName === "increment" ? 1 : -1)}>
            <T v="balance" style={{ fontVariant: ["tabular-nums"] }}>{`${curSign()}${amountStr}`}</T>
            {amount !== was ? <T v="cap" color={amount > was ? "vermillionInk" : "muted"}>{`was ${curSign()}${was.toFixed(2)}`}</T> : <T v="cap" color="muted">{" "}</T>}
          </View>
          <Stepper icon="arrowUp" label="More" onPress={() => bump(1)} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>{PERIODS.map((p) => <Chip key={p} label={`a ${p}`} on={period === p} onPress={() => setPeriod(p)} />)}</View>
      </View>

      {/* the preview: the next run and the line it stops at */}
      <View style={{ borderRadius: radius.tile, backgroundColor: c.tile, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Icon name="clock" size={16} color={c.ink2} stroke={2} />
          <T v="sub" style={{ flex: 1 }}>{`Next run ${hm(next)}`}</T>
        </View>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Icon name="bell" size={16} color={c.vermillionInk} stroke={2} />
          <T v="sub" style={{ flex: 1 }}>{`Past ${curSign()}${amountStr} a ${period}, ${who} stops and asks you`}</T>
        </View>
        <T v="cap" color={newPeriod ? "vermillionInk" : "muted"}>{newPeriod ? `A new period starts the count from zero: ${who} can spend the full ${curSign()}${amountStr} again right away.` : "This period's spend so far still counts: a new amount or time doesn't reset it."}</T>
      </View>

      {err ? <T v="sub" color="vermillionInk">{err}</T> : null}
      <Button label={looser ? "Sign with Face ID" : "Save"} icon={looser ? "faceId" : "check"} kind={looser ? "vermillion" : "primary"} disabled={!changed} loading={busy} onPress={() => void save()} />
    </View>
  );
}

function Stepper({ icon, label, onPress, disabled }: { icon: "arrowDown" | "arrowUp"; label: string; onPress(): void; disabled?: boolean }) {
  return (
    <Press kind="round" haptics="select" onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.fill, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1 }}>
      <Icon name={icon === "arrowUp" ? "plus" : "minus"} size={20} color={c.ink} stroke={2.2} />
    </Press>
  );
}
