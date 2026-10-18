// The haggler in the agent chat: the seller's first price, each offer and counter as a small price ladder, and the deal.
// Every number comes from the wallet's own negotiation events (shared/sim/haggle.ts on the built-in network, the server's
// counter_offer tool otherwise); the seller's agent only ever saw prices, so there is no seller text to show or clean.
import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { T } from "../ui/Text";
import { cleanText } from "../lib/sanitize";
import { money } from "../lib/util";
import type { HaggleStep, HaggleView } from "../lib/events";
import { EventCard } from "./EventCard";

const label = (s: HaggleStep, i: number) => (s.who === "you" ? "You" : i === 0 ? "Asked" : s.final ? "Final" : "They");
const spoken = (s: HaggleStep, i: number) => (s.who === "you" ? "you offered" : i === 0 ? "they asked" : s.final ? "their final" : "they countered");

function Rung({ s, i }: { s: HaggleStep; i: number }) {
  const you = s.who === "you";
  return (
    <View style={{ flex: 1, minWidth: 54, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 10, backgroundColor: you ? c.accentSoft : c.card, borderWidth: you ? 0 : 1, borderColor: c.line, gap: 1, alignItems: "center" }}>
      <T v="cap" color={you ? "accent" : "muted"} numberOfLines={1}>{label(s, i)}</T>
      <T v="cap" w="semi" color={you ? "accent" : i === 0 ? "muted" : "ink"} numberOfLines={1} adjustsFontSizeToFit style={i === 0 ? { textDecorationLine: "line-through" } : undefined}>{money(s.price)}</T>
    </View>
  );
}

export function HaggleCard({ h }: { h: HaggleView }) {
  const { sellerName } = useApp();
  const seller = cleanText(sellerName(h.sellerId), 30);
  const done = h.deal !== undefined;
  return (
    <EventCard
      tone={done ? "paid" : "waiting"}
      title={done ? `Negotiated with ${seller}` : `Negotiating with ${seller}`}
      amount={done ? money(h.deal!) : undefined}
      body={<T v="sub" color="muted" numberOfLines={2}>{done
        ? (h.saved && h.saved > 0n ? `From ${money(h.list)} to ${money(h.deal!)}: ${money(h.saved)} saved, numbers only` : "Deal at the seller's price")
        : `Haggling over ${money(h.list)}, numbers only`}</T>}
      why={{
        title: "How the haggling is kept safe",
        rows: [
          ["What the seller saw", "Prices only, never your details or any text"],
          ["Each offer", "Below the seller's price, never above its first quote or your task's limit"],
          ["Rounds", "3 offers at most, enforced by the wallet's code"],
          ["Paying", "The card pays exactly the agreed price; your ask-me limit still applies"],
        ],
      }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }} accessible
        accessibilityLabel={h.steps.map((s, i) => `${spoken(s, i)} ${money(s.price)}`).join(", ") + (done ? `. Deal at ${money(h.deal!)}` : "")}>
        {h.steps.map((s, i) => <Rung key={i} s={s} i={i} />)}
      </View>
    </EventCard>
  );
}
