// "Protected by ChainBrain": the four layers every payment passes (shared/sim/protect.ts), shown where the app used to show
// a worst-case figure. `ProtectedHead` is the title line (the sign sheet, the proof card); `ProtectedLayers` the four layers
// as tiles, each with its icon and what it does.
import React from "react";
import { View } from "react-native";
import { c, radius } from "../tokens";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { LAYERS, type LayerKey } from "../../../shared/sim/protect";

export const LAYER_ICON: Record<LayerKey, IconName> = { radar: "radar", preflight: "gauge", contract: "lock", sentinel: "eye" };

/** The title: a shield, "Protected by ChainBrain", and the four layer names under it. */
export function ProtectedHead({ size = 36, sub }: { size?: number; sub?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }} accessible accessibilityLabel={`Protected by ChainBrain: ${LAYERS.map((l) => l.name).join(", ")}`}>
      <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), backgroundColor: c.ink, alignItems: "center", justifyContent: "center" }}>
        <Icon name="shieldCheck" size={Math.round(size * 0.5)} color={c.white} stroke={2} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="head">Protected by ChainBrain</T>
        <T v="cap" color="muted" numberOfLines={1}>{sub ?? LAYERS.map((l) => l.name).join(" · ")}</T>
      </View>
    </View>
  );
}

/** The four layers as a 2 x 2 grid of tiles: icon, name, what it does. `tone` paints the tiles on a white card or the canvas. */
export function ProtectedLayers({ tone = "tile", short }: { tone?: "tile" | "card"; /** names only, no line (tight spaces) */ short?: boolean }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {LAYERS.map((l) => (
        <View key={l.key} accessible accessibilityLabel={`${l.name}: ${l.line}`}
          style={{ flexBasis: "47%", flexGrow: 1, borderRadius: radius.tile, backgroundColor: tone === "card" ? c.card : c.tile, padding: 12, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name={LAYER_ICON[l.key]} size={14} color={c.ink} stroke={2.2} />
            <T v="cap" w="bold">{l.name}</T>
            <View style={{ marginLeft: "auto" }}><Icon name="check" size={13} color={c.greenInk} stroke={2.6} /></View>
          </View>
          {short ? null : <T v="cap" color="muted" numberOfLines={2}>{l.line}</T>}
        </View>
      ))}
    </View>
  );
}
