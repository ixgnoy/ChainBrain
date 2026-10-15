// The pocket card's material on web: the Skia shader (CardMaterial.native.tsx) needs CanvasKit, so the web build gets the same
// light as a CSS gradient: a soft top light and a still specular band. No grain.
import React from "react";
import { StyleSheet, View } from "react-native";

export function CardMaterial({ dark }: { width: number; height: number; dark: boolean }) {
  const a = dark ? 0.12 : 0.16;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, {
      backgroundImage: `linear-gradient(180deg, rgba(255,255,255,${dark ? 0.08 : 0.05}) 0%, rgba(255,255,255,0) 55%), linear-gradient(118deg, rgba(255,255,255,0) 30%, rgba(255,255,255,${a}) 42%, rgba(255,255,255,0) 54%)`,
    } as object]} />
  );
}
