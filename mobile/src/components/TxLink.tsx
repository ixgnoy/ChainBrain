import React from "react";
import { Linking, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../theme";
import { Press } from "../ui/primitives";
import { T, Mono } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { haptic } from "../haptics";
import { txUrl } from "../lib/runtime";
import { shortHex } from "../lib/util";
import { useApp } from "../store";

/** Short hash with copy. The BaseScan link is replaced by plain text in dev mode (fork hashes are not on Base Sepolia). */
export function TxLink({ tx }: { tx: string }) {
  const { c } = useTheme();
  const { dev } = useApp();
  const [copied, setCopied] = React.useState(false);
  const url = dev ? undefined : txUrl(tx);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <Press haptics="select" onPress={async () => { await Clipboard.setStringAsync(tx); setCopied(true); haptic.success(); setTimeout(() => setCopied(false), 1400); }} style={{ flexDirection: "row", alignItems: "center", gap: 5, minHeight: 44 }} accessibilityLabel="Copy transaction hash">
        <Mono size={12} color="text2">{shortHex(tx, 8, 6)}</Mono>
        <Icon name={copied ? "check" : "copy"} size={13} color={copied ? c.ok : c.text3} />
      </Press>
      {url ? (
        <Press haptics="select" onPress={() => Linking.openURL(url)} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 }} accessibilityLabel="Open on BaseScan">
          <T v="caption" color="accentInk" weight="semi">BaseScan</T>
          <Icon name="external" size={12} color={c.accentInk} />
        </Press>
      ) : <T v="caption" color="text3">local fork, no explorer</T>}
    </View>
  );
}
