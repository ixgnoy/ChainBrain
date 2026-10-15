// An agent's face: the official mark on a white squircle (Claude's Spark in clay, OpenAI's Blossom in black), or ChainBrain's
// own mark (white brain on ink). Marks are drawn unaltered from shared/brand/marks.ts, at avatar size only (brand rules).
import React from "react";
import { View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { CLAUDE_SPARK, OPENAI_BLOSSOM, type Mark } from "../../../shared/brand/marks";
import { c, hairline } from "../tokens";
import { Icon } from "./Icon";
import { T } from "./Text";

export type AgentKind = "chainbrain" | "claude" | "chatgpt";

function MarkSvg({ mark, size }: { mark: Mark; size: number }) {
  return (
    <Svg width={size} height={size} viewBox={mark.viewBox}>
      {mark.paths.map((d, i) => <Path key={i} d={d} fill={mark.fill} fillRule={mark.fillRule} />)}
    </Svg>
  );
}

/** `size` is the squircle; the mark sits at about 55 %. `badge` adds a small dot (status) at the bottom right. */
export function AgentAvatar({ kind, size = 44, badge, label }: { kind: AgentKind | string; size?: number; badge?: string; label?: string }) {
  const r = Math.round(size * 0.3);
  const box: ViewStyle = { width: size, height: size, borderRadius: r, borderCurve: "continuous", alignItems: "center", justifyContent: "center" } as ViewStyle;
  let face: React.ReactNode;
  if (kind === "claude") face = <View style={[box, { backgroundColor: c.white, borderWidth: 1, borderColor: hairline }]}><MarkSvg mark={CLAUDE_SPARK} size={Math.round(size * 0.56)} /></View>;
  else if (kind === "chatgpt") face = <View style={[box, { backgroundColor: c.white, borderWidth: 1, borderColor: hairline }]}><MarkSvg mark={OPENAI_BLOSSOM} size={Math.round(size * 0.66)} /></View>;
  else if (kind === "chainbrain") face = <View style={[box, { backgroundColor: c.ink }]}><Icon name="brain" size={Math.round(size * 0.5)} color={c.white} stroke={2} /></View>;
  else face = <View style={[box, { backgroundColor: c.fill }]}><T v="row" w="bold" style={{ fontSize: Math.round(size * 0.4) }}>{(label ?? kind).slice(0, 1).toUpperCase()}</T></View>;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {face}
      {badge ? <View style={{ position: "absolute", right: -3, bottom: -3, width: Math.max(12, size * 0.3), height: Math.max(12, size * 0.3), borderRadius: 99, backgroundColor: badge, borderWidth: 2.5, borderColor: c.card }} /> : null}
    </View>
  );
}

/** A small inline chip naming an agent ("ChainBrain", "Claude"): used on activity rows and pocket cards. */
export function AgentChip({ kind, name, onDark }: { kind: AgentKind | string; name: string; onDark?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 22, paddingLeft: 3, paddingRight: 8, borderRadius: 11, backgroundColor: onDark ? "rgba(255,255,255,0.14)" : c.fill, alignSelf: "flex-start" }}>
      <AgentAvatar kind={kind} size={16} />
      <T v="cap" w="semi" style={{ fontSize: 11, lineHeight: 14, color: onDark ? c.white : c.ink2 }}>{name}</T>
    </View>
  );
}
