// Every owner transaction ends in a visible hash: TxDone is the confirmed card (hash + explorer link), TxNotice shows the
// latest one on the pocket page and in the agent chat until dismissed.
import React from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { c } from "../tokens";
import { useApp } from "../store";
import { Details, Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { useReduceMotion } from "../ui/motion";
import { sameAddr } from "../lib/events";
import { TxLink } from "./TxLink";

export function TxDone({ title, txs }: { title: string; txs: { label?: string; hash: string }[] }) {
  return (
    <View accessibilityLabel={`${title}. Confirmed on chain.`} style={{ backgroundColor: c.accentSoft, borderRadius: 20, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={14} color={c.onAccent} stroke={2.6} /></View>
        <View style={{ flex: 1, paddingRight: 28 }}><T v="row" w="semi" style={{ color: c.accent }}>{title}</T><T v="cap" color="ink2">Confirmed on chain</T></View>
      </View>
      {txs.map((t) => (
        <View key={t.hash} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {t.label ? <T v="cap" color="ink2">{t.label}</T> : <T v="cap" color="ink2">Transaction</T>}
          <TxLink tx={t.hash} />
        </View>
      ))}
    </View>
  );
}

/** The latest owner transaction as a compact, toast-like note that clears itself after 6 s (hashes are one tap away under Details). */
export function TxNotice({ pocket }: { pocket?: string }) {
  const { notice, setNotice } = useApp();
  const reduce = useReduceMotion();
  const key = notice ? notice.txs.map((t) => t.hash).join() : "";
  React.useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!notice || (pocket && notice.pocket && !sameAddr(notice.pocket, pocket))) return null;
  return (
    <Animated.View key={key} entering={reduce ? undefined : FadeInDown.duration(260).delay(60)} exiting={FadeOut.duration(160)} style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: c.card, borderRadius: 16, paddingLeft: 12, paddingRight: 4, paddingVertical: 4 }}>
      <View accessibilityLabel={`${notice.title}. Confirmed on chain.`} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={14} color={c.onAccent} stroke={2.6} /></View>
        <T v="sub" w="semi" numberOfLines={2} style={{ flex: 1 }}>{notice.title}</T>
        <Press haptics="select" kind="icon" onPress={() => setNotice(null)} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" size={16} color={c.ink2} />
        </Press>
      </View>
      <View style={{ paddingLeft: 34, paddingRight: 8 }}>
        <Details compact title="Details" rows={[]}>
          {notice.txs.map((t) => <View key={t.hash} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><T v="cap" color="muted">{t.label ?? "Transaction"}</T><TxLink tx={t.hash} /></View>)}
        </Details>
      </View>
    </Animated.View>
  );
}
