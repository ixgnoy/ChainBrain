// "Agent stopped" after the owner revoked the pocket: calm, the shared card grammar with the neutral lock disc, no shake.
import React from "react";
import { Button } from "../ui/kit";
import { T } from "../ui/Text";
import { View } from "react-native";
import { TxLink } from "./TxLink";
import { EventCard } from "./EventCard";

export function StoppedCard({ last, tx, canReturn, onReturn }: { last: string | null; tx?: string; canReturn: boolean; onReturn(): void }) {
  return (
    <EventCard
      tone="stopped" title="Agent stopped"
      body={`You revoked this pocket on-chain, so the agent can't spend from it. Last completed step: ${last ?? "none yet"}.`}
      why={tx ? { title: "Details", children: <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><T v="cap" color="muted">Revoke transaction</T><TxLink tx={tx} /></View> } : undefined}
    >
      {canReturn ? <Button label="Return funds to your wallet" small onPress={onReturn} /> : null}
    </EventCard>
  );
}
