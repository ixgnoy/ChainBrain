// Every owner transaction ends in a visible hash: TxDone is the confirmed card (hash + explorer link), TxNotice shows the
// latest one on the pocket page and in the agent chat until dismissed.
import React from "react";
import { View } from "react-native";
import { c } from "../tokens";
import { useApp } from "../store";
import { Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
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

export function TxNotice({ pocket }: { pocket?: string }) {
  const { notice, setNotice } = useApp();
  if (!notice || (pocket && notice.pocket && !sameAddr(notice.pocket, pocket))) return null;
  return (
    <View style={{ marginHorizontal: 20, marginTop: 16 }}>
      <TxDone title={notice.title} txs={notice.txs} />
      <Press haptics="select" onPress={() => setNotice(null)} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8} style={{ position: "absolute", top: 8, right: 8, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
        <Icon name="x" size={16} color={c.ink2} />
      </Press>
    </View>
  );
}
