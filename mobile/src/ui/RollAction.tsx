// Round action under a balance (64 px disc + label): Press kind="round" (0.94, spring release) with a Medium haptic.
import React from "react";
import { View } from "react-native";
import { c } from "../tokens";
import { Press } from "./kit";
import { Icon, type IconName } from "./Icon";
import { T } from "./Text";

export function RoundButton({ icon, label, onPress, soft, danger, a11y }: { icon: IconName; label: string; onPress: () => void; soft?: boolean; /** destructive (Revoke): negative tint */ danger?: boolean; a11y?: string }) {
  const bg = danger ? c.fill : soft ? c.accentSoft : c.accent;
  const fg = danger ? c.negative : /* neutral soft disc, red icon only */ soft ? c.accent : c.onAccent;
  return (
    <Press kind="round" haptics="medium" onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} style={{ alignItems: "center", gap: 8, flex: 1, paddingHorizontal: 2 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={26} color={fg} />
      </View>
      <T v="cap" w="medium" color="ink2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ textAlign: "center", fontSize: 13 }}>{label}</T>
    </Press>
  );
}
