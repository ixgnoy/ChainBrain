// ChainBrain's mark (VaultBank-style 2x2): four tiles, each walled off from the others like pockets. Hatch, vermillion, ink,
// hatch. `lock` plays the tiles flying in from apart and locking into place (the intro); Reduce Motion: they are just there.
// Same drawing as the app icon (assets/src/*.svg).
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, type SharedValue } from "react-native-reanimated";
import { c } from "../tokens";
import { Hatch } from "./Hatch";
import { useReduceMotion } from "./motion";

type Tile = { kind: "hatch" | "vermillion" | "ink"; from: [number, number, number] };
// top-left, top-right, bottom-left, bottom-right; `from`: where it flies in from (x, y in tiles, rotation)
const TILES: Tile[] = [
  { kind: "hatch", from: [-0.9, -0.6, -24] },
  { kind: "vermillion", from: [0.8, -0.9, 18] },
  { kind: "ink", from: [-0.7, 0.9, 14] },
  { kind: "hatch", from: [0.9, 0.7, -20] },
];

export function BrandMark({ size = 28, lock, delay = 0 }: { size?: number; lock?: boolean; delay?: number }) {
  const reduce = useReduceMotion();
  const gap = Math.max(2, Math.round(size * 0.08));
  const tile = (size - gap) / 2;
  const p = useSharedValue(lock && !reduce ? 0 : 1);
  useEffect(() => { if (lock && !reduce) p.value = withDelay(delay, withSpring(1, { duration: 900, dampingRatio: 0.72 })); }, [lock, reduce, delay, p]);
  return (
    <View accessibilityRole="image" accessibilityLabel="ChainBrain" style={{ width: size, height: size }}>
      {TILES.map((t, i) => (
        <TileView key={i} t={t} i={i} tile={tile} gap={gap} p={p} stagger={!!lock && !reduce} />
      ))}
    </View>
  );
}

function TileView({ t, i, tile, gap, p, stagger }: { t: Tile; i: number; tile: number; gap: number; p: SharedValue<number>; stagger: boolean }) {
  const x = (i % 2) * (tile + gap);
  const y = Math.floor(i / 2) * (tile + gap);
  const a = useAnimatedStyle(() => {
    // each tile lands a little after the one before it
    const k = stagger ? Math.max(0, Math.min(1, (p.value - i * 0.08) / (1 - 0.24))) : p.value;
    return {
      opacity: Math.min(1, k * 2),
      transform: [{ translateX: (1 - k) * t.from[0] * tile }, { translateY: (1 - k) * t.from[1] * tile }, { rotate: `${(1 - k) * t.from[2]}deg` }],
    };
  });
  const bg = t.kind === "vermillion" ? c.vermillion : t.kind === "ink" ? c.ink : "transparent";
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y, width: tile, height: tile, borderRadius: Math.max(1, tile * 0.08), backgroundColor: bg, overflow: "hidden" }, a]}>
      {t.kind === "hatch" ? <Hatch color={c.ink} pitch={Math.max(3, tile / 4)} stroke={Math.max(1, tile / 12)} /> : null}
    </Animated.View>
  );
}
