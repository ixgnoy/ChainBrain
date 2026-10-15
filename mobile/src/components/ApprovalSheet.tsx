// Owner approvals. Intent: confirm the fixed-template task card. Payment above the ask-me threshold: slide to co-sign the exact
// USDC TransferWithAuthorization the wallet built (POST /api/approvals/:id {approved, signature}).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import Animated from "react-native-reanimated";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { Avatar, Button, Details, SummaryCard } from "../ui/kit";
import { T } from "../ui/Text";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import { authOf, authExpired, sameAddr, radarBody, type Approval } from "../lib/events";
import { c } from "../tokens";
import { Icon } from "../ui/Icon";
import { ScoreBar } from "./RadarCard";
import { NEVER } from "../lib/shared";
import { parseUsd } from "../lib/shared";
import { usd, shortAddr } from "../lib/util";
import { IntentCard, parseIntent } from "./IntentCard";
import { SheetSuccess } from "./SheetSuccess";
import { ErrorNote } from "./ErrorNote";

export function describeApprovalError(code: string): string {
  switch (code) {
    case "OWNER_SIGNATURE_INVALID": return "The signature did not match this pocket's owner key, so nothing was approved. Approve it on the device that created this pocket.";
    case "NOT_PENDING": return "This request was already answered or has timed out.";
    case "NOT_OWNER": return "This phone's key does not own this pocket, so it cannot co-sign here.";
    case "AUTH_EXPIRED": return "The 10-minute approval window has passed. Ask your agent again.";
    case "NO_AUTH": return "This request is missing the details needed to sign it.";
    case "AUTH_WRONG_POCKET":
    case "AUTH_WRONG_SELLER":
    case "AUTH_WRONG_AMOUNT": return "This request doesn't match what you're approving (pocket, seller or amount), so nothing was signed.";
    case "SIGN_FAILED": return "Could not sign on this phone. Try again.";
    case "NETWORK": return "Could not reach the server. Check the connection and try again.";
    default: return "Could not send your answer. Check the connection and try again.";
  }
}
const safeUsd = (s: unknown) => { try { return typeof s === "string" ? usd(parseUsd(s)) : null; } catch { return null; } };

export function ApprovalSheet() {
  const { pending, approvalOpen, setApprovalOpen, approvalFocus } = useApp();
  const current = pending.find((a) => a.id === approvalFocus) ?? pending.find((a) => a.kind !== "question" && (a.agent ?? "chainbrain") === "chainbrain");
  const last = useRef<Approval | undefined>(current);
  if (current) last.current = current;
  const shown = current ?? last.current;
  // while the owner's signature is in flight (and the success moment plays) the sheet stays up even though the request is already answered
  const [hold, setHold] = useState(false);
  // another approval replacing the one being signed must not leave the sheet held open
  const seen = useRef<string | undefined>(current?.id);
  useEffect(() => { if (current && current.id !== seen.current) setHold(false); if (current) seen.current = current.id; }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet visible={(approvalOpen && !!current) || hold} onClose={() => { setHold(false); setApprovalOpen(false); }}>
      {shown ? <Body key={shown.id} a={shown} queue={pending.filter((x) => x.kind !== "question").length} hold={setHold} /> : null}
    </Sheet>
  );
}

function Body({ a, queue, hold }: { a: Approval; queue: number; hold: (b: boolean) => void }) {
  const { findPocket, sellerName, answer, signApprove, wallet, setApprovalOpen, cfg, ledger, setReceipt } = useApp();
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
  const limitText = !pocket || pocket.askAbove === NEVER ? "Above your ask-me limit"
    : pocket.askAbove === 0n ? "This pocket asks about every payment"
    : `Above your US$${usd(pocket.askAbove)} ask-me limit`;
  const item = cleanText(cfg?.sellers.find((x) => x.id === a.data?.sellerId)?.items.find((i) => i.sku === a.data?.sku)?.description ?? a.data?.description, 120) || "Seller payment";

  const approve = async () => {
    setError(null);
    hold(true);
    const r = await signApprove(a);
    if (!r.ok) { hold(false); setError(describeApprovalError(r.error)); throw new Error(r.error); }
  };
  // the slide has shown its done state; swap to the success moment, then let the sheet go (about 900 ms of success on screen)
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => { hold(false); setApprovalOpen(false); }, 1400);
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

  // "View receipt": the payment row appears once the agent's payment settles; until then Activity is the honest place to look
  const viewReceipt = () => {
    const row = [...ledger].reverse().find((r) => r.kind === "payment" && r.sellerId === a.data?.sellerId && sameAddr(r.pocket, a.pocket));
    hold(false); setApprovalOpen(false);
    if (row) setReceipt(row); else router.navigate("/activity");
  };
  if (phase === "success") {
    return <SheetSuccess minHeight={formH.current} title={`Paid US$${amount ?? "?"}`} sub={`To ${seller}${pocket ? ` from ${cleanText(pocket.name, 30)}` : ""}`} action={{ label: "View receipt", onPress: viewReceipt }} />;
  }
  return (
    <Animated.View style={{ flexShrink: 1 }} onLayout={(e) => { formH.current = e.nativeEvent.layout.height; }}>
      <SheetScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 20 }} showsVerticalScrollIndicator={false}>
        {isPay ? (
          <>
            <View style={{ alignItems: "center", gap: 6, paddingTop: 2 }}>
              <T v="row" w="semi" color="muted" style={{ fontSize: 15, lineHeight: 22 }}>Approve payment</T>
              <T v="balance" accessibilityLabel={`US$${amount ?? "unknown"}`}>US${amount ?? "?"}</T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Avatar label={seller} size={24} />
                <T v="row" w="medium" numberOfLines={1}>to {seller}</T>
              </View>
              {queue > 1 ? <T v="cap" color="muted">{queue - 1} more waiting</T> : null}
            </View>
            {a.data?.radar ? (
              <View style={{ gap: 8, padding: 14, borderRadius: 16, backgroundColor: c.warningSoft }} accessible accessibilityLabel={`Radar: risk ${a.data.radar.score} out of 10. ${cleanText(radarBody(String(a.data.radar.narrative ?? "")), 300)}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Icon name="radar" size={18} color={c.warning} />
                  <T v="row" w="semi" style={{ flex: 1 }}>Radar found risk in this seller's money</T>
                </View>
                <ScoreBar score={Number(a.data.radar.score) || 0} verdict={a.data.radar.verdict === "block" ? "block" : "review"} />
                <T v="sub" color="ink2">{cleanText(radarBody(String(a.data.radar.narrative ?? "")).split(" Rule:")[0], 300)}</T>
              </View>
            ) : null}
            <SummaryCard rows={[
              ["What", item],
              ["From", pocket ? cleanText(pocket.name, 30) : shortAddr(a.pocket)],
              ["Limit", limitText],
              ["Expires", "Approval valid 10 min"],
            ]} />
            <Details title="Details" codes={a.data?.radar ? ["COUNTERPARTY_REVIEW"] : ["NEEDS_OWNER_APPROVAL"]} rows={[
              ...(a.data?.intent ? parseIntent(a.data.intent).map((r): [string, string] => [r.k === "Price" ? "Limits" : r.k === "Buy" ? "Task" : r.k || "Task", r.v]) : []),
              ["Pays to", auth ? shortAddr(auth.to) : "n/a"], ["Authorization", auth ? `${auth.nonce.slice(0, 10)}…` : "n/a"],
            ]}>
              {a.text ? <View style={{ gap: 2 }}><T v="cap" color="muted">Your agent says</T><T v="sub" color="ink2">{cleanText(a.text, 400)}</T></View> : null}
              <T v="cap" color="muted">Your signature approves this one payment for the next 10 minutes. No money leaves your main wallet.</T>
            </Details>
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

      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 4 }}>
        {isPay ? (
          owned && wallet ? (
            <>
              <SlideToConfirm key={a.id + (error ?? "")} auto="approval.slide" label="Slide to approve" doneLabel="Approved" onConfirm={approve} onDone={() => setPhase("success")} disabled={busy || expired} />
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
            <Button label="Confirm task" auto="intent.confirm" onPress={confirmIntent} loading={busy} />
            <Button label="Decline" kind="text" onPress={decline} disabled={busy} />
          </>
        )}
      </View>
    </Animated.View>
  );
}
