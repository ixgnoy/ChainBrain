// A transfer pushed past the agent straight to the token contract, refused by the pocket on-chain (scene 5's backstop).
// Same entrance as a refusal (shake once, Error haptic, tint settling), tap for the receipt.
import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { CodePill, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { money, shortHex } from "../lib/util";
import type { WalletEvent } from "../lib/events";
import { RefusalCard } from "./RefusalCard";

export function BlockedCard({ e }: { e: WalletEvent }) {
  const { ledger, setReceipt } = useApp();
  const row = ledger.find((r) => r.kind === "forced" && r.tx === e.tx);
  let amount = 0n;
  try { amount = BigInt(e.amount ?? 0); } catch { /* malformed: zero */ }
  if (!e.reverted) return null;
  return (
    <RefusalCard id={`forced:${e.tx}`}>
      <Press kind="row" haptics="select" onPress={() => row && setReceipt(row)} accessibilityRole="button" accessibilityLabel={`Blocked a transfer of ${money(amount)}. Open details`} style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="shield" size={16} color={c.negative} />
          <T v="sub" w="semi" color="negative" style={{ flex: 1 }}>Blocked a transfer of {money(amount)}</T>
        </View>
        <T v="sub" color="ink2">Someone used the agent's signature to send it to {shortHex(String(e.to ?? ""), 6, 4)}. That address is not on your list, so the pocket refused it on-chain. Nothing moved.</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CodePill code="REVERTED" />
          <T v="cap" color="muted">Tx {shortHex(String(e.tx ?? ""), 6, 4)}</T>
        </View>
      </Press>
    </RefusalCard>
  );
}
