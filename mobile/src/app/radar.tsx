// Radar alert (Stitch chainbrain_radar_alert): why a seller is blocked or needs your OK, from Radar's own screening on this
// network: the score, the plain diagnosis (a fixed template, never a model's words), the money trail as a flow, the pockets that
// allow the seller (and what Radar refused for them), and the owner's options: keep it blocked, or take the seller off every
// pocket's list (owner-signed setSeller per pocket). Opened from a Radar card in the chat or a Radar row in Activity.
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../store";
import { c, radius } from "../tokens";
import { haptic } from "../haptics";
import { Screen } from "../ui/Screen";
import { BackHeader } from "../ui/BackHeader";
import { Button, Card } from "../ui/kit";
import { T, Eyebrow } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { Hatch } from "../ui/Hatch";
import { Reveal } from "../ui/Reveal";
import { AgentAvatar } from "../ui/AgentAvatar";
import { ScoreBar } from "../components/RadarCard";
import { txError } from "../components/ActionSheet";
import { radarAlerts, radarBody, radarScreens, sameAddr } from "../lib/events";
import { cleanText } from "../lib/sanitize";
import { money } from "../lib/util";

const share = (x?: number) => (x == null ? undefined : x >= 0.995 ? "All of it" : x < 0.01 ? "Under 1%" : `${Math.round(x * 100)}%`);

export default function RadarAlertPage() {
  const { name: want } = useLocalSearchParams<{ name?: string }>();
  const { events, pockets, cfg, wallet, refreshPockets, recordTx, setNotice, ledger } = useApp();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const screens = useMemo(() => radarScreens(events), [events]);
  const alerts = useMemo(() => pockets.flatMap((p) => radarAlerts(events, p.address)).sort((a, b) => a.at - b.at), [events, pockets]);
  const risky = screens.filter((v) => v.verdict !== "ok");
  const v = (want ? screens.find((x) => x.counterparty === want) : undefined) ?? risky.at(-1);
  const alert = alerts.filter((a) => a.name === (v?.counterparty ?? want)).at(-1);
  const name = cleanText(v?.counterparty ?? alert?.name ?? want ?? "This seller", 40);
  const score = v?.score ?? alert?.to.score ?? 0;
  const verdict = v?.verdict ?? alert?.to.verdict ?? "ok";
  const seller = cfg?.sellers.find((s) => s.name === (v?.counterparty ?? alert?.name));
  const allowing = pockets.filter((p) => seller && p.allowed.includes(seller.id) && !p.revoked);
  const refused = ledger.filter((r) => r.sellerId === seller?.id && r.reasons.some((x) => x.startsWith("COUNTERPARTY")));
  const paidAfter = alert ? ledger.some((r) => r.kind === "payment" && r.sellerId === seller?.id && r.at > alert.at) : false;
  const trail = v?.trail?.length ? v.trail : [];
  const diagnosis = cleanText(radarBody(v?.narrative ?? alert?.narrative ?? ""), 400).split(" Rule:")[0];
  const blocked = verdict === "block";

  const removeEverywhere = async () => {
    if (!wallet || !seller) return;
    setBusy(true); setErr(null);
    try {
      const txs: { label?: string; hash: string }[] = [];
      for (const p of allowing.filter((x) => x.owned)) {
        const r = await wallet.setSeller(p.address, seller.payTo as `0x${string}`, false);
        recordTx({ kind: "seller", pocket: p.address, hash: r.hash, note: `${seller.name} removed` });
        txs.push({ label: cleanText(p.name, 24), hash: r.hash });
      }
      haptic.success();
      if (txs.length) setNotice({ title: `${seller.name} removed from ${txs.length} ${txs.length === 1 ? "pocket" : "pockets"}`, txs });
      await refreshPockets();
    } catch (e) { haptic.error(); setErr(txError(e)); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <BackHeader title="Radar alert" />
      <Screen tabs={false} top={false} contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 32 }}>
        <Reveal index={0}>
          <View style={{ marginHorizontal: 16, borderRadius: radius.card, backgroundColor: blocked ? c.vermillionInk : c.blueInk, padding: 18, gap: 10, overflow: "hidden" }}>
            <Hatch color={c.white} pitch={9} stroke={1.4} opacity={0.12} style={{ left: "62%" }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}><Icon name="radar" size={22} color={c.white} stroke={2} /></View>
              <View style={{ minHeight: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: c.white, justifyContent: "center" }}>
                <T v="tab" w="bold" style={{ color: blocked ? c.vermillionInk : c.blueInk, letterSpacing: 0.8, textTransform: "uppercase" }}>{`Risk ${score}/10`}</T>
              </View>
            </View>
            <T v="tab" style={{ color: "rgba(255,255,255,0.8)", letterSpacing: 1, textTransform: "uppercase" }}>{blocked ? "Radar blocked a seller" : "Radar wants your OK"}</T>
            <T v="section" style={{ color: c.white }} accessibilityRole="header">{blocked ? `${name} is blocked for all your pockets` : `${name} needs your OK before any payment`}</T>
            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.22)" }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.white }} />
              <T v="cap" w="semi" style={{ color: c.white }}>{paidAfter ? "A payment went through after the alert" : "No money left your pockets to it after the alert"}</T>
            </View>
          </View>
        </Reveal>

        <Reveal index={1}>
          <Card pad={18} style={{ marginHorizontal: 16, marginTop: 12, gap: 14 }}>
            <Eyebrow>Diagnosis</Eyebrow>
            <T v="body">{diagnosis || `${name}'s money traces to a risky source on this network.`}</T>
            <ScoreBar score={score} verdict={verdict} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Fact k="Risk score" v={`${score}/10`} strong />
              <Fact k="Share of its money" v={share(v?.share) ?? "n/a"} />
              <Fact k="Radar's action" v={blocked ? "Blocks" : "Asks you"} />
            </View>
          </Card>
        </Reveal>

        {trail.length > 1 ? (
          <Reveal index={2}>
            <Card pad={18} style={{ marginHorizontal: 16, marginTop: 12, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name="layers" size={18} stroke={2} />
                <T v="head" style={{ flex: 1 }}>Money trail</T>
                <T v="cap" color="muted">{v?.direction === "destination" ? "Where its money went" : "Where its money came from"}</T>
              </View>
              <View style={{ borderRadius: radius.tile, overflow: "hidden", backgroundColor: c.fill, padding: 12, gap: 0 }}>
                <Hatch color={c.line} pitch={8} stroke={1.2} />
                {trail.map((n, i) => (
                  <React.Fragment key={`${n}${i}`}>
                    <Node icon={i === 0 ? "alert" : "card"} title={cleanText(n, 30)} sub={i === 0 ? "Source" : i === trail.length - 1 ? "Seller, flagged" : "Passed through"} tone={i === 0 ? "bad" : i === trail.length - 1 ? "flag" : "plain"} />
                    <Link label={i === trail.length - 1 ? (blocked ? "Payment refused by Radar" : "Waits for your OK") : share(v?.share) ? `${share(v?.share)} of its money` : undefined} cut={i === trail.length - 1} />
                  </React.Fragment>
                ))}
                <Node icon="wallet" title="Your pockets" sub={blocked ? "Protected: nothing paid" : "Asks you first"} tone="safe" />
              </View>
            </Card>
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <Card pad={18} style={{ marginHorizontal: 16, marginTop: 12, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <T v="head">Pockets that allow it</T>
              <T v="cap" color="muted">{`${refused.length} refused`}</T>
            </View>
            {allowing.length ? allowing.map((p) => {
              const lost = refused.filter((r) => sameAddr(r.pocket, p.address));
              return (
                <View key={p.address} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.tile, backgroundColor: c.fill }}>
                  <AgentAvatar kind={p.agentId ?? "chainbrain"} size={34} />
                  <View style={{ flex: 1 }}>
                    <T v="row" w="bold" numberOfLines={1}>{cleanText(p.name, 24)}</T>
                    <T v="cap" color="muted">{`${money(p.balance)} in the pocket · cap ${money(p.cap)}`}</T>
                  </View>
                  {lost.length ? <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: c.vermillionSoft, justifyContent: "center" }}><T v="tab" w="bold" style={{ color: c.vermillionInk }}>{`${lost.length} refused`}</T></View> : null}
                </View>
              );
            }) : <T v="sub" color="muted">{`No live pocket allows ${name} now.`}</T>}
          </Card>
        </Reveal>

        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 10 }}>
          {err ? <T v="sub" color="vermillionInk">{err}</T> : null}
          <Button label={blocked ? "Keep blocked" : "Keep asking me"} kind="vermillion" icon="shieldCheck" onPress={() => router.back()} />
          {allowing.some((p) => p.owned) ? <Button label={`Remove ${name} from allowed sellers`} kind="secondary" icon="x" loading={busy} onPress={() => void removeEverywhere()} /> : null}
          <T v="cap" color="mutedOnCanvas" style={{ textAlign: "center", paddingHorizontal: 12 }}>Radar reads each seller's money trail on this network before every payment. A block lasts until the trail is clean again; your own keys decide the lists.</T>
        </View>
      </Screen>
    </View>
  );
}

function Fact({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flex: 1, padding: 10, borderRadius: 12, borderCurve: "continuous", backgroundColor: c.fill, gap: 4, justifyContent: "space-between" }}>
      <T v="cap" color="muted" numberOfLines={2}>{k}</T>
      <T v="head" style={{ color: strong ? c.vermillionInk : c.ink, fontSize: 16 }} numberOfLines={1}>{v}</T>
    </View>
  );
}

function Node({ icon, title, sub, tone }: { icon: IconName; title: string; sub: string; tone: "bad" | "flag" | "plain" | "safe" }) {
  const border = tone === "flag" ? c.vermillion : tone === "safe" ? c.green : c.tileStroke;
  const fg = tone === "bad" || tone === "flag" ? c.vermillionInk : tone === "safe" ? c.greenInk : c.ink;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: c.card, borderWidth: tone === "flag" || tone === "safe" ? 2 : 1, borderColor: border }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tone === "bad" || tone === "flag" ? c.vermillionSoft : tone === "safe" ? c.greenSoft : c.fill, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={17} color={fg} stroke={2} /></View>
      <View style={{ flex: 1 }}>
        <T v="row" w="bold" style={{ color: fg }} numberOfLines={1}>{title}</T>
        <T v="cap" color="muted">{sub}</T>
      </View>
    </View>
  );
}

function Link({ label, cut }: { label?: string; cut?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 28, minHeight: 34 }}>
      <View style={{ width: 2, height: 34, backgroundColor: cut ? c.vermillion : c.ink }} />
      {label ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: cut ? c.ink : c.card }}>
          {cut ? <Icon name="ban" size={12} color={c.white} stroke={2.4} /> : <Icon name="arrowDown" size={12} color={c.ink} stroke={2.4} />}
          <T v="tab" w="bold" style={{ color: cut ? c.white : c.ink, letterSpacing: 0.3 }}>{label}</T>
        </View>
      ) : null}
    </View>
  );
}
