// Owner approvals. A payment above the ask-me threshold is drawn as a cheque (components/Cheque.tsx): who asks and why you
// are asked (the rule that triggered it) with the countdown, then the pocket's card turning over to the cheque (pay, to, for,
// what is left after), the wallet's other checks (Radar's seller check, the paying pocket), the agent's own note set apart as
// unchecked words, and the details. Slide to co-sign, then Face ID: the phone signs the exact eHKD
// TransferWithAuthorization the wallet built (POST /api/approvals/:id {approved, signature}). Intent: confirm the
// fixed-template task card.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import { router } from "expo-router";
import Animated from "react-native-reanimated";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { Button, Details } from "../ui/kit";
import { AgentAvatar } from "../ui/AgentAvatar";
import { Hatch } from "../ui/Hatch";
import { agentInfo } from "../../../shared/sim/agents";
import { T } from "../ui/Text";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import { authOf, authExpired, sameAddr, radarBody, sentinelEvents, type Approval } from "../lib/events";
import { c } from "../tokens";
import { Icon } from "../ui/Icon";
import { ScoreBar } from "./RadarCard";
import { ChequeCard, CheckLine } from "./Cheque";
import { Countdown } from "./AskDock";
import { toneFor } from "./PocketFace";
import { biometricKind, confirmOwner, type OwnerCheck } from "../lib/biometric";
import { askNotifyPermission, notifyPermission, type NotifyPermission } from "../lib/notify";
import { NEVER } from "../lib/shared";
import { parseHkd } from "../lib/shared";
import { contractTail, hkd, shortAddr } from "../lib/util";
import { IntentCard, parseIntent } from "./IntentCard";
import { SheetSuccess } from "./SheetSuccess";
import { notify as toast } from "../lib/toast";
import { ErrorNote } from "./ErrorNote";
import { curSign } from "../lib/runtime";

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
/** Below this, a co-sign is one press plus Face ID; at or above it, slide first. */
const QUICK_MAX = 40_000_000n; // HK$40.00 in eHKD units
const safeHkd = (s: unknown) => { try { return typeof s === "string" ? hkd(parseHkd(s)) : null; } catch { return null; } };

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
  // the agent's ask arrives while the owner may still be typing in the chat: the cheque has no field, so the keyboard goes
  // (it would otherwise squeeze the sheet and take the taps meant for its buttons)
  const open = (approvalOpen && !!current) || hold;
  useEffect(() => { if (open) Keyboard.dismiss(); }, [open]);
  return (
    <Sheet visible={open} onClose={() => { setHold(false); setApprovalOpen(false); }}>
      {shown ? <Body key={shown.id} a={shown} queue={pending.filter((x) => x.kind !== "question").length} hold={setHold} /> : null}
    </Sheet>
  );
}

function Body({ a, queue, hold }: { a: Approval; queue: number; hold: (b: boolean) => void }) {
  const { findPocket, sellerName, answer, signApprove, wallet, setApprovalOpen, cfg, ledger, setReceipt, pockets, events } = useApp();
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
  const agent = agentInfo(a.agent ?? pocket?.agentId ?? "chainbrain");
  const who = agent?.kind === "builtin" ? "ChainBrain" : agent?.name ?? "Your agent";
  const radar = a.data?.radar as { score?: number; verdict?: string; narrative?: string } | undefined;
  const risky = !!radar && radar.verdict !== "ok";
  const owned = pocket ? pocket.owned : true;
  const seller = cleanText(sellerName(a.data?.sellerId), 60);
  const amount = safeHkd(a.data?.amount);
  const limitText = !pocket || pocket.askAbove === NEVER ? "Above your ask-me limit"
    : pocket.askAbove === 0n ? "This pocket asks about every payment"
    : `Above your ${curSign()}${hkd(pocket.askAbove)} ask-me limit`;
  const item = cleanText(cfg?.sellers.find((x) => x.id === a.data?.sellerId)?.items.find((i) => i.sku === a.data?.sku)?.description ?? a.data?.description, 120) || "Seller payment";

  const [cardW, setCardW] = useState(0);
  const [bio, setBio] = useState<OwnerCheck | null>(null);
  const Bio = bio ? bio[0].toUpperCase() + bio.slice(1) : null; // at the start of a sentence
  useEffect(() => { void biometricKind().then(setBio); }, []);
  const [notify, setNotify] = useState<NotifyPermission>("unsupported");
  useEffect(() => { void notifyPermission().then(setNotify); }, []);
  const outside = (a.agent ?? "chainbrain") !== "chainbrain";
  const amountUnits = (() => { try { return typeof a.data?.amount === "string" ? parseHkd(a.data.amount) : null; } catch { return null; } })();
  // why the wallet asks (server/src/wallet/tools.ts): over the ask-me limit, a Sentinel hold (until the owner co-signs), or
  // Radar wanting a review of the seller; the last two can ask about a payment under the limit
  const overLimit = !pocket || amountUnits == null || pocket.askAbove === 0n || (pocket.askAbove !== NEVER && amountUnits > pocket.askAbove);
  const held = useMemo(() => {
    if (!pocket) return false;
    const mine = events.filter((e) => sameAddr(e.pocket, pocket.address));
    const last = sentinelEvents(mine).filter((v) => v.kind === "hold" || v.kind === "clear" || v.kind === "freeze").at(-1);
    return last?.kind === "hold" && !mine.some((e) => e.type === "payment" && e.cosigned && e.at > last.at);
  }, [events, pocket]);
  // a routine run past its period allowance (shared/sim/world.ts runRoutine): the runner asks, not the contract
  const allowance = a.data?.allowance as { period: string; allowance: string; spent: string; after: string; run: number } | undefined;
  const why = allowance ? `Run ${allowance.run} would pass this ${allowance.period}'s ${curSign()}${allowance.allowance}` : overLimit ? limitText : held ? "The Sentinel wants your OK on this payment" : risky ? "Radar wants your OK on this seller" : limitText;
  const whyCode = !overLimit && held ? "SENTINEL_HOLD" : risky ? "COUNTERPARTY_REVIEW" : "NEEDS_OWNER_APPROVAL";

  // "Claude pays Nansen HK$0.40 from Market news. HK$2.896 stays in the pocket."
  const left = pocket && amountUnits != null && pocket.balance >= amountUnits ? pocket.balance - amountUnits : null;
  const moneyLine = `${who} pays ${seller} ${curSign()}${amount ?? "?"}${pocket ? ` from ${cleanText(pocket.name, 30)}` : ""}.${left != null ? ` ${curSign()}${hkd(left)} stays in the pocket.` : ""}`;
  const until = auth ? new Date(Number(auth.validBefore) * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null;

  // small payments: Face ID alone signs (it is the deliberate act); large ones keep the slide first, then Face ID. Without
  // biometrics the slide is the only deliberate step, so it always stays.
  const quick = !!bio && amountUnits != null && amountUnits < QUICK_MAX;
  const [signing, setSigning] = useState(false);

  const approve = async () => {
    setError(null);
    // the slide says "I mean it"; Face ID says "it's me"
    const me = await confirmOwner(`Co-sign ${curSign()}${amount ?? ""} to ${seller}`);
    if (me === "cancel") { setError(`Nothing was signed: ${bio ?? "Face ID"} didn't confirm it's you.`); throw new Error("BIOMETRIC"); }
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
    if (!r.ok && r.error !== "NOT_PENDING") { setError(describeApprovalError(r.error)); return; }
    haptic.light();
    toast(isPay ? `Declined. ${who} won't pay ${seller}.` : `Declined. ${who} won't start that task.`);
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
    return <SheetSuccess minHeight={formH.current} title={`Paid ${curSign()}${amount ?? "?"}`} sub={`To ${seller}${pocket ? ` from ${cleanText(pocket.name, 30)}` : ""}`} action={{ label: "View receipt", onPress: viewReceipt }} />;
  }
  return (
    <Animated.View style={{ flexShrink: 1 }} onLayout={(e) => { formH.current = e.nativeEvent.layout.height; }}>
      <SheetScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 20 }} showsVerticalScrollIndicator={false}>
        {isPay ? (
          <>
            {/* who asks, and why you are asked: the rule that sent it to you */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 4 }}>
              <AgentAvatar kind={agent?.id ?? "chainbrain"} size={44} badge={c.vermillion} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="head" accessibilityRole="header" numberOfLines={2} style={{ fontSize: 18, lineHeight: 23 }}>{allowance ? `${who} asks you` : `${who} asks you to co-sign`}</T>
                <T v="sub" style={{ color: c.vermillionInk }}>{why}</T>
              </View>
              {auth && !expired ? <Countdown a={a} size={46} onLight /> : null}
            </View>
            {/* the cheque below says the money, the seller, what is left and the deadline; only an expired ask needs words */}
            {expired ? <T v="sub" color="muted" style={{ marginTop: -6 }}>Expired. Nothing was paid; the agent can ask again.</T> : null}
            {queue > 1 ? <T v="cap" color="muted" style={{ marginTop: -12 }}>{`${queue - 1} more waiting after this one`}</T> : null}
            <View accessible accessibilityLabel={`${moneyLine}${until ? ` If you don't answer by ${until}, nothing is paid.` : ""}`} onLayout={(e) => setCardW(Math.round(e.nativeEvent.layout.width))}>
              {pocket && cardW ? (
                <ChequeCard pocket={pocket} tone={toneFor(pockets, pocket.address)} width={cardW} amount={amountUnits} seller={seller} sellerId={a.data?.sellerId} item={item} until={auth ? Number(auth.validBefore) : undefined} />
              ) : !pocket ? (
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <T v="balance" accessibilityLabel={`${curSign()}${amount ?? "unknown"}`}>{curSign()}{amount ?? "?"}</T>
                  <T v="section" color="ink2" numberOfLines={1}>to {seller}</T>
                </View>
              ) : null}
            </View>
            {allowance ? <AllowanceStrip {...allowance} amount={amount ?? "0"} /> : null}
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
            {/* the wallet's other checks */}
            <View style={{ borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.tileStroke, paddingHorizontal: 16 }}>
              <CheckLine label="Seller check" tone={risky ? "vermillion" : "green"} value={radar?.score != null ? `${radar.verdict === "ok" ? "Low risk" : radar.verdict === "block" ? "Blocked" : "Review"} · ${radar.score}/10` : "Checked"} />
              <CheckLine label="Pays from" value={pocket ? `${cleanText(pocket.name, 22)} · ${contractTail(a.pocket)}` : shortAddr(a.pocket)} last />
            </View>
            {/* the agent's own words: not checked by the wallet, so they look different */}
            {a.text ? (
              <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: c.fill, padding: 16, gap: 10 }} accessible accessibilityLabel={`${who}'s note, not checked by your wallet: ${cleanText(a.text, 400)}`}>
                <Hatch color={c.line} pitch={7} stroke={1.2} style={{ left: undefined, width: 10 }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 6 }}>
                  <View style={{ minHeight: 22, paddingHorizontal: 8, borderRadius: 6, backgroundColor: c.ink, justifyContent: "center" }}>
                    <T v="tab" w="bold" style={{ color: c.white, letterSpacing: 0.9, textTransform: "uppercase" }}>{`${who}'s note · not checked`}</T>
                  </View>
                </View>
                <T v="body" color="ink2" style={{ fontStyle: "italic", paddingLeft: 6 }}>{`“${cleanText(a.text, 400)}”`}</T>
              </View>
            ) : null}
            <Details title="Details" codes={[whyCode]} rows={[
              ...(a.data?.intent ? parseIntent(a.data.intent).map((r): [string, string] => [r.k === "Price" ? "Limits" : r.k === "Buy" ? "Task" : r.k || "Task", r.v]) : []),
              ["Pays to", auth ? shortAddr(auth.to) : "n/a"], ["Authorization", auth ? `${auth.nonce.slice(0, 10)}…` : "n/a"],
            ]}>
              <T v="cap" color="muted">Your signature approves this one payment for the next 10 minutes. No money leaves your main wallet.</T>
            </Details>
            {outside && notify === "undetermined" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: c.fill }}>
                <Icon name="bell" size={22} color={c.ink} stroke={1.5} />
                <T v="sub" color="ink2" style={{ flex: 1 }}>{`Get a notification when ${who} asks, even with ChainBrain closed.`}</T>
                <Button label="Turn on" small kind="secondary" onPress={() => { void askNotifyPermission().then(setNotify); }} />
              </View>
            ) : null}
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
      </SheetScroll>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 4 }}>
        {/* next to the button that failed: inside the scroll it sat below the fold and a failed co-sign looked like nothing happened */}
        {error ? <View style={{ paddingBottom: 8 }}><ErrorNote text={error} /></View> : null}
        {isPay ? (
          owned && wallet ? (
            <>
              {quick ? (
                // one press, Face ID confirms it is you, then the phone signs exactly this payment (Face ID gates the app's use of
                // the key; the key itself is not locked behind it)
                <Button label={`Approve ${curSign()}${amount ?? ""} with ${bio}`} icon={bio === "Face ID" ? "faceId" : bio === "your passcode" ? "lock" : "fingerprint"} auto="approval.slide" loading={signing} disabled={busy || expired}
                  onPress={async () => { setSigning(true); try { await approve(); setPhase("success"); } catch { /* the error note says why */ } finally { setSigning(false); } }} />
              ) : (
                <SlideToConfirm key={a.id + (error ?? "")} auto="approval.slide" label={`Slide to approve ${curSign()}${amount ?? ""}`} doneLabel="Approved" onConfirm={approve} onDone={() => setPhase("success")} disabled={busy || expired} />
              )}
              <Button label="Decline" kind="text" onPress={decline} loading={busy} />
              <T v="cap" color="muted" style={{ textAlign: "center" }}>{bio
                ? quick ? `${Bio} confirms it's you, then your phone signs exactly this payment with your key. Nothing else.` : `Then ${bio} confirms it's you and your phone signs exactly this payment with your key.`
                : "No Face ID on this device, so the slide alone approves. Your phone then signs exactly this payment with your key."}</T>
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

/** The routine's week (or day, or month) on one bar: what it already spent, this payment on top, and the allowance marked.
 *  Checkable figures rather than an explanation (docs/08-frontend/pocket-apps-research.md, Kim et al. 2025). */
function AllowanceStrip({ period, allowance, spent, after, amount }: { period: string; allowance: string; spent: string; after: string; amount: string }) {
  const lim = Number(allowance), sp = Number(spent), af = Number(after);
  const scale = Math.max(af, lim) || 1;
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 16, backgroundColor: c.fill }} accessible
      accessibilityLabel={`This ${period}: ${curSign()}${spent} spent, plus this ${curSign()}${amount}, makes ${curSign()}${after}, past your ${curSign()}${allowance} a ${period}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T v="tab" color="muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>{`This ${period}`}</T>
        <T v="cap" w="bold">{`${curSign()}${after} of ${curSign()}${allowance}`}</T>
      </View>
      <View style={{ height: 14, borderRadius: 5, backgroundColor: c.card, flexDirection: "row", overflow: "hidden" }}>
        <View style={{ width: `${(sp / scale) * 100}%`, backgroundColor: c.ink }} />
        <View style={{ width: `${((af - sp) / scale) * 100}%`, backgroundColor: c.vermillion }} />
      </View>
      <View style={{ position: "absolute", left: 14 + 0, right: 14, top: 38, height: 22 }} pointerEvents="none">
        <View style={{ position: "absolute", left: `${(lim / scale) * 100}%`, width: 2, height: 22, marginLeft: -1, backgroundColor: c.ink }} />
      </View>
      <T v="cap" color="ink2">{`${curSign()}${spent} spent + ${curSign()}${amount} now. Your routine runs on its own up to ${curSign()}${allowance} a ${period}; this one needs you.`}</T>
    </View>
  );
}
