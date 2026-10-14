// Inline failure note for sheets: a small SuccessMark kind="error" (its own haptic is off: the gesture that failed already fired
// the Error haptic) beside the plain sentence. Fades up 6 pt.
import React from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { c } from "../tokens";
import { SuccessMark } from "../ui/SuccessMark";
import { T } from "../ui/Text";

export function ErrorNote({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(220)} accessibilityLiveRegion="polite" style={{ backgroundColor: c.negativeSoft, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <SuccessMark kind="error" size={28} haptics={false} />
      <View style={{ flex: 1 }}><T v="sub" color="negative">{text}</T></View>
    </Animated.View>
  );
}
