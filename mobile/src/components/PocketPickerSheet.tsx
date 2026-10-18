// "Which pocket?": the ChainBrain chat's pocket switch. Only the built-in agent's pockets are listed: a pocket keeps the agent
// it was made for, so Claude's or ChatGPT's pockets are never the chat's. Lives at the root with the other sheets.
import React, { useState } from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Sheet } from "../ui/Sheet";
import { T } from "../ui/Text";
import { haptic } from "../haptics";
import { PocketRow } from "./PocketCard";
import { autoplayAlive, autoplayRun, useAutoplayTarget } from "../lib/autoplayTargets";

export function PocketPickerSheet() {
  const { pickerOpen, setPickerOpen, pockets, setActive } = useApp();
  // the auto-play picks the row named `arg`: the row takes the press tint for a beat, then the same choice a tap makes
  const [lit, setLit] = useState<string | null>(null);
  const choices = pockets.filter((p) => (p.agentId ?? "chainbrain") === "chainbrain");
  useAutoplayTarget("picker.pocket", async (arg) => {
    const want = String(arg ?? "").toLowerCase();
    // an exact name first, then a pocket that can still pay ("Research data", not the revoked "Research data · 16 Oct")
    const live = choices.filter((x) => !x.revoked);
    const named = (xs: typeof choices) => xs.find((x) => x.name.toLowerCase() === want) ?? xs.find((x) => x.name.toLowerCase().includes(want));
    const p = named(live) ?? named(choices) ?? choices[0];
    if (!p) return false;
    const run = autoplayRun();
    setLit(p.address);
    await new Promise((r) => setTimeout(r, 650));
    if (!autoplayAlive(run)) { setLit(null); return false; }
    setActive(p.address); setPickerOpen(false); haptic.select(); setLit(null);
  }, pickerOpen);
  return (
    <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 4 }}>
        <T v="section">Which card?</T>
        <T v="sub" color="ink2">ChainBrain only spends from the card you pick. Cards you gave Claude or ChatGPT stay theirs.</T>
      </View>
      <View style={{ marginHorizontal: 20, marginBottom: 12, borderRadius: 20, overflow: "hidden", backgroundColor: c.fill }}>
        {choices.map((p, i) => (
          <PocketRow key={p.address} pocket={p} last={i === choices.length - 1} lit={lit === p.address} onPress={() => { setActive(p.address); setPickerOpen(false); haptic.select(); }} />
        ))}
      </View>
    </Sheet>
  );
}
