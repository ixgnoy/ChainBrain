// Owner approvals (Stitch chainbrain_approve_payment). Payment above the ask-me threshold: who asks (the agent that holds the
// pocket), the amount and seller, the facts the WALLET checked (item, pocket, the rule that asks you, Radar's seller check, the
// 10-minute window, counting down), then the agent's own note, set apart as unchecked words; slide to co-sign the exact USDC
// TransferWithAuthorization the wallet built (POST /api/approvals/:id {approved, signature}). Intent: confirm the
// fixed-template task card.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import Animated from "react-native-reanimated";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { Button, Details, FactRow } from "../ui/kit";
import { AgentAvatar } from "../ui/AgentAvatar";
import { Hatch } from "../ui/Hatch";
import { agentInfo } from "../../../shared/sim/agents";
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
  const [left, setLeft] = useState(auth ? Number(auth.validBefore) - Math.floor(Date.now() / 1000) : 0);
  useEffect(() => {
    if (!auth) return;
    const t = setInterval(() => { setExpired(authExpired(auth)); setLeft(Number(auth.validBefore) - Math.floor(Date.now() / 1000)); }, 1000);
    return () => clearInterval(t);
  }, [auth]);
  const agent = agentInfo(a.agent ?? pocket?.agentId ?? "chainbrain");
  const who = agent?.kind === "builtin" ? "ChainBrain" : agent?.name ?? "Your agent";
  const clock = `${String(Math.max(0, Math.floor(left / 60))).padStart(2, "0")}:${String(Math.max(0, left % 60)).padStart(2, "0")}`;
  const radar = a.data?.radar as { score?: number; verdict?: string; narrative?: string } | undefined;
  const risky = !!radar && radar.verdict !== "ok";
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
            <View style={{ alignItems: "center", gap: 6, paddingTop: 4 }}>
              <AgentAvatar kind={agent?.id ?? "chainbrain"} size={60} badge={c.vermillion} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                <T v="tab" color="muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>Approve payment</T>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.vermillion }} />
                <T v="tab" style={{ color: c.vermillionInk, textTransform: "uppercase", letterSpacing: 1 }}>Co-sign needed</T>
              </View>
              <T v="head" accessibilityRole="header">{`${who} asks to pay`}</T>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <T v="balance" accessibilityLabel={`US$${amount ?? "unknown"}`}>US${amount ?? "?"}</T>
                <T v="section" color="ink2" numberOfLines={1}>to {seller}</T>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: c.fill }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.vermillion }} />
                <T v="cap" w="semi" color="ink2">Test network</T>
              </View>
              {queue > 1 ? <T v="cap" color="muted">{queue - 1} more waiting</T> : null}
            </View>
            {risky ? (
              <View style={{ gap: 8, padding: 14, borderRadius: 16, backgroundColor: c.vermillionSoft }} accessible accessibilityLabel={`Radar: risk ${radar!.score} out of 10. ${cleanText(radarBody(String(radar!.narrative ?? "")), 300)}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Icon name="radar" size={18} color={c.vermillionInk} />
                  <T v="row" w="bold" style={{ flex: 1 }}>Radar found risk in this seller's money</T>
                </View>
                <ScoreBar score={Number(radar!.score) || 0} verdict={radar!.verdict === "block" ? "block" : "review"} />
                <T v="sub" color="ink2">{cleanText(radarBody(String(radar!.narrative ?? "")).split(" Rule:")[0], 300)}</T>
              </View>
            ) : null}
            {/* what the wallet checked */}
            <View style={{ borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.tileStroke, paddingHorizontal: 16 }}>
              <FactRow icon="file" label="Item"><T v="row" w="semi" numberOfLines={2} style={{ textAlign: "right" }}>{item}</T></FactRow>
              <FactRow icon="wallet" label="Pocket">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.blue }} />
                  <T v="row" w="semi" numberOfLines={1}>{pocket ? cleanText(pocket.name, 22) : shortAddr(a.pocket)}</T>
                  <View style={{ paddingHorizontal: 6, height: 20, borderRadius: 6, backgroundColor: c.fill, justifyContent: "center" }}><T v="mono" style={{ fontSize: 10.5 }}>{`•••• ${a.pocket.slice(-4).toUpperCase()}`}</T></View>
                </View>
              </FactRow>
              <FactRow icon="alert" label="Policy">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: c.vermillionSoft }}>
                  <T v="cap" w="bold" style={{ color: c.vermillionInk }}>{limitText}</T>
                </View>
              </FactRow>
              <FactRow icon="shieldCheck" label="Seller check">
                <T v="row" w="semi" style={{ color: risky ? c.vermillionInk : c.ink }}>{radar?.score != null ? `${radar.verdict === "ok" ? "Low risk" : radar.verdict === "block" ? "Blocked" : "Review"} · ${radar.score}/10` : "Checked"}</T>
              </FactRow>
              <FactRow icon="clock" label="Expires" last>
                <T v="row" w="bold" style={{ color: expired ? c.muted : c.vermillionInk }} accessibilityLabel={expired ? "Expired" : `Approval valid 10 min, ${clock} left`}>{expired ? "Expired" : `Valid 10 min · ${clock} left`}</T>
              </FactRow>
            </View>
            {/* the agent's own words: not checked by the wallet, so they look different */}
            {a.text ? (
              <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: c.fill, padding: 16, gap: 10 }} accessible accessibilityLabel={`${who}'s note, not checked by your wallet: ${cleanText(a.text, 400)}`}>
                <Hatch color={c.line} pitch={7} stroke={1.2} style={{ left: undefined, width: 10 }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 6 }}>
                  <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 6, backgroundColor: c.ink, justifyContent: "center" }}>
                    <T v="tab" w="bold" style={{ color: c.white, letterSpacing: 0.9, textTransform: "uppercase" }}>{`${who}'s note · not checked`}</T>
                  </View>
                </View>
                <T v="body" color="ink2" style={{ fontStyle: "italic", paddingLeft: 6 }}>{`“${cleanText(a.text, 400)}”`}</T>
              </View>
            ) : null}
            <Details title="Details" codes={risky ? ["COUNTERPARTY_REVIEW"] : ["NEEDS_OWNER_APPROVAL"]} rows={[
              ...(a.data?.intent ? parseIntent(a.data.intent).map((r): [string, string] => [r.k === "Price" ? "Limits" : r.k === "Buy" ? "Task" : r.k || "Task", r.v]) : []),
              ["Pays to", auth ? shortAddr(auth.to) : "n/a"], ["Authorization", auth ? `${auth.nonce.slice(0, 10)}…` : "n/a"],
            ]}>
              <T v="cap" color="muted">Your signature approves this one payment for the next 10 minutes. No money leaves your main wallet.</T>
            </Details>
          </>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <AgentAvatar kind={agent?.id ?? "chainbrain"} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="section">{agent?.kind === "outside" ? `${who} wants to start a task` : "Confirm the task?"}</T>
                <T v="sub" color="muted">{pocket ? `${cleanText(pocket.name, 30)} pocket` : shortAddr(a.pocket)}{queue > 1 ? ` · ${queue - 1} more waiting` : ""}</T>
              </View>
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
              <SlideToConfirm key={a.id + (error ?? "")} auto="approval.slide" label={`Slide to approve US$${amount ?? ""}`} doneLabel="Approved" onConfirm={approve} onDone={() => setPhase("success")} disabled={busy || expired} />
              <Button label="Decline" kind="text" onPress={decline} loading={busy} />
              <T v="cap" color="muted" style={{ textAlign: "center" }}>{`Paid from the pocket contract ${shortAddr(a.pocket)} with your co-signature.`}</T>
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
