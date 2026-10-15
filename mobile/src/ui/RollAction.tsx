// A quick action (older name "round button"): now a Neo-Kinetic tile (kit Tile), white with a stroke, powder blue for a
// utility action, soft vermillion for a destructive one. Press kind="round" with a Medium haptic.
import React from "react";
import type { TargetName } from "../lib/autoplayTargets";
import { Tile } from "./kit";
import type { IconName } from "./Icon";

export function RoundButton({ icon, label, onPress, soft, danger, a11y, auto }: { icon: IconName; label: string; onPress: () => void; soft?: boolean; /** destructive (Revoke) */ danger?: boolean; a11y?: string; auto?: TargetName }) {
  return <Tile icon={icon} label={label} onPress={onPress} tone={danger ? "danger" : soft ? "blue" : "white"} a11y={a11y} auto={auto} />;
}
