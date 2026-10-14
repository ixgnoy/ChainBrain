import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { isAddress, type Address } from "viem";
import { useApp } from "../../store";
import { c } from "../../tokens";
import { Screen } from "../../ui/Screen";
import { Avatar, Button, Card, Field, ListCard, ListRow, Press, RoundAction, SectionHeader } from "../../ui/kit";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { PocketRow } from "../../components/PocketCard";
import { ActivityRow } from "../../components/ActivityRow";
import { useCountUp } from "../../lib/useCountUp";
import { cleanText } from "../../lib/sanitize";
import { visibleRows } from "../../lib/plain";
import { usd, usdFrame, num, money } from "../../lib/util";

/** Header: owner avatar, "Ask agent" pill, bell. */
function Header() {
  const { pending, setApprovalOpen, setQuestionOpen } = useApp();
  const needs = pending.length > 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 }}>
      <Press onPress={() => router.navigate("/settings")} accessibilityRole="button" accessibilityLabel="Settings and wallet" haptics="select"><Avatar icon="user" tone="solid" size={48} /></Press>
      <Press onPress={() => router.navigate("/agent")} accessibilityRole="button" accessibilityLabel="Ask agent" style={{ height: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: c.card, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="chat" size={18} color={c.accent} />
        <T v="row" w="semi" color="accent">Ask agent</T>
      </Press>
      <Press
        onPress={() => { const q = pending.find((a) => a.kind === "question"); if (pending.some((a) => a.kind !== "question")) setApprovalOpen(true); else if (q) setQuestionOpen(true); else router.navigate("/activity"); }}
        accessibilityRole="button" accessibilityLabel={needs ? "Notifications, something needs you" : "Notifications"} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
        <Icon name="bell" size={22} />
        {needs ? <View style={{ position: "absolute", top: 11, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: c.negative, borderWidth: 2, borderColor: c.card }} /> : null}
      </Press>
    </View>
  );
}

/** Pending approvals and the agent's question, as one quiet row each. */
function Needs() {
  const { pending, setApprovalOpen, setQuestionOpen, sellerName } = useApp();
  const ask = pending.find((a) => a.kind !== "question");
  const q = pending.find((a) => a.kind === "question");
  if (!ask && !q) return null;
  return (
    <ListCard style={{ marginBottom: 12 }}>
      {ask ? (
        <ListRow key="ask" a11y={ask.kind === "payment" ? "Approve a payment" : "Confirm a task"} onPress={() => setApprovalOpen(true)} avatar={<Avatar icon="clock" tone="warning" />}
          title={ask.kind === "payment" ? "Waiting for your OK" : "Confirm a task"} sub={ask.kind === "payment" ? `${cleanText(sellerName(ask.data?.sellerId), 30)} · US$${cleanText(ask.data?.amount, 10)}` : cleanText(ask.text.split("\n")[0], 60)}>
          <Icon name="chevronRight" size={18} color={c.muted} />
        </ListRow>
      ) : null}
      {q ? (
        <ListRow key="q" a11y="Your agent asks" onPress={() => setQuestionOpen(true)} avatar={<Avatar icon="chat" tone="soft" />} title="Your agent has a question" sub={cleanText(q.text, 60)}>
          <Icon name="chevronRight" size={18} color={c.muted} />
        </ListRow>
      ) : null}
    </ListCard>
  );
}

function AddPocket() {
  const { addPocket, demo } = useApp();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  if (demo) return null;
  return (
    <View style={{ marginHorizontal: 20, marginTop: 12 }}>
      {!open ? (
        <Press haptics="select" onPress={() => setOpen(true)} style={{ alignSelf: "center", minHeight: 44, justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Add an existing pocket"><T v="sub" w="semi" color="accent">Add an existing pocket</T></Press>
      ) : (
        <Card style={{ gap: 12 }}>
          <Field value={v} onChangeText={setV} placeholder="Pocket address (0x…)" autoCapitalize="none" autoCorrect={false} accessibilityLabel="Pocket address" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Cancel" kind="secondary" small style={{ flex: 1 }} onPress={() => { setOpen(false); setV(""); }} />
            <Button label="Add pocket" small style={{ flex: 1 }} disabled={!isAddress(v.trim())} onPress={async () => { await addPocket(v.trim() as Address); setV(""); setOpen(false); }} />
          </View>
        </Card>
      )}
    </View>
  );
}

export default function Home() {
  const { pockets, pocketsLoaded, conn, balances, ledger, setReceipt, setAction, demo } = useApp();
  const active = pockets.filter((p) => !p.revoked);
  const total = useMemo(() => active.reduce((n, p) => n + num(p.balance), 0), [pockets]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useCountUp(total, 600);
  const recent = useMemo(() => visibleRows([...ledger].reverse()).slice(0, 3), [ledger]);
  const sumAll = pockets.reduce((n, p) => n + (p.revoked ? 0n : p.balance), 0n);
  const loading = !pocketsLoaded && conn !== "offline";
  return (
    <Screen>
      <Header />
      <Needs />
      <Card pad={20} style={{ marginHorizontal: 20, alignItems: "center" }}>
        <T v="row" w="regular" color="ink2" style={{ marginTop: 4 }}>Agent pockets</T>
        <T v="balance" style={{ marginTop: 10 }} accessibilityLabel={`Agent pockets total ${money(sumAll)}`}>US${usdFrame(shown, total)}</T>
        <T v="body" color="ink2" style={{ marginTop: 6 }}>{balances ? `Main wallet ${money(balances.usdc)}` : loading ? "Loading…" : "Main wallet"}</T>
        {demo ? <T v="cap" color="muted" style={{ marginTop: 2 }}>Demo data</T> : null}
        <View style={{ flexDirection: "row", marginTop: 26, alignSelf: "stretch" }}>
          <RoundAction icon="plus" label="Add money" onPress={() => setAction({ mode: "fund" })} />
          <RoundAction icon="layers" label="Pocket" a11y="New pocket" onPress={() => router.push("/create")} />
          <RoundAction icon="chat" label="Ask agent" onPress={() => router.navigate("/agent")} />
          <RoundAction icon="more" label="More" a11y="More" onPress={() => router.navigate("/settings")} />
        </View>
      </Card>

      <SectionHeader title="Pockets" right={pockets.length ? money(sumAll) : undefined} />
      {loading ? (
        <Card style={{ marginHorizontal: 20 }}><T v="body" color="muted">Loading your pockets…</T></Card>
      ) : pockets.length === 0 ? (
        <Card pad={20} style={{ marginHorizontal: 20, gap: 14, alignItems: "flex-start" }}>
          <View style={{ gap: 4 }}>
            <T v="row" w="semi">Give your agent a budget</T>
            <T v="sub" color="ink2">A pocket holds a little money, with rules you choose. Your agent can only spend from it.</T>
          </View>
          <Button label="Create now" kind="outline" small onPress={() => router.push("/create")} />
        </Card>
      ) : (
        <ListCard>
          {pockets.map((p) => <PocketRow key={p.address} pocket={p} onPress={() => router.push({ pathname: "/pocket/[id]", params: { id: p.address } })} />)}
        </ListCard>
      )}
      {pockets.length > 0 ? <ListCard style={{ marginTop: 12 }}>
        <ListRow a11y="New pocket" onPress={() => router.push("/create")} avatar={<Avatar icon="plus" tone="fill" />} title="New pocket" />
      </ListCard> : null}
      <AddPocket />

      <SectionHeader title="Recent activity" action={ledger.length ? "View all" : undefined} onAction={() => router.navigate("/activity")} />
      {recent.length === 0 ? (
        <Card style={{ marginHorizontal: 20 }}><T v="sub" color="ink2">Nothing yet. Ask your agent to buy something and it shows up here.</T></Card>
      ) : (
        <ListCard>{recent.map((r) => <ActivityRow key={r.key} row={r} showPocket onPress={() => setReceipt(r)} />)}</ListCard>
      )}
    </Screen>
  );
}
