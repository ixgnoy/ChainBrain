import React from "react";
import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { c } from "../tokens";
import { Press } from "./../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { haptic } from "../haptics";
import { shortHex } from "../lib/util";
import { useApp } from "../store";

/** A transaction hash. Tapping it opens the in-app ChainBrain explorer sheet (never BaseScan: that is a button inside the sheet,
 *  and only against a real public-chain server); the small copy button beside it copies the full hash. */
export function TxLink({ tx, inline }: { tx: string; /** already inside the explorer: copy only */ inline?: boolean }) {
  const { setExplorerTx } = useApp();
  const [copied, setCopied] = React.useState(false);
  const copy = async () => { await Clipboard.setStringAsync(tx); setCopied(true); haptic.success(); setTimeout(() => setCopied(false), 1400); };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
      {inline ? <T v="cap" color="ink2">{shortHex(tx, 8, 6)}</T> : (
        <Press haptics="select" onPress={() => setExplorerTx(tx)} accessibilityRole="button" accessibilityLabel={`Open transaction ${shortHex(tx, 8, 6)}`} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36 }}>
          <T v="cap" w="semi" color="accent">{shortHex(tx, 8, 6)}</T>
          <Icon name="chevronRight" size={14} color={c.accent} />
        </Press>
      )}
      <Press haptics="select" onPress={copy} hitSlop={6} accessibilityRole="button" accessibilityLabel="Copy transaction hash" style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
        <Icon name={copied ? "check" : "copy"} size={14} color={copied ? c.accent : c.muted} />
      </Press>
    </View>
  );
}
