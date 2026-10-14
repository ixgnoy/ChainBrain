import React from "react";
import { Linking, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { c } from "../tokens";
import { Press } from "./../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { haptic } from "../haptics";
import { txUrl } from "../lib/runtime";
import { shortHex } from "../lib/util";
import { useApp } from "../store";

/** Shortened hash with copy; only used inside a "Details" area. The BaseScan link is off on the local test network. */
export function TxLink({ tx }: { tx: string }) {
  const { dev } = useApp();
  const [copied, setCopied] = React.useState(false);
  const url = dev ? undefined : txUrl(tx);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <Press haptics="select" onPress={async () => { await Clipboard.setStringAsync(tx); setCopied(true); haptic.success(); setTimeout(() => setCopied(false), 1400); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 }} accessibilityLabel="Copy transaction hash">
        <T v="cap" color="ink2">{shortHex(tx, 8, 6)}</T>
        <Icon name={copied ? "check" : "copy"} size={14} color={copied ? c.accent : c.muted} />
      </Press>
      {url ? <Press haptics="select" onPress={() => Linking.openURL(url)} style={{ minHeight: 36, justifyContent: "center" }} accessibilityLabel="Open on BaseScan"><T v="cap" w="semi" color="accent">View on BaseScan</T></Press> : null}
    </View>
  );
}
