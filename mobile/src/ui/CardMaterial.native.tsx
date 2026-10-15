// The pocket card's material (iOS / Android): a Skia runtime shader over the face colour. Fine grain so the face reads as
// printed plastic, a soft light from the top edge, and a specular band whose position follows the phone's tilt. It sits
// under the card's text (which stays native, sharp and readable by VoiceOver). Web: CardMaterial.tsx (a CSS gradient).
import React from "react";
import { StyleSheet } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { useTilt } from "./tilt";

const source = Skia.RuntimeEffect.Make(`
uniform float2 size;
uniform float2 tilt;
uniform float dark;

half4 main(float2 p) {
  float2 uv = p / size;
  // grain: one value per half point, centred on 0
  float n = fract(sin(dot(floor(p * 2.0), float2(12.9898, 78.233))) * 43758.5453) - 0.5;
  float g = n * mix(0.06, 0.09, dark);
  // light from the top edge
  float top = (1.0 - uv.y) * mix(0.05, 0.08, dark);
  // the specular band: a diagonal that slides with the tilt
  float d = uv.x * 0.78 + uv.y * 0.62;
  float centre = 0.42 + tilt.x * 0.38 - tilt.y * 0.22;
  float band = exp(-pow((d - centre) / 0.16, 2.0)) * mix(0.16, 0.12, dark);
  float white = clamp(top + band + max(g, 0.0), 0.0, 1.0);
  float black = max(-g, 0.0);
  // premultiplied: white at its alpha, black underneath
  return half4(half3(white), white + black * (1.0 - white));
}`)!;

export function CardMaterial({ width, height, dark }: { width: number; height: number; dark: boolean }) {
  const t = useTilt();
  const uniforms = useDerivedValue(() => ({ size: [width, height], tilt: [t.x.value, t.y.value], dark: dark ? 1 : 0 }));
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
