import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, lift } from "../tokens";
import { setToastSink } from "../lib/toast";
import { T } from "./Text";

/** One quiet toast at a time, auto-hides after 2.4 s. Mount once at the root. */
export function ToastHost() {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const insets = useSafeAreaInsets();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setToastSink((text) => {
      setMsg({ id: Date.now(), text });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), 2400);
    });
    return () => setToastSink(null);
  }, []);
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 20, right: 20, bottom: insets.bottom + 100, alignItems: "center", zIndex: 90 }}>
      <Animated.View key={msg.id} entering={FadeInDown.duration(160)} exiting={FadeOut.duration(160)} accessibilityLiveRegion="polite" style={{ backgroundColor: c.ink, borderRadius: 9999, paddingHorizontal: 20, paddingVertical: 12, ...lift }}>
        <T v="sub" w="medium" style={{ color: c.onAccent }}>{msg.text}</T>
      </Animated.View>
    </View>
  );
}
