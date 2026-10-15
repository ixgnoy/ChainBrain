// Home's pockets as a stack of printed cards (Apple Wallet idea): each card overlaps the one before it so every header shows;
// the newest sits fully visible at the bottom. Tapping one measures it and hands off to the pocket page (ui/cardFlight.ts).
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Press } from "../ui/kit";
import { Reveal } from "../ui/Reveal";
import { startFlight, useFlight } from "../ui/cardFlight";
import { usd } from "../lib/util";
import { cleanText } from "../lib/sanitize";
import type { Pocket } from "../store";
import { PocketFace, cardHeight, toneFor } from "./PocketFace";

export function PocketStack({ pockets, play }: { pockets: Pocket[]; play: boolean }) {
  const [w, setW] = useState(0);
  const flight = useFlight();
  const n = pockets.length;
  const strip = n > 4 ? 60 : 72;
  const cw = Math.max(w - 40, 0);
  const h = cardHeight(cw);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: cw ? (n - 1) * strip + h : 0 }}>
      {cw ? pockets.map((p, i) => (
        <Card key={p.address} pocket={p} i={i} top={i * strip} cw={cw} play={play} tone={toneFor(pockets, p.address)} hidden={flight?.pocket === p.address.toLowerCase()} />
      )) : null}
    </View>
  );
}

function Card({ pocket, i, top, cw, play, tone, hidden }: { pocket: Pocket; i: number; top: number; cw: number; play: boolean; tone: "navy" | "teal"; hidden: boolean }) {
  const ref = useRef<View>(null);
  const open = () => {
    const go = (x: number, y: number, w: number, h: number) => {
      startFlight(pocket.address, { x, y, w, h }, tone);
      router.push({ pathname: "/pocket/[id]", params: { id: pocket.address } });
    };
    if (ref.current) ref.current.measureInWindow(go); else router.push({ pathname: "/pocket/[id]", params: { id: pocket.address } });
  };
  return (
    <Reveal play={play} index={i} step={70} dy={22} style={{ position: "absolute", left: 20, top, opacity: hidden ? 0 : 1, zIndex: i }}>
      <View ref={ref} collapsable={false}>
        <Press kind="row" haptics="light" onPress={open} accessibilityRole="button" accessibilityLabel={`${cleanText(pocket.name, 30)} pocket, ${usd(pocket.balance)} USDC${pocket.revoked ? ", revoked" : ""}`}>
          <PocketFace pocket={pocket} width={cw} tone={tone} shadow={i > 0} />
        </Press>
      </View>
    </Reveal>
  );
}
