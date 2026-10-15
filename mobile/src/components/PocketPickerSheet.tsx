// "Which pocket?": the agent chat's pocket switch. Lives at the root with the other sheets, so it sits above the tab bar.
import React, { useState } from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Sheet } from "../ui/Sheet";
import { T } from "../ui/Text";
import { haptic } from "../haptics";
import { PocketRow } from "./PocketCard";
import { useAutoplayTarget } from "../lib/autoplayTargets";

export function PocketPickerSheet() {
  const { pickerOpen, setPickerOpen, pockets, setActive } = useApp();
  // the auto-play picks the row named `arg`: the row takes the press tint for a beat, then the same choice a tap makes
  const [lit, setLit] = useState<string | null>(null);
  useAutoplayTarget("picker.pocket", async (arg) => {
    const want = String(arg ?? "").toLowerCase();
    const p = pockets.find((x) => x.name.toLowerCase().includes(want)) ?? pockets[0];
    if (!p) return;
    setLit(p.address);
    await new Promise((r) => setTimeout(r, 650));
    setActive(p.address); setPickerOpen(false); haptic.select(); setLit(null);
  }, pickerOpen);
  return (
    <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 4 }}>
        <T v="section">Which pocket?</T>
        <T v="sub" color="ink2">Your agent only spends from the pocket you pick.</T>
      </View>
      <View style={{ marginHorizontal: 20, marginBottom: 12, borderRadius: 20, overflow: "hidden", backgroundColor: c.canvas }}>
        {pockets.map((p, i) => (
          <PocketRow key={p.address} pocket={p} last={i === pockets.length - 1} lit={lit === p.address} onPress={() => { setActive(p.address); setPickerOpen(false); haptic.select(); }} />
        ))}
      </View>
    </Sheet>
  );
}
