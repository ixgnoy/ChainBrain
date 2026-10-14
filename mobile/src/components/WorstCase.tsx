// The product's one sentence, made visible: what a hijacked agent could lose right now (the pocket balance, only to the
// sellers you allowed), with a bar that shrinks as the agent spends and does not move when a payment is refused or a
// forced transfer reverts. Width springs on change (smooth); reduced motion jumps.
import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useApp, type Pocket } from "../store";
import { c, motion } from "../tokens";
import { T } from "../ui/Text";
import { settle, useReduceMotion } from "../ui/motion";
import { worstCase } from "../lib/plain";
import { money, sameAddr } from "../lib/util";

export function WorstCase({ pocket, sellers, off }: { pocket: Pocket; sellers: string[]; off: boolean }) {
  const { ledger } = useApp();
  const reduce = useReduceMotion();
  const { funded, spent, blocked } = useMemo(() => {
    const mine = ledger.filter((r) => sameAddr(r.pocket, pocket.address));
    const sum = (f: (r: (typeof mine)[number]) => boolean) => mine.filter(f).reduce((n, r) => n + (r.amount ?? 0n), 0n);
    const spent = sum((r) => r.kind === "payment");
    const fundedRows = sum((r) => r.kind === "owner" && r.ownerKind === "fund");
    const returned = sum((r) => r.kind === "owner" && r.ownerKind === "return");
    return { spent, funded: fundedRows > 0n ? fundedRows - returned : pocket.balance + spent, blocked: mine.filter((r) => r.kind === "forced" || r.kind === "refusal" || r.kind === "blocked").length };
  }, [ledger, pocket.address, pocket.balance]);
  const share = funded > 0n ? Math.min(1, Number((pocket.balance * 1000n) / funded) / 1000) : 0;
  const w = useSharedValue(share);
  useEffect(() => { settle(w, share, reduce, motion.spring.smooth); }, [share, reduce, w]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.max(0, w.value) * 100}%` }));
  return (
    <View style={{ gap: 10 }}>
      <T v="cap" w="semi" color="muted">Worst case</T>
      <T v="body" accessibilityLabel="Worst case">{worstCase(pocket.balance, sellers, off)}</T>
      {!off ? (
        <>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fill, overflow: "hidden" }} accessibilityLabel={`At risk ${money(pocket.balance)} of ${money(funded)}`}>
            <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: c.accent }, bar]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <T v="cap" color="ink2">{money(spent)} spent of {money(funded)}</T>
            <T v="cap" color="muted">{blocked ? `${blocked} blocked · US$0.00 lost` : "Nothing blocked yet"}</T>
          </View>
        </>
      ) : null}
    </View>
  );
}
