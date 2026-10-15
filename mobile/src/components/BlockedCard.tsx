// A transfer pushed past the agent straight to the token contract, refused by the pocket on-chain (scene 5's backstop).
// Same card grammar as every event; the shake plays once, a tap opens the receipt, the code and hash sit under "Why".
import React from "react";
import { useApp } from "../store";
import { money, shortHex } from "../lib/util";
import type { WalletEvent } from "../lib/events";
import { EventCard } from "./EventCard";

export function BlockedCard({ e }: { e: WalletEvent }) {
  const { ledger, setReceipt } = useApp();
  const row = ledger.find((r) => r.kind === "forced" && r.tx === e.tx);
  let amount = 0n;
  try { amount = BigInt(e.amount ?? 0); } catch { /* malformed: zero */ }
  if (!e.reverted) return null;
  return (
    <EventCard
      tone="blocked" alert={`forced:${e.tx}`} title={`Blocked a transfer of ${money(amount)}`}
      body={`Someone used the agent's signature to send it to ${shortHex(String(e.to ?? ""), 6, 4)}. That address is not on your list, so the pocket refused it on-chain. Nothing moved.`}
      onPress={() => row && setReceipt(row)} a11y={`Blocked a transfer of ${money(amount)}. Open details`}
      why={{ codes: ["REVERTED"], rows: [["Transaction", shortHex(String(e.tx ?? ""), 6, 4)]] }}
    />
  );
}
