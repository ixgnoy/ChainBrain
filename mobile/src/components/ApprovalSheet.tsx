// Owner approvals. Intent: confirm the fixed-template task card. Payment above the ask-me threshold: slide to co-sign the exact
// USDC TransferWithAuthorization the wallet built (POST /api/approvals/:id {approved, signature}).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { Avatar, Button, CodePill, Details } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import { authOf, authExpired, type Approval } from "../lib/events";
import { NEVER } from "../lib/shared";
import { parseUsd } from "../lib/shared";
import { usd, shortAddr } from "../lib/util";
import { c } from "../tokens";
import { IntentCard } from "./IntentCard";
import { SheetSuccess } from "./SheetSuccess";
import { ErrorNote } from "./ErrorNote";

export function describeApprovalError(code: string): string {
  switch (code) {
    case "OWNER_SIGNATURE_INVALID": return "The signature did not match this pocket's owner key, so nothing was approved. Approve it on the device that created this pocket.";
    case "NOT_PENDING": return "This request was already answered or has timed out.";
    case "NOT_OWNER": return "This phone's key does not own this pocket, so it cannot co-sign here.";
    case "AUTH_EXPIRED": return "The 10-minute approval window has passed. Ask your agent again.";
    case "NO_AUTH": return "This request is missing the details needed to sign it.";
    case "SIGN_FAILED": return "Could not sign on this phone. Try again.";
    case "NETWORK": return "Could not reach the server. Check the connection and try again.";
    default: return "Could not send your answer. Check the connection and try again.";
  }
}
const safeUsd = (s: unknown) => { try { return typeof s === "string" ? usd(parseUsd(s)) : null; } catch { return null; } };

export function ApprovalSheet() {
  const { pending, approvalOpen, setApprovalOpen } = useApp();
  const current = pending.find((a) => a.kind !== "question");
  const last = useRef<Approval | undefined>(current);
  if (current) last.current = current;
  const shown = current ?? last.current;
  // while the owner's signature is in flight (and the success moment plays) the sheet stays up even though the request is already answered
  const [hold, setHold] = useState(false);
  return (
    <Sheet visible={(approvalOpen && !!current) || hold} onClose={() => { setHold(false); setApprovalOpen(false); }}>
      {shown ? <Body key={shown.id} a={shown} queue={pending.filter((x) => x.kind !== "question").length} hold={setHold} /> : null}
    </Sheet>
  );
}

function Body({ a, queue, hold }: { a: Approval; queue: number; hold: (b: boolean) => void }) {
  const { findPocket, sellerName, answer, signApprove, wallet, setApprovalOpen, cfg } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"form" | "success">("form");
  const formH = useRef(0);
  const pocket = findPocket(a.pocket);
  const isPay = a.kind === "payment";
  const auth = useMemo(() => (isPay ? authOf(a) : null), [a, isPay]);
  const [expired, setExpired] = useState(auth ? authExpired(auth) : false);
  useEffect(() => {
    if (!auth) return;
    const t = setInterval(() => setExpired(authExpired(auth)), 1000);
    return () => clearInterval(t);
  }, [auth]);
  const owned = pocket ? pocket.owned : true;
  const seller = cleanText(sellerName(a.data?.sellerId), 60);
  const amount = safeUsd(a.data?.amount);
  const needsText = !pocket || pocket.askAbove === NEVER ? "Needs you because it is above your ask-me limit"
    : pocket.askAbove === 0n ? "Needs you because this pocket asks you about every payment"
    : `Needs you because it is above your US$${usd(pocket.askAbove)} ask-me limit`;

  const approve = async () => {
    setError(null);
    hold(true);
    const r = await signApprove(a);
    if (!r.ok) { hold(false); setError(describeApprovalError(r.error)); throw new Error(r.error); }
  };
  // the slide has shown its done state; swap to the success moment, then let the sheet go (about 900 ms of success on screen)
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => { hold(false); setApprovalOpen(false); }, 1000);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const decline = async () => {
    setBusy(true); setError(null);
    const r = await answer(a, false);
    setBusy(false);
    if (!r.ok && r.error !== "NOT_PENDING") setError(describeApprovalError(r.error)); else haptic.light();
  };
  const confirmIntent = async () => {
    setBusy(true); setError(null);
    const r = await answer(a, true);
    setBusy(false);
    if (!r.ok && r.error !== "NOT_PENDING") setError(describeApprovalError(r.error)); else haptic.success();
  };

  if (phase === "success") {
    return <SheetSuccess minHeight={formH.current} title={`Approved · paid US$${amount ?? "?"}`} sub={`To ${seller}${pocket ? ` from ${cleanText(pocket.name, 30)}` : ""}`} />;
  }
  return (
    <Animated.View style={{ flexShrink: 1 }} onLayout={(e) => { formH.current = e.nativeEvent.layout.height; }}>
      <SheetScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 20 }} showsVerticalScrollIndicator={false}>
        {isPay ? (
          <>
            <View style={{ alignItems: "center", gap: 6, paddingTop: 4 }}>
              <T v="row" w="semi" color="ink2">Approve payment?</T>
              <T v="balance" accessibilityLabel={`US$${amount ?? "unknown"}`}>US${amount ?? "?"}</T>
              <T v="sub" color="muted">{pocket ? `From ${cleanText(pocket.name, 30)}` : `From ${shortAddr(a.pocket)}`}{queue > 1 ? ` · ${queue - 1} more waiting` : ""}</T>
            </View>
            <View style={{ backgroundColor: c.canvas, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 16, padding: 16 }}>
              <Avatar label={seller} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="row" numberOfLines={1}>{seller}</T>
                <T v="sub" color="muted" numberOfLines={2}>{cleanText(cfg?.sellers.find((x) => x.id === a.data?.sellerId)?.items.find((i) => i.sku === a.data?.sku)?.description ?? a.data?.description, 120) || "Seller payment"}</T>
              </View>
            </View>
            {a.data?.intent ? <IntentCard text={a.data.intent} title="Task you confirmed" /> : null}
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: c.warningSoft, borderRadius: 16, padding: 14 }}>
              <Icon name="clock" size={18} color={c.warning} />
              <View style={{ flex: 1, gap: 6 }}><T v="sub" color="warning">{needsText}</T><CodePill code="NEEDS_OWNER_APPROVAL" tone="warning" /></View>
            </View>
            {a.text ? <View style={{ gap: 2 }}><T v="cap" color="muted">Your agent says</T><T v="body" color="ink2">{cleanText(a.text, 400)}</T></View> : null}
            <T v="cap" color="muted">Your signature approves this one payment for the next 10 minutes. No money leaves your main wallet.</T>
            <Details rows={[
              ["Pays to", auth ? shortAddr(auth.to) : "n/a"], ["Authorization", auth ? `${auth.nonce.slice(0, 10)}…` : "n/a"],
            ]} />
          </>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <T v="section">Confirm the task?</T>
              <T v="sub" color="muted">{pocket ? `${cleanText(pocket.name, 30)} pocket` : shortAddr(a.pocket)}{queue > 1 ? ` · ${queue - 1} more waiting` : ""}</T>
            </View>
            <IntentCard text={a.text} />
          </>
        )}
        {expired && isPay ? <T v="sub" color="warning">The 10-minute window passed. The agent will ask again if it still wants this.</T> : null}
        {error ? <ErrorNote text={error} /> : null}
      </SheetScroll>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
        {isPay ? (
          owned && wallet ? (
            <>
              <SlideToConfirm key={a.id + (error ?? "")} label="Slide to approve" doneLabel="Approved" onConfirm={approve} onDone={() => setPhase("success")} disabled={busy || expired} />
              <Button label="Decline" kind="text" onPress={decline} loading={busy} />
            </>
          ) : (
            <>
              <T v="sub" color="ink2" style={{ textAlign: "center" }}>Another key owns this pocket. Approve it on the device that created the pocket.</T>
              <Button label="Close" kind="secondary" onPress={() => setApprovalOpen(false)} />
            </>
          )
        ) : (
          <>
            <Button label="Confirm task" onPress={confirmIntent} loading={busy} />
            <Button label="Decline" kind="text" onPress={decline} disabled={busy} />
          </>
        )}
      </View>
    </Animated.View>
  );
}
