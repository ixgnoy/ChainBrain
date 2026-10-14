// "Agent stopped" after the owner revoked the pocket: calm. A drawn X mark, one quiet entrance (fade + 8 pt rise, 260 ms), no shake.
import React from "react";
import { View } from "react-native";
import { c } from "../tokens";
import { Button } from "../ui/kit";
import { T } from "../ui/Text";
import { Rise } from "../ui/Rise";
import { StepMark } from "../ui/StepMark";
import { TxLink } from "./TxLink";

export function StoppedCard({ last, tx, canReturn, onReturn }: { last: string | null; tx?: string; canReturn: boolean; onReturn(): void }) {
  return (
    <Rise dy={8} duration={260} layout>
      <View style={{ padding: 16, borderRadius: 20, backgroundColor: c.negativeSoft, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <StepMark state="refused" size={22} />
          <T v="row" w="semi" color="negative">Agent stopped</T>
        </View>
        <T v="body" color="ink">You revoked this pocket on-chain, so the agent can't spend from it. Last completed step: {last ?? "none yet"}.</T>
        {tx ? <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><T v="cap" color="ink2">Revoke transaction</T><TxLink tx={tx} /></View> : null}
        {canReturn ? <Button label="Return funds to your wallet" small onPress={onReturn} /> : null}
      </View>
    </Rise>
  );
}
