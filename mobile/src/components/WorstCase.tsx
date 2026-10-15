// The product's one sentence, made visible (Stitch pocket detail "Worst Case Loss Limit"): what a hijacked agent could lose right
// now (the pocket balance, only to the sellers you allowed), the main wallet's exposure (none: the agent's key can't reach it),
// and a hatch bar of spent against what is left, which does not move when a payment is refused or a forced transfer reverts.
import React, { useMemo } from "react";
import { View } from "react-native";
import { useApp, type Pocket } from "../store";
import { c, radius } from "../tokens";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { HatchBar } from "../ui/Hatch";
import { worstCase } from "../lib/plain";
import { money, sameAddr } from "../lib/util";

export function WorstCase({ pocket, sellers, off }: { pocket: Pocket; sellers: string[]; off: boolean }) {
  const { ledger } = useApp();
  const { funded, spent, blocked } = useMemo(() => {
    const mine = ledger.filter((r) => sameAddr(r.pocket, pocket.address));
    const sum = (f: (r: (typeof mine)[number]) => boolean) => mine.filter(f).reduce((n, r) => n + (r.amount ?? 0n), 0n);
    // owner rows are trimmed on the phone: funded is never below what the balance and payments prove
    const spent = sum((r) => r.kind === "payment");
    const fundedRows = sum((r) => r.kind === "owner" && r.ownerKind === "fund");
    const returned = sum((r) => r.kind === "owner" && r.ownerKind === "return");
    return { spent, funded: (() => { const known = pocket.balance + spent; const rows = fundedRows - returned; return rows > known ? rows : known; })(), blocked: mine.filter((r) => r.kind === "forced" || r.kind === "refusal").length };
  }, [ledger, pocket.address, pocket.balance]);
  const used = funded > 0n ? Math.min(1, Number(spent) / Number(funded)) : 0;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.vermillionSoft, alignItems: "center", justifyContent: "center" }}><Icon name="shieldCheck" size={20} color={c.vermillionInk} stroke={2} /></View>
        <View style={{ flex: 1 }}>
          <T v="head">Worst case</T>
          <T v="cap" color="muted">If this pocket's agent is hijacked</T>
        </View>
        {blocked ? <View style={{ height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: c.fill, justifyContent: "center" }}><T v="cap" w="bold">{`${blocked} blocked`}</T></View> : null}
      </View>
      <View style={{ borderRadius: radius.tile, backgroundColor: c.fill, padding: 14, gap: 12 }}>
        <T v="body" accessibilityLabel="Worst case" style={{ fontSize: 15, lineHeight: 22 }}>{worstCase(pocket.balance, sellers, off)}</T>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T v="sub" color="ink2">Main wallet exposure</T>
          <T v="head">US$0.00</T>
        </View>
      </View>
      {!off ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <T v="cap" color="ink2">{`Spent: ${money(spent)}`}</T>
            <T v="cap" w="bold">{`Left: ${money(pocket.balance)}`}</T>
          </View>
          <HatchBar value={used} tone={c.vermillion} height={18} label={`${money(spent)} spent of ${money(funded)}`} />
          <T v="cap" color="muted">{`${Math.round(used * 100)}% of ${money(funded)} spent${blocked ? " · US$0.00 lost to refused attempts" : ""}`}</T>
        </View>
      ) : null}
    </View>
  );
}
