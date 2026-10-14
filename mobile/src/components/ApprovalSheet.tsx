// Owner approvals. Intent: confirm the fixed-template task card. Payment above the ask-me threshold: slide to co-sign the exact
// USDC TransferWithAuthorization the wallet built (POST /api/approvals/:id {approved, signature}).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { useTheme } from "../theme";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { Button, Chip } from "../ui/primitives";
import { T, Mono } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Orb } from "../ui/Orb";
import { haptic } from "../haptics";
import { cleanText } from "../lib/sanitize";
import { authOf, authExpired, type Approval } from "../lib/events";
import { parseUsd } from "../lib/shared";
import { usd, shortAddr } from "../lib/util";
import { radius } from "../tokens";
import { IntentCard } from "./IntentCard";

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
  return (
    <Sheet visible={approvalOpen && !!current} onClose={() => setApprovalOpen(false)}>
      {shown ? <Body key={shown.id} a={shown} queue={pending.filter((x) => x.kind !== "question").length} /> : null}
    </Sheet>
  );
}

function Body({ a, queue }: { a: Approval; queue: number }) {
  const { c } = useTheme();
  const { height } = useWindowDimensions();
  const { findPocket, sellerName, answer, signApprove, wallet, setApprovalOpen } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  const approve = async () => {
    setError(null);
    const r = await signApprove(a);
    if (!r.ok) { setError(describeApprovalError(r.error)); throw new Error(r.error); }
    await new Promise((res) => setTimeout(res, 900));
  };
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

  return (
    <View>
      <ScrollView style={{ maxHeight: Math.max(240, height * 0.92 - 230) }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.stepupBg, borderWidth: 1, borderColor: c.stepupBorder, alignItems: "center", justifyContent: "center" }}>
            <Icon name={isPay ? "shieldAlert" : "sparkle"} size={22} color={c.stepup} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="headingMd" numberOfLines={1}>{isPay ? "Approve payment?" : "Confirm the task?"}</T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
              <Chip kind="stepup" label="Needs you" /><T v="caption" color="text2">{pocket ? `${cleanText(pocket.name, 30)} pocket` : shortAddr(a.pocket)}</T>
              {queue > 1 && <T v="caption" color="stepup">{queue - 1} more waiting</T>}
            </View>
          </View>
        </View>

        {isPay ? (
          <>
            {a.text ? (
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <Orb size={26} state="waiting" />
                <T v="bodySm" style={{ flex: 1 }}>{cleanText(a.text, 400)}</T>
              </View>
            ) : null}
            <View style={{ backgroundColor: c.bgElev2, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: c.hairline }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                <T v="displayLg" num>{amount ?? "?"}</T><T v="bodySm" weight="semi" color="text2">USDC</T>
              </View>
              <View>
                <T v="bodySm" weight="semi">{seller}</T>
                <T v="caption" color="text3" numberOfLines={2}>{cleanText(a.data?.description ?? a.data?.sku, 120)}</T>
              </View>
            </View>
            {a.data?.intent ? (
              <View style={{ gap: 8 }}>
                <T v="caption" color="text3">YOUR CONFIRMED TASK</T>
                <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.bgElev1, padding: 12 }}>
                  <T v="mono" color="text2" style={{ fontSize: 13, lineHeight: 19 }}>{cleanText(a.data.intent, 500)}</T>
                </View>
              </View>
            ) : null}
            <View style={{ gap: 4 }}>
              <T v="caption" color="text3">WHAT YOU SIGN</T>
              <T v="bodySm" color="text2">A USDC transfer authorization from this pocket to {seller}, valid for this one payment for 10 minutes. It moves no money from your main wallet.</T>
              {auth ? <Mono size={12} color="text3">to {shortAddr(auth.to)} · nonce {auth.nonce.slice(0, 10)}…</Mono> : null}
            </View>
          </>
        ) : (
          <IntentCard text={a.text} compact />
        )}

        {expired && isPay ? <T v="bodySm" color="stepup">The 10-minute window passed. The agent will ask again if it still wants this.</T> : null}
        {error && (
          <View style={{ backgroundColor: c.refusedBg, borderColor: c.refusedBorder, borderWidth: 1, borderRadius: radius.md, padding: 12, flexDirection: "row", gap: 10 }}>
            <Icon name="alert" size={18} color={c.refused} />
            <T v="bodySm" color="refused" style={{ flex: 1 }}>{error}</T>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>
        {isPay ? (
          owned && wallet ? (
            <>
              <SlideToConfirm key={a.id + (error ?? "")} label="Slide to approve" doneLabel="Approved" onConfirm={approve} disabled={busy || expired} />
              <Button label="Decline" kind="secondary" onPress={decline} loading={busy} />
            </>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={{ backgroundColor: c.infoBg, borderColor: c.infoBorder, borderWidth: 1, borderRadius: radius.md, padding: 14, flexDirection: "row", gap: 10, alignItems: "center" }}>
                <Icon name="globe" size={20} color={c.info} />
                <View style={{ flex: 1 }}><T v="body" weight="semi">Another key owns this pocket</T><T v="bodySm" color="text2">Approve it on the device that created the pocket.</T></View>
              </View>
              <Button label="Close" kind="secondary" onPress={() => setApprovalOpen(false)} />
            </View>
          )
        ) : (
          <>
            <Button label="Confirm task" onPress={confirmIntent} loading={busy} />
            <Button label="Decline" kind="secondary" onPress={decline} disabled={busy} />
          </>
        )}
      </View>
    </View>
  );
}
