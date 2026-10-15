// Home's pockets as a stack of printed cards (Apple Wallet idea): each card overlaps the one before it so every header shows;
// the newest sits fully visible at the bottom. Tapping one measures it and hands off to the pocket page (ui/cardFlight.ts).
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { router, useIsFocused } from "expo-router";
import { Press } from "../ui/kit";
import { Reveal } from "../ui/Reveal";
import { startFlight, useFlight } from "../ui/cardFlight";
import { useApp } from "../store";
import { usd } from "../lib/util";
import { cleanText } from "../lib/sanitize";
import type { Pocket } from "../store";
import { PocketFace, cardHeight, toneFor } from "./PocketFace";

export function PocketStack({ pockets, play }: { pockets: Pocket[]; play: boolean }) {
  const [w, setW] = useState(0);
  const flight = useFlight();
  const n = pockets.length;
  const strip = 64; // about 64 px of every card behind the front one stays visible
  const focused = useIsFocused();
  const cw = Math.max(w - 40, 0);
  const h = cardHeight(cw);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: cw ? (n - 1) * strip + h : 0 }}>
      {cw ? pockets.map((p, i) => (
        <Card key={p.address} pocket={p} i={i} top={i * strip} cw={cw} play={play} focused={focused} behind={n - 1 - i} tone={toneFor(pockets, p.address)} hidden={flight?.pocket === p.address.toLowerCase()} />
      )) : null}
    </View>
  );
}

function Card({ pocket, i, top, cw, play, tone, hidden, focused, behind }: { pocket: Pocket; i: number; top: number; cw: number; play: boolean; tone: "navy" | "teal"; hidden: boolean; focused: boolean; behind: number }) {
  const ref = useRef<View>(null);
  const { findPocket } = useApp();
  const open = () => {
    const go = (x: number, y: number, w: number, h: number) => {
      if (!findPocket(pocket.address)) { router.push({ pathname: "/pocket/[id]", params: { id: pocket.address } }); return; }
      startFlight(pocket.address, { x, y, w, h }, tone);
      router.push({ pathname: "/pocket/[id]", params: { id: pocket.address } });
    };
    if (ref.current) ref.current.measureInWindow(go); else router.push({ pathname: "/pocket/[id]", params: { id: pocket.address } });
  };
  return (
    <Reveal play={play} index={i} step={70} dy={22} hidden={hidden} style={{ position: "absolute", left: 20, top, zIndex: i }}>
      <View ref={ref} collapsable={false}>
        <Press kind="row" haptics="light" onPress={open} accessibilityRole="button" accessibilityLabel={`${cleanText(pocket.name, 30)} pocket, ${usd(pocket.balance)} USDC${pocket.revoked ? ", revoked" : ""}`}>
          {/* the fan reads as physical: each card behind the front one is a touch smaller (measured from the unscaled box above) */}
          <View style={{ transform: [{ scale: Math.max(0.9, 1 - 0.022 * behind) }] }}>
            <PocketFace pocket={pocket} width={cw} tone={tone} shadow={i > 0} focused={focused} />
          </View>
        </Press>
      </View>
    </Reveal>
  );
}
