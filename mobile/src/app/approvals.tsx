// Approvals inbox (Stitch chainbrain_approvals_inbox): every request that waits for the owner, from any agent, oldest first with
// its 10-minute countdown; what was decided lately; and two honest counts. Co-sign opens the approval sheet (the slide, the
// checked facts, the agent's unchecked note). Everything comes from the approvals the network published.
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../store";
import { c, radius } from "../tokens";
import { Screen } from "../ui/Screen";
import { BackHeader } from "../ui/BackHeader";
import { Button, Card, StatusPill } from "../ui/kit";
import { T, Eyebrow } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { Hatch } from "../ui/Hatch";
import { Reveal } from "../ui/Reveal";
import { AgentAvatar } from "../ui/AgentAvatar";
import { useAutoplayTarget } from "../lib/autoplayTargets";
import { approvalsFrom, type Approval } from "../lib/events";
import { ago } from "../lib/agents";
import { cleanText } from "../lib/sanitize";
import { parseUsd, NEVER } from "../lib/shared";
import { money, usd } from "../lib/util";
import { agentInfo } from "../../../shared/sim/agents";
import { parseIntent } from "../components/IntentCard";
import { describeApprovalError } from "../components/ApprovalSheet";
import { haptic } from "../haptics";
import { curSign } from "../lib/runtime";

const amountOf = (a: Approval) => { try { return parseUsd(String(a.data?.amount ?? "0")); } catch { return 0n; } };
const leftOf = (a: Approval, now: number) => {
  const until = a.data?.auth?.validBefore ? Number(a.data.auth.validBefore) * 1000 : a.expiresAt;
  return until ? Math.max(0, Math.floor((until - now) / 1000)) : undefined;
};
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Approvals() {
  const { pending, events, openApproval } = useApp();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const waiting = pending.filter((a) => a.kind !== "question").sort((x, y) => (x.createdAt ?? 0) - (y.createdAt ?? 0));
  const all = useMemo(() => approvalsFrom(events).filter((a) => a.kind === "payment"), [events]);
  const at = useMemo(() => { const m = new Map<string, number>(); for (const e of events) if (e.approval?.id) m.set(e.approval.id, e.at); return m; }, [events]);
  const decided = all.filter((a) => a.status !== "pending").sort((x, y) => (at.get(y.id) ?? 0) - (at.get(x.id) ?? 0));
  const first = events[0]?.at ?? now;
  const span = Math.max(1, Math.min(30, Math.ceil((now - first) / 86_400_000)));
  const recent = decided.filter((a) => (at.get(a.id) ?? 0) >= now - span * 86_400_000);
  const cosigned = recent.filter((a) => a.status === "approved");
  const oldestLeft = waiting.length ? leftOf(waiting[0], now) : undefined;
  useAutoplayTarget("inbox.review", (agent?: string) => {
    const a = waiting.find((x) => !agent || x.agent === agent);
    if (!a) return false;
    openApproval(a.id);
    return true;
  }, waiting.length > 0);
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <BackHeader title="Approvals" />
      <Screen tabs={false} top={false} contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: waiting.length ? c.vermillion : c.faint }} />
            <Eyebrow color="ink">{waiting.length ? `Waiting for you (${waiting.length})` : "Nothing waiting"}</Eyebrow>
          </View>
          {oldestLeft != null ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: c.card }}>
              <Icon name="clock" size={14} color={c.vermillionInk} stroke={2.2} />
              <T v="cap" w="bold" style={{ color: c.vermillionInk }}>{`${mmss(oldestLeft)} left`}</T>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          {waiting.map((a, i) => <Reveal key={a.id} index={i}><Waiting a={a} now={now} onOpen={() => openApproval(a.id)} /></Reveal>)}
          {!waiting.length ? (
            <Card style={{ marginHorizontal: 16, alignItems: "center", gap: 10, paddingVertical: 28 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.greenSoft, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={24} color={c.greenInk} stroke={2.4} /></View>
              <T v="head">You're all caught up</T>
              <T v="sub" color="muted" style={{ textAlign: "center", paddingHorizontal: 24 }}>When an agent wants to pay above a pocket's limit, or starts a task, it asks you here first.</T>
            </Card>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 16 }}>
          <Card style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Eyebrow>{`Co-signed · ${span} ${span === 1 ? "day" : "days"}`}</Eyebrow>
              <Icon name="circleCheck" size={16} stroke={2} />
            </View>
            <Money v="amount" value={usd(cosigned.reduce((n, a) => n + amountOf(a), 0n))} decorative />
            <T v="cap" color="muted">{`${cosigned.length} ${cosigned.length === 1 ? "payment" : "payments"} you signed`}</T>
          </Card>
          <Card style={{ flex: 1, gap: 8, overflow: "hidden" }}>
            <Hatch color={c.line} pitch={8} stroke={1.2} style={{ left: "55%" }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Eyebrow>Not signed</Eyebrow>
              <Icon name="ban" size={16} color={c.vermillionInk} stroke={2} />
            </View>
            <T v="amount">{String(recent.length - cosigned.length)}</T>
            <T v="cap" color="muted">declined or expired unanswered</T>
          </Card>
        </View>

        {decided.length ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 24, marginBottom: 10 }}>
              <Eyebrow color="ink">Recent decisions</Eyebrow>
              <T v="cap" color="mutedOnCanvas">{`Last ${span} ${span === 1 ? "day" : "days"}`}</T>
            </View>
            <Card pad={0} style={{ marginHorizontal: 16 }}>
              {decided.slice(0, 8).map((a, i, list) => <Decision key={a.id} a={a} at={at.get(a.id) ?? 0} last={i === list.length - 1} />)}
            </Card>
          </>
        ) : null}

        <Card style={{ marginHorizontal: 16, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}><Icon name="lock" size={17} color={c.blueInk} stroke={2} /></View>
          <T v="sub" color="ink2" style={{ flex: 1 }}>Your signature approves one payment. The pocket contract checks every rule again when it settles.</T>
        </Card>
      </Screen>
    </View>
  );
}

function Waiting({ a, now, onOpen }: { a: Approval; now: number; onOpen: () => void }) {
  const { findPocket, sellerName, answer } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pocket = findPocket(a.pocket);
  const agent = agentInfo(a.agent ?? pocket?.agentId ?? "chainbrain");
  const who = agent?.kind === "builtin" ? "ChainBrain" : agent?.name ?? "Agent";
  const pay = a.kind === "payment";
  const seller = cleanText(sellerName(a.data?.sellerId), 40);
  const left = leftOf(a, now);
  const limit = pocket ? (pocket.askAbove === NEVER ? "Above the ask-me limit" : pocket.askAbove === 0n ? "Asks about every payment" : `Ask limit ${curSign()}${usd(pocket.askAbove)} exceeded`) : "Above the ask-me limit";
  const task = !pay ? parseIntent(a.text) : [];
  const decline = async () => { setBusy(true); setErr(null); const r = await answer(a, false); setBusy(false); if (!r.ok && r.error !== "NOT_PENDING") setErr(describeApprovalError(r.error)); else haptic.light(); };
  return (
    <Card pad={0} style={{ marginHorizontal: 16, overflow: "hidden" }}>
      <View style={{ height: 5, backgroundColor: pay ? c.vermillion : c.blue }} />
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AgentAvatar kind={agent?.id ?? "chainbrain"} size={44} badge={c.vermillion} />
          <View style={{ flex: 1 }}>
            <T v="row" w="bold">{who}</T>
            <T v="cap" color="muted">{`${pay ? "Asked to pay" : "Asked to start a task"} · ${a.createdAt ? ago(a.createdAt, now) : "just now"}`}</T>
          </View>
          {pocket ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, minHeight: 26, paddingHorizontal: 9, borderRadius: 8, backgroundColor: c.blueSoft }}>
              <Icon name="wallet" size={13} color={c.blueInk} stroke={2} />
              <T v="cap" w="bold" numberOfLines={1} style={{ color: c.blueInk, maxWidth: 110 }}>{cleanText(pocket.name, 20)}</T>
            </View>
          ) : null}
        </View>

        {pay ? (
          <View style={{ borderRadius: radius.tile, backgroundColor: c.fill, padding: 14, gap: 10, overflow: "hidden" }}>
            <Hatch color={c.line} pitch={8} stroke={1.2} style={{ left: "62%" }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View>
                <Eyebrow>Requested</Eyebrow>
                <Money v="amount" value={usd(amountOf(a))} decorative />
              </View>
              <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
                <Eyebrow color="vermillionInk">Policy trigger</Eyebrow>
                <T v="cap" w="bold" style={{ textAlign: "right" }}>{limit}</T>
              </View>
            </View>
            <Fact k="Seller" v={seller} />
            <Fact k="Item" v={cleanText(a.data?.description ?? "", 60) || "A seller's item"} />
            {pocket ? <Fact k="Pocket" v={`${money(pocket.balance)} left · cap ${money(pocket.cap)} a payment`} /> : null}
          </View>
        ) : (
          <View style={{ borderRadius: radius.tile, backgroundColor: c.fill, padding: 14, gap: 8 }}>
            {task.map((r) => <Fact key={r.k} k={r.k} v={r.v} />)}
          </View>
        )}

        {pay && a.text ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Icon name="info" size={16} color={c.muted} />
            <T v="sub" color="ink2" style={{ flex: 1, fontStyle: "italic" }} numberOfLines={3}>{`${who}'s note (not checked): “${cleanText(a.text, 200)}”`}</T>
          </View>
        ) : null}
        {err ? <T v="cap" color="vermillionInk">{err}</T> : null}
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Button label="Decline" kind="secondary" icon="x" onPress={decline} loading={busy} style={{ flex: 1 }} />
          <Button label={pay ? "Co-sign" : "Review task"} kind="vermillion" icon={pay ? "edit" : "checks"} onPress={onOpen} style={{ flex: 1.3 }} />
        </View>
        {left != null ? <T v="cap" color="muted" style={{ textAlign: "center" }}>{left > 0 ? `Expires in ${mmss(left)} if nobody answers` : "Expired"}</T> : null}
      </View>
    </Card>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <T v="cap" color="muted">{k}</T>
      <T v="cap" w="semi" style={{ flexShrink: 1, textAlign: "right" }}>{v}</T>
    </View>
  );
}

function Decision({ a, at, last }: { a: Approval; at: number; last: boolean }) {
  const { sellerName, findPocket } = useApp();
  const agent = agentInfo(a.agent ?? findPocket(a.pocket)?.agentId ?? "chainbrain");
  const who = agent?.kind === "builtin" ? "ChainBrain" : agent?.name ?? "Agent";
  const ok = a.status === "approved";
  const label = ok ? "Co-signed" : a.status === "timeout" ? "Expired" : "Declined";
  const when = new Date(at).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.fill }}>
      <AgentAvatar kind={agent?.id ?? "chainbrain"} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="row" w="bold" numberOfLines={1}>{`${who} · ${cleanText(sellerName(a.data?.sellerId), 24)}`}</T>
        <T v="cap" color="muted">{`${ok ? "Approved by you" : a.status === "timeout" ? "Expired without your signature" : "Declined"} · ${when}`}</T>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <T v="row" w="bold" color={ok ? "ink" : "muted"} style={{ textDecorationLine: ok ? "none" : "line-through" }}>{`${curSign()}${usd(amountOf(a))}`}</T>
        <StatusPill label={label} tone={ok ? "green" : "fill"} />
      </View>
    </View>
  );
}

