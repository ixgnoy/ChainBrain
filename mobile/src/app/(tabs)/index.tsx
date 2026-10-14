import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { isAddress, formatEther, type Address } from "viem";
import { useTheme } from "../../theme";
import { useApp } from "../../store";
import { Screen } from "../../ui/Screen";
import { Button, Chip, DevBadge, IconButton, Press, SectionHeader, TestnetPill } from "../../ui/primitives";
import { T } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import { Logo } from "../../ui/Logo";
import { Input } from "../../components/ui/input";
import { Orb } from "../../ui/Orb";
import { PocketCard, cardOf, CARD_H, CARD_W } from "../../components/PocketCard";
import { ActivityRow } from "../../components/ActivityRow";
import { useCountUp } from "../../lib/useCountUp";
import { cleanText } from "../../lib/sanitize";
import { devFund } from "../../lib/api";
import { usd, usdFrame, num } from "../../lib/util";
import { haptic } from "../../haptics";
import { radius } from "../../tokens";

const STATE_TEXT = { idle: "Watching your limits", working: "Working on a task", waiting: "Waiting for you", paused: "Paused, all pockets revoked" } as const;

function Header() {
  const { agentState, dev, conn } = useApp();
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Logo size={40} />
        <View style={{ flex: 1, height: 48, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radius.md, backgroundColor: c.bgElev1, borderWidth: 1, borderColor: c.hairline }}>
          <Orb size={26} state={agentState} />
          <View style={{ flex: 1 }}>
            <T v="bodySm" weight="semi" numberOfLines={1}>ChainBrain agent</T>
            <T v="caption" color="text2" numberOfLines={1}>{STATE_TEXT[agentState]}</T>
          </View>
        </View>
        <IconButton icon="sparkle" label="Ask the agent" onPress={() => router.navigate("/agent")} size={44} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {dev && <DevBadge />}
        <TestnetPill />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: conn === "online" ? c.ok : conn === "offline" ? c.refused : c.stepup }} />
          <T v="caption" color="text3">{conn === "online" ? "Connected" : conn === "offline" ? "Offline" : "Connecting"}</T>
        </View>
      </View>
    </View>
  );
}

/** Pending approvals and the agent's question, as banners. */
function Banners() {
  const { pending, setApprovalOpen, setQuestionOpen, sellerName } = useApp();
  const { c } = useTheme();
  const ask = pending.find((a) => a.kind !== "question");
  const q = pending.find((a) => a.kind === "question");
  if (!ask && !q) return null;
  const item = (key: string, icon: IconName, title: string, sub: string, onPress: () => void, tone: "stepup" | "info") => (
    <Press key={key} onPress={onPress} haptics="light" accessibilityLabel={title}>
      <View style={{ borderRadius: radius.lg, borderWidth: 1, backgroundColor: tone === "stepup" ? c.stepupBg : c.bgElev1, borderColor: tone === "stepup" ? c.stepupBorder : c.hairlineStrong }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: tone === "stepup" ? c.stepupBg : c.accentSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: tone === "stepup" ? c.stepupBorder : c.hairline }}>
            <Icon name={icon} size={20} color={tone === "stepup" ? c.stepup : c.accent} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <T v="bodySm" weight="semi" numberOfLines={1}>{title}</T>
            <T v="caption" color="text2" numberOfLines={2}>{sub}</T>
          </View>
          <Icon name="chevronRight" size={18} color={c.text3} />
        </View>
      </View>
    </Press>
  );
  const payAmt = ask?.kind === "payment" ? `US$${cleanText(ask.data?.amount, 12)} to ${cleanText(sellerName(ask.data?.sellerId), 30)}` : null;
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 18, gap: 10 }}>
      {ask && item(ask.id, ask.kind === "payment" ? "shieldAlert" : "sparkle", ask.kind === "payment" ? "Approve a payment" : "Confirm a task", payAmt ?? cleanText(ask.text.split("\n")[0], 90), () => setApprovalOpen(true), "stepup")}
      {q && item(q.id, "chat", "Your agent asks", cleanText(q.text, 90), () => setQuestionOpen(true), "info")}
    </View>
  );
}

function ActionButton({ icon, label, onPress, tone }: { icon: IconName; label: string; onPress: () => void; tone?: "revoke" }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ alignItems: "center", gap: 8, flex: 1 }}>
      <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: tone === "revoke" ? c.revokedBg : c.bgElev1, borderWidth: 1, borderColor: tone === "revoke" ? c.revokedBorder : c.hairline, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={24} color={tone === "revoke" ? c.revokedText : c.text} />
      </View>
      <T v="caption" color={tone === "revoke" ? "revokedText" : "text2"}>{label}</T>
    </Press>
  );
}

function AddPocket() {
  const { addPocket } = useApp();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  return (
    <View style={{ marginHorizontal: 20, marginTop: 14 }}>
      {!open ? (
        <Press haptics="select" onPress={() => setOpen(true)} style={{ alignSelf: "flex-start" }}><T v="bodySm" weight="semi" color="accentInk">Add an existing pocket by address</T></Press>
      ) : (
        <View style={{ gap: 10 }}>
          <Input value={v} onChangeText={setV} placeholder="0x pocket address" autoCapitalize="none" autoCorrect={false} accessibilityLabel="Pocket address" className="font-mono text-sm" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="Cancel" kind="secondary" small style={{ flex: 1 }} onPress={() => { setOpen(false); setV(""); }} />
            <Button label="Add pocket" small style={{ flex: 1 }} disabled={!isAddress(v.trim())} onPress={async () => { await addPocket(v.trim() as Address); setV(""); setOpen(false); }} />
          </View>
        </View>
      )}
    </View>
  );
}

function TestFunds() {
  const { dev, wallet, balances, refreshPockets } = useApp();
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  if (!dev || !wallet || (balances && balances.usdc > 0n && balances.eth > 0n)) return null;
  return (
    <View style={{ marginHorizontal: 20, marginBottom: 18, padding: 14, borderRadius: radius.lg, backgroundColor: c.stepupBg, borderWidth: 1, borderColor: c.stepupBorder, gap: 10 }}>
      <T v="bodySm" weight="semi">Your main wallet needs fork money</T>
      <T v="caption" color="text2">Get 1 ETH and 20 USDC of fork money to create and fund pockets.</T>
      <Button label="Get test funds" small loading={busy} onPress={async () => { setBusy(true); try { await devFund(wallet.address); haptic.success(); await refreshPockets(); } catch { haptic.error(); } finally { setBusy(false); } }} />
    </View>
  );
}

export default function Home() {
  const { c } = useTheme();
  const { pockets, pocketsLoaded, conn, connError, balances, ledger, setReceipt, setAction } = useApp();
  const active = pockets.filter((p) => !p.revoked);
  const total = useMemo(() => active.reduce((n, p) => n + num(p.balance), 0), [pockets]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useCountUp(total, 700);
  const recent = useMemo(() => [...ledger].reverse().slice(0, 3), [ledger]);
  const [whole, frac] = usdFrame(shown, total).split(".");
  return (
    <Screen>
      <Header />
      <Banners />
      <TestFunds />
      <View style={{ paddingHorizontal: 20, marginBottom: 22 }}>
        <T v="caption" color="text3" style={{ letterSpacing: 0.4 }}>AGENT FUNDS</T>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 2 }}>
          <T v="displayXl" num>{whole}<T v="displayXl" num color="text3">.{frac}</T></T>
          <T v="body" weight="semi" color="text2" style={{ marginBottom: 6 }}>USDC</T>
        </View>
        <T v="bodySm" color="text2" style={{ marginTop: 2 }}>
          {pocketsLoaded ? `${pockets.length} pocket${pockets.length === 1 ? "" : "s"}, ${active.length} active. Your agent can only spend what you put here.` : conn === "offline" ? "Not connected yet" : "Loading pockets…"}
        </T>
        {balances && (
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <Chip kind="info" label={`Main wallet ${usd(balances.usdc)} USDC · ${Number(formatEther(balances.eth)).toFixed(3)} ETH`} />
          </View>
        )}
      </View>
      <View style={{ flexDirection: "row", paddingHorizontal: 14, marginBottom: 26 }}>
        <ActionButton icon="plus" label="Fund" onPress={() => setAction({ mode: "fund" })} />
        <ActionButton icon="undo" label="Return" onPress={() => setAction({ mode: "return" })} />
        <ActionButton icon="lock" label="Revoke" tone="revoke" onPress={() => setAction({ mode: "revoke" })} />
        <ActionButton icon="layers" label="New pocket" onPress={() => router.push("/create")} />
      </View>

      <SectionHeader title="Pockets" />
      {conn === "offline" && pockets.length === 0 ? (
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ height: CARD_H, borderRadius: radius.lg, backgroundColor: c.bgElev1, borderWidth: 1, borderColor: c.refusedBorder, padding: 20, justifyContent: "center", gap: 8 }}>
            <T v="title">Can't reach the server</T>
            <T v="bodySm" color="text2">{connError || "Set the API URL to your laptop's address in Settings, then come back."}</T>
            <Press onPress={() => router.navigate("/settings")} style={{ alignSelf: "flex-start", marginTop: 6 }}><T v="bodySm" weight="semi" color="accentInk">Open Settings</T></Press>
          </View>
        </View>
      ) : !pocketsLoaded ? (
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ height: CARD_H, borderRadius: radius.lg, backgroundColor: c.bgElev1, borderWidth: 1, borderColor: c.hairline, padding: 20, justifyContent: "center" }}>
            <T v="title" color="text2">Loading your pockets…</T>
          </View>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={CARD_W + 12} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} style={{ flexGrow: 0 }}>
          {pockets.map((p) => <PocketCard key={p.address} pocket={cardOf(p)} onPress={() => router.push({ pathname: "/pocket/[id]", params: { id: p.address } })} />)}
          <Press onPress={() => router.push("/create")} style={{ width: pockets.length ? 150 : CARD_W, height: CARD_H, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.hairlineStrong, alignItems: "center", justifyContent: "center", gap: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.bgElev2, alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={22} color={c.text} /></View>
            <T v="bodySm" weight="semi" color="text2">{pockets.length ? "New pocket" : "Create your first pocket"}</T>
          </Press>
        </ScrollView>
      )}
      <AddPocket />

      <View style={{ marginTop: 28 }}>
        <SectionHeader title="Right now" action={ledger.length ? "See all" : undefined} onAction={() => router.navigate("/activity")} />
        {recent.length === 0 ? (
          <View style={{ marginHorizontal: 20, padding: 18, borderRadius: radius.lg, backgroundColor: c.bgElev1, borderWidth: 1, borderColor: c.hairline }}>
            <T v="bodySm" color="text2">Nothing yet. Ask your agent to buy something and every step shows up here.</T>
          </View>
        ) : recent.map((r) => <ActivityRow key={r.key} row={r} onPress={() => setReceipt(r)} compact />)}
      </View>
    </Screen>
  );
}
