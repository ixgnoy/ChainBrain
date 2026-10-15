// Radar in the agent chat and Activity: what the on-chain screening found about a seller before money moved. A risky seller gets a
// full card (title, the plain sentence, a 10-step score bar, the money trail "Demo drainer → DataPro"); clean sellers fold into one
// quiet line, so the owner still sees that every seller was checked. The narrative comes from a fixed template on the server, never
// from a model or the seller, and it is cleaned and bounded here anyway.
import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Avatar, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Rise } from "../ui/Rise";
import { cleanText } from "../lib/sanitize";
import { radarBody, type RadarAlert, type RadarView } from "../lib/events";
import { EventCard } from "./EventCard";

/** Ten steps, filled up to the score: teal while clean, amber from "needs your OK", ink from "blocked". */
export function ScoreBar({ score, verdict }: { score: number; verdict: RadarView["verdict"] }) {
  const fill = verdict === "block" ? c.ink : verdict === "review" ? c.warning : c.accent;
  const s = Math.max(0, Math.min(10, Math.round(score)));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessible accessibilityLabel={`Risk ${s} out of 10`}>
      <View style={{ flex: 1, flexDirection: "row", gap: 3 }}>
        {Array.from({ length: 10 }, (_, i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < s ? fill : c.line }} />)}
      </View>
      <T v="cap" w="semi" color={verdict === "ok" ? "accent" : verdict === "review" ? "warning" : "ink"}>{s}/10</T>
    </View>
  );
}

/** "Demo drainer → 0x12…9a → DataPro", wrapping on small phones. The counterparty is the last chip. */
export function Trail({ names }: { names: string[] }) {
  if (names.length < 2) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }} accessible accessibilityLabel={`Money trail: ${names.join(" to ")}`}>
      {names.map((n, i) => (
        <React.Fragment key={`${n}${i}`}>
          {i ? <Icon name="chevronRight" size={14} color={c.faint} /> : null}
          <View style={{ paddingHorizontal: 8, height: 24, borderRadius: 12, justifyContent: "center", backgroundColor: i === 0 ? c.warningSoft : c.fill }}>
            <T v="cap" w="medium" color={i === 0 ? "warning" : "ink2"} numberOfLines={1}>{cleanText(n, 28)}</T>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const plainShare = (x?: number) => (x == null ? undefined : x >= 0.995 ? "All" : x < 0.01 ? "Under 1%" : `${Math.round(x * 100)}%`);

/** A risky seller (review or block). */
export function RadarCard({ v, id }: { v: RadarView; id: string }) {
  const name = cleanText(v.counterparty, 40);
  const title = v.verdict === "block" ? `Radar blocked ${name}` : `${name} needs your OK`;
  const body = cleanText(radarBody(v.narrative), 400).split(" Rule:")[0] || (v.verdict === "block" ? "Its money traces to a high-risk source." : "Some of its money traces to a risky source.");
  const from = v.direction === "destination" ? "Where its money went" : "Where its money came from";
  return (
    <EventCard
      tone="blocked" alert={id} title={title} body={body}
      why={{
        title: "Why",
        codes: [v.verdict === "block" ? "COUNTERPARTY_HIGH_RISK" : "COUNTERPARTY_REVIEW"],
        rows: [["Risk score", `${v.score}/10`], ...(v.share != null ? [["Share of its money", plainShare(v.share)!] as [string, string]] : []), ["Checked by", "Radar, on-chain"]],
        children: v.reasons.length ? <View style={{ gap: 4 }}>{v.reasons.map((r, i) => <T key={i} v="cap" color="muted">Rule: {cleanText(r, 120)}</T>)}</View> : undefined,
      }}
    >
      <ScoreBar score={v.score} verdict={v.verdict} />
      {v.trail.length > 1 ? <View style={{ gap: 6 }}><T v="cap" color="muted">{from}</T><Trail names={v.trail} /></View> : null}
    </EventCard>
  );
}

/** Every seller screened clean in this turn, as one quiet line: "Radar checked DataLite and DataPro: no known risk". */
export function RadarClean({ list }: { list: RadarView[] }) {
  if (!list.length) return null;
  const names = list.map((v) => cleanText(v.counterparty, 30));
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return (
    <Rise dy={6} layout style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon name="radar" size={16} color={c.accent} />
      <T v="cap" color="muted" style={{ flex: 1 }} accessibilityLabel={`Radar checked ${who} on-chain: no known risk`}>Radar checked {who} on-chain: no known risk</T>
    </Rise>
  );
}

/** All Radar output for one chat turn: risky sellers as cards, clean ones as one line. */
export function RadarBlock({ list, turnId }: { list: RadarView[]; turnId: string }) {
  const risky = list.filter((v) => v.verdict !== "ok");
  const clean = list.filter((v) => v.verdict === "ok" && !risky.some((r) => r.sellerId === v.sellerId));
  return (
    <>
      {risky.map((v) => <RadarCard key={v.key} v={v} id={`${turnId}:${v.sellerId ?? v.counterparty}`} />)}
      <RadarClean list={clean} />
    </>
  );
}

/** A seller this pocket paid before became risky (the monitor re-screened it). */
export function RadarAlertCard({ a }: { a: RadarAlert }) {
  const name = cleanText(a.name, 40);
  const was = a.from ? ` from ${a.from.score}/10` : "";
  return (
    <EventCard tone="blocked" alert={a.key} title={`Radar alert: ${name}`} body={`You paid ${name} before. Its risk rose${was} to ${a.to.score}/10, so your agent won't pay it.`}
      why={{ codes: [a.to.verdict === "block" ? "COUNTERPARTY_HIGH_RISK" : "COUNTERPARTY_REVIEW"], children: <T v="cap" color="muted">{cleanText(a.narrative, 500)}</T> }}>
      <ScoreBar score={a.to.score} verdict={a.to.verdict} />
    </EventCard>
  );
}

/** A Radar alert as an Activity row (same layout as ActivityRow). */
export function RadarActivityRow({ a, last, delay = 0, onPress }: { a: RadarAlert; last?: boolean; delay?: number; onPress?: () => void }) {
  const { findPocket } = useApp();
  const pocket = findPocket(a.pocket);
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingHorizontal: 16 }}>
      <Avatar icon="radar" tone="warning" size={40} />
      <View style={{ flex: 1, gap: 1, paddingVertical: 8 }}>
        <T v="row" numberOfLines={1}>Radar alert: {cleanText(a.name, 30)}</T>
        <T v="sub" color="muted" numberOfLines={1}>{[pocket ? cleanText(pocket.name, 24) : undefined, new Date(a.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })].filter(Boolean).join(" · ")}</T>
      </View>
      <View style={{ alignItems: "flex-end", gap: 1 }}>
        <T v="row" w="semi">{a.to.score}/10</T>
        <T v="cap" w="medium" color={a.to.verdict === "block" ? "ink2" : "warning"}>{a.to.verdict === "block" ? "Blocked" : "Needs you"}</T>
      </View>
    </View>
  );
  return (
    <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={10} layout>
      {onPress ? <Press kind="row" onPress={onPress} haptics="light" accessibilityRole="button" accessibilityLabel={`Radar alert for ${a.name}, risk ${a.to.score} out of 10`}>{body}</Press> : body}
      {last ? null : <View style={{ height: 1, backgroundColor: c.line, marginLeft: 70 }} />}
    </Rise>
  );
}
