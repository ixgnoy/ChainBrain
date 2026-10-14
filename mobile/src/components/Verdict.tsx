import React from "react";
import { View } from "react-native";
import { Chip, ReasonChip } from "../ui/primitives";
import type { LedgerRow } from "../lib/events";

/** Verdict chip + reason-code chips for a ledger row. */
export function RowVerdict({ row }: { row: LedgerRow }) {
  const label = row.kind === "disclosure" ? "Refused" : row.kind === "blocked" ? "Blocked" : row.kind === "intent" ? (row.outcome === "approved" ? "Confirmed" : "Declined")
    : row.outcome === "paid" ? (row.cosigned ? "Paid, co-signed" : "Paid") : row.outcome === "refused" ? "Refused" : row.outcome === "pending" ? "Needs you" : row.outcome === "approved" ? "Approved" : row.outcome === "declined" ? "Declined" : "Info";
  const kind = row.outcome === "paid" || row.outcome === "approved" ? "ok" : row.outcome === "refused" || row.outcome === "declined" ? "refused" : row.outcome === "pending" ? "stepup" : "info";
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <Chip kind={kind} label={label} />
      {row.reasons.slice(0, 2).map((r) => <ReasonChip key={r} code={r} tone={row.outcome === "pending" ? "stepup" : "refused"} />)}
    </View>
  );
}
