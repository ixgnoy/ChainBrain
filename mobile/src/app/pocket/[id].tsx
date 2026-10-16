// Pocket page (Stitch chainbrain_pocket_detail + revoked_pocket, bars from transactions_vaultbank_style). The card arrives by
// the flight from Home's deck; then the rules as chips (cap and ask-me are editable, owner-signed), Add / Return / Revoke tiles,
// the worst case, spending by day, the agent that holds the pocket, its sellers, and its history. Revoked: a banner, the hatch
// card, what came back to the main wallet, and the pocket's audit trail (exportable as JSON).
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Share, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../store";
import { c, radius } from "../../tokens";
import { Screen } from "../../ui/Screen";
import { BackHeader, BACK_HEADER_H } from "../../ui/BackHeader";
import { Avatar, Button, Card, ListCard, ListRow, Press, SectionHeader, Toggle } from "../../ui/kit";
import { RoundButton } from "../../ui/RollAction";
import { WorstCase } from "../../components/WorstCase";
import { Reveal as Rise } from "../../ui/Reveal";
import { AnimatedList } from "../../ui/AnimatedList";
import { Icon } from "../../ui/Icon";
import { T } from "../../ui/Text";
import { AgentAvatar } from "../../ui/AgentAvatar";
import { SellerMark, hasSellerMark } from "../../ui/SellerMark";
import { ActivityRow } from "../../components/ActivityRow";
import { isExpired, untilText } from "../../components/PocketCard";
import { UnfreezeButton, movedMoney, sentinelReason } from "../../components/SentinelCard";
import { TxNotice } from "../../components/TxNotice";
import { PocketFace, cardHeight, toneFor } from "../../components/PocketFace";
import { useReduceMotion } from "../../ui/motion";
import { EditRoutineSheet } from "../../components/EditRoutineSheet";
import { PAGE_MARGIN, pageCardWidth } from "../../components/CardFlight";
import { useFlight } from "../../ui/cardFlight";
import { txError } from "../../components/ActionSheet";
import { cleanText } from "../../lib/sanitize";
import { sameAddr, sentinelEvents, type LedgerRow } from "../../lib/events";
import { visibleRows } from "../../lib/plain";
import { contractTail, money, usd } from "../../lib/util";
import { NEVER } from "../../lib/shared";
import { haptic } from "../../haptics";
import { agentInfo } from "../../../../shared/sim/agents";
import { runningNow } from "../../../../shared/sim/pocketAppData";
import { AppHeader, PocketApp, type AppCtx } from "../../components/app/PocketApp";
import { appOf } from "../../components/app/theme";
import * as api from "../../lib/api";

/** A rule chip: white pill with a muted label and a bold value; editable ones open the rule sheet. */
/** A rule as VaultBank's category tile: a coloured dot, the figure big, what it means under it; a pencil when you can edit it. */
function RuleTile({ dot, label, value, onPress, a11y }: { dot: string; label: string; value: string; onPress?: () => void; a11y: string }) {
  const body = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} />
        {onPress ? <Icon name="edit" size={14} color={c.muted} stroke={1.8} /> : null}
      </View>
      <T v="head" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 19, lineHeight: 24, marginTop: 6 }}>{value}</T>
      <T v="cap" color="muted" numberOfLines={2}>{label}</T>
    </>
  );
  const style = { flex: 1, padding: 12, borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: c.card, borderWidth: 1, borderColor: c.tileStroke } as const;
  return onPress
    ? <Press haptics="select" scale={0.96} onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={style}>{body}</Press>
    : <View accessible accessibilityLabel={a11y} style={style}>{body}</View>;
}

/** History rows shown before "Show all": the newest first. */
const HISTORY = 6;

export default function PocketDetail() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pockets, findPocket, pocketsLoaded, cfg, wallet, ledger, events, setAction, setReceipt, refreshPockets, setRules, recordTx, setNotice, sellerName, setActive } = useApp();
  const pocket = findPocket(id);
  const flight = useFlight();
  // the page is full width on a phone: the card can draw in the first frame instead of after a layout pass (web shows the app
  // as a narrow column, so it still measures there)
  const { width: winW } = useWindowDimensions();
  const [rootW, setRootW] = useState(Platform.OS === "web" ? 0 : winW);
  // the card settles back as the page scrolls (Wallet's pass detail): a little smaller and quieter, never moved, so the
  // content under it never slides over it; a pull down lifts it a touch. Reduce Motion: it stays as it is.
  const reduceMotion = useReduceMotion();
  const cardH0 = rootW ? cardHeight(pageCardWidth(rootW)) : 200;
  const settle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ scale: 1 }] };
    const y = scrollY.value;
    return {
      opacity: interpolate(y, [0, cardH0], [1, 0.35], Extrapolation.CLAMP),
      transform: [{ scale: y < 0 ? 1 + Math.min(-y, 120) / 900 : interpolate(y, [0, cardH0], [1, 0.92], Extrapolation.CLAMP) }],
    };
  });
  // first frame: the card, its rules and the money buttons; the charts, sellers and history follow one frame later, so the
  // page is there the moment it opens instead of after everything below the fold is built
  const [later, setLater] = useState(false);
  useEffect(() => { const f = requestAnimationFrame(() => setLater(true)); return () => cancelAnimationFrame(f); }, []);
  const [allRows, setAllRows] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const mine = useMemo(() => ledger.filter((r) => sameAddr(r.pocket, id)), [ledger, id]);
  const rows = useMemo(() => visibleRows([...mine].reverse()), [mine]);
  const lastFreeze = useMemo(() => sentinelEvents(events.filter((e) => sameAddr(e.pocket, id))).filter((v) => v.kind === "freeze").at(-1), [events, id]);

  // the pocket's routine (typed fields on the built-in network), read again whenever new events arrive
  const routine = useMemo(() => (id ? api.routineOf(id) : null), [id, events.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [runErr, setRunErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (!pocket) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <BackHeader title="Pocket" />
        <View style={{ padding: 24 }}><T v="body" color="ink2">{pocketsLoaded ? "This pocket was not found. If the test network was restarted, older pockets are gone." : "Loading…"}</T></View>
      </View>
    );
  }
  const owned = pocket.owned && !!wallet;
  const expired = isExpired(pocket);
  const off = pocket.revoked || expired;
  const editable = owned && !off;
  const sellerNames = (cfg?.sellers ?? []).filter((s) => pocket.allowed.includes(s.id)).map((s) => cleanText(s.name, 30));
  const agent = agentInfo(pocket.agentId ?? "");
  const ask = pocket.askAbove === NEVER || pocket.askAbove > pocket.cap ? "Never" : pocket.askAbove === 0n ? "Every payment" : money(pocket.askAbove);
  // what came back with the revoke (its sweep follows the revoke tx), not earlier Return funds
  const revokedAt = mine.find((r) => r.kind === "owner" && r.ownerKind === "revoke")?.at;
  const returned = revokedAt == null ? 0n : mine.filter((r) => r.kind === "owner" && r.ownerKind === "return" && r.at >= revokedAt).reduce((n, r) => n + (r.amount ?? 0n), 0n);
  const W = rootW ? pageCardWidth(rootW) : 0;
  const spec = appOf(pocket);
  const funded = mine.filter((r) => r.kind === "owner" && (r.ownerKind === "fund" || r.ownerKind === "return")).reduce((n, r) => n + (r.ownerKind === "fund" ? 1n : -1n) * (r.amount ?? 0n), 0n);
  const item = (sellerId: string, sku: string) => cfg?.sellers.find((s) => s.id === sellerId)?.items.find((i) => i.sku === sku);
  const itemName = (sellerId: string, sku: string) => { const it = item(sellerId, sku); return it?.short ?? it?.description ?? sku; };
  const ctx: AppCtx = {
    spec, address: pocket.address, agentId: pocket.agentId, events, routine: routine && !pocket.revoked ? routine : routine ? { ...routine, status: "paused" } : null,
    balance: pocket.balance, funded: funded > 0n ? funded : undefined, rules: { cap: pocket.cap, sellers: pocket.allowed }, now: Date.now(),
    sellerName: (s) => cleanText(sellerName(s), 24), itemName, registry: cfg?.sellers, running: runningNow(events, pocket.address),
    onRunNow: owned && !off ? async () => {
      haptic.medium(); setRunErr(null);
      const r = await api.runRoutineNow(pocket.address).catch(() => ({ ok: false as const, reason: "ERROR" }));
      if (!r.ok) { haptic.error(); setRunErr(r.reason === "BUSY" ? "The agent is busy with another task in this pocket. Try again in a moment." : r.reason === "AGENT_DISCONNECTED" ? "This agent is disconnected, so its routine doesn't run." : "That run didn't start."); }
      // no success tap here: the payment it makes gets one when it settles (PocketApp's payoff)
    } : undefined,
    onPause: owned && !off ? (paused) => { haptic.select(); api.pauseRoutine(pocket.address, paused); } : undefined,
    onEdit: owned && !off && routine ? () => setEditing(true) : undefined,
    onReceipt: (tx) => { const row = mine.find((r) => r.kind === "payment" && r.tx === tx); if (row) setReceipt(row); },
    onAsk: () => { setActive(pocket.address); router.push("/agent"); },
  };

  const toggle = async (name: string, on: boolean, payTo: `0x${string}`) => {
    setBusy(`${on ? "Removing" : "Allowing"} ${name}`); setErr(null);
    try {
      const r = await wallet!.setSeller(pocket.address, payTo, !on); haptic.success();
      recordTx({ kind: "seller", pocket: pocket.address, hash: r.hash, note: `${name} ${on ? "removed" : "allowed"}` });
      setNotice({ title: `${name} ${on ? "removed from" : "allowed in"} ${cleanText(pocket.name, 30)}`, pocket: pocket.address, txs: [{ hash: r.hash }] });
      await refreshPockets();
    }
    catch (e) { haptic.error(); setErr(txError(e)); }
    finally { setBusy(""); }
  };
  const exportLog = () => {
    const log = {
      pocket: pocket.address, name: pocket.name, agent: agent?.name ?? pocket.agent, revoked: pocket.revoked,
      events: events.filter((e) => sameAddr(e.pocket, pocket.address)),
    };
    void Share.share({ title: `${pocket.name} audit log`, message: JSON.stringify(log, null, 2) }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }} onLayout={(e) => setRootW(e.nativeEvent.layout.width)}>
      <BackHeader title={cleanText(pocket.name, 30)} sub={pocket.revoked ? "Revoked" : expired ? "Ended" : untilText(pocket.expiresAt)} scrollY={scrollY} revealAt={150} />
      <Screen tabs={false} top={false} scrollY={scrollY} contentContainerStyle={{ paddingTop: insets.top + BACK_HEADER_H, paddingBottom: insets.bottom + 40 }}>
        {pocket.revoked ? (
          <Rise index={0}>
            <View style={{ marginHorizontal: PAGE_MARGIN, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 46, borderRadius: 14, backgroundColor: c.vermillionSoft }}>
              <Icon name="shield" size={18} color={c.vermillionInk} stroke={2} />
              <T v="tab" w="bold" style={{ flex: 1, color: c.vermillionInk, letterSpacing: 0.9, textTransform: "uppercase" }}>Pocket revoked · agent locked out</T>
              <View style={{ paddingHorizontal: 7, height: 22, borderRadius: 5, backgroundColor: c.vermillionInk, justifyContent: "center" }}><T v="tab" w="bold" style={{ color: c.white, letterSpacing: 0.9 }}>LOCKED</T></View>
            </View>
          </Rise>
        ) : null}
        {/* the same card as Home's deck; it takes over from the flying card the moment that lands */}
        <Animated.View style={[{ alignItems: "center", opacity: flight?.pocket === pocket.address.toLowerCase() ? 0 : 1 }, flight?.pocket === pocket.address.toLowerCase() ? null : settle]} accessibilityLabel={`${cleanText(pocket.name, 30)} card, ${usd(pocket.balance)} USDC`} accessible>
          {W ? <PocketFace pocket={pocket} width={W} tone={toneFor(pockets, pocket.address)} buzz shadow tilt /> : <View style={{ height: 200 }} />}
        </Animated.View>

        {!pocket.revoked ? (
          <Rise index={1} base={60}>
            <View style={{ marginTop: 16 }}><AppHeader ctx={ctx} onOpen={agent ? () => router.push({ pathname: "/agents/[id]", params: { id: agent.id } }) : undefined} /></View>
          </Rise>
        ) : null}

        {owned && !pocket.revoked ? (
          <Rise index={2} base={90}>
            <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: PAGE_MARGIN, marginTop: 16 }}>
              <RoundButton icon="plus" label="Add funds" a11y="Add funds from your main wallet" onPress={() => setAction({ mode: "fund", pocket: pocket.address })} />
              <RoundButton icon="arrowIn" label="Return" a11y="Return funds" onPress={() => setAction({ mode: "return", pocket: pocket.address })} />
              <RoundButton danger icon="ban" label="Revoke" a11y="Revoke" onPress={() => setAction({ mode: "revoke", pocket: pocket.address })} />
            </View>
          </Rise>
        ) : !owned ? (
          <Card style={{ marginHorizontal: PAGE_MARGIN, marginTop: 16 }}><T v="sub" color="ink2">Another key owns this pocket. Add money, return or revoke from the device that created it.</T></Card>
        ) : null}
        <TxNotice pocket={pocket.address} />
        {err ? <T v="sub" color="vermillionInk" style={{ textAlign: "center", paddingHorizontal: 32, marginTop: 12 }}>{err}</T> : null}

        {pocket.revoked ? (
          <Rise index={2} base={90}>
            <Card pad={18} style={{ marginHorizontal: PAGE_MARGIN, marginTop: 16, gap: 12 }}>
              <T v="tab" color="muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>Where the money is</T>
              {returned > 0n ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.greenSoft, alignItems: "center", justifyContent: "center" }}><Icon name="arrowIn" size={19} color={c.greenInk} stroke={2.2} /></View>
                  <View style={{ flex: 1 }}>
                    <T v="head">{`${money(returned)} back in your main wallet`}</T>
                    <T v="cap" color="muted">Returned by your own key when you revoked it</T>
                  </View>
                </View>
              ) : null}
              {pocket.balance > 0n ? (
                <Button label={`Return ${money(pocket.balance)} to main wallet`} kind="vermillion" icon="arrowIn" auto="return.open" onPress={() => setAction({ mode: "return", pocket: pocket.address })} />
              ) : returned === 0n ? <T v="sub" color="ink2">The pocket was empty when you revoked it.</T> : null}
            </Card>
            <Card pad={18} style={{ marginHorizontal: PAGE_MARGIN, marginTop: 12, flexDirection: "row", gap: 12 }}>
              {agent ? <AgentAvatar kind={agent.id} size={44} /> : <Avatar icon="bot" size={44} />}
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <T v="head">Agent locked out</T>
                  {agent ? <View style={{ paddingHorizontal: 7, height: 20, borderRadius: 5, backgroundColor: c.fill, justifyContent: "center" }}><T v="tab" w="bold" style={{ letterSpacing: 0.6, textTransform: "uppercase" }}>{agent.name}</T></View> : null}
                </View>
                <T v="sub" color="ink2">{`${agent?.name ?? "The agent"} can no longer pay from this pocket. The contract refuses any payment, by anyone, for good.`}</T>
              </View>
            </Card>
          </Rise>
        ) : null}

        {pocket.frozen && !pocket.revoked ? (
          <Card style={{ marginHorizontal: PAGE_MARGIN, marginTop: 16, gap: 10 }}>
            <T v="row" w="bold">Frozen by the Sentinel</T>
            <T v="sub" color="ink2">{`${lastFreeze ? `${sentinelReason(lastFreeze)}, so it` : "It"} stopped all payments from this pocket on-chain.${lastFreeze && !movedMoney(lastFreeze) ? " No money moved." : ""} Its key can only freeze; only yours can unfreeze.`}</T>
            <UnfreezeButton pocket={pocket.address} />
          </Card>
        ) : null}

        {runErr ? <T v="sub" color="vermillionInk" style={{ textAlign: "center", paddingHorizontal: 32, marginTop: 12 }}>{runErr}</T> : null}
        {later ? <>
        {!pocket.revoked ? (
          <>
            {/* the pocket's own app: the blocks its spec names, every figure from the ledger */}
            <View style={{ marginTop: 16 }}><PocketApp ctx={ctx} /></View>

            {/* the owner zone: fixed, never chosen by the AI */}
            <SectionHeader title="Rules you signed" right="Your key" />
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: PAGE_MARGIN }}>
              <RuleTile dot={c.ink} label="Cap per payment" value={money(pocket.cap)} a11y={`Edit cap: Cap ${money(pocket.cap)}`} onPress={editable ? () => setRules({ pocket: pocket.address, field: "cap" }) : undefined} />
              <RuleTile dot={c.vermillion} label="Asks you above" value={ask} a11y={`Edit ask-me limit: Ask above ${ask}`} onPress={editable ? () => setRules({ pocket: pocket.address, field: "ask" }) : undefined} />
              <RuleTile dot={c.blue} label={expired ? "Ended" : pocket.frozen ? "Frozen by the Sentinel" : "Ends"} value={untilText(pocket.expiresAt).replace(/^until /, "")} a11y={pocket.frozen ? "Frozen by the Sentinel" : untilText(pocket.expiresAt)} />
            </View>
            <Card pad={18} style={{ marginHorizontal: PAGE_MARGIN, marginTop: 12 }}>
              <WorstCase pocket={pocket} sellers={sellerNames} off={off} />
            </Card>
          </>
        ) : (
          <Rise index={3} base={130} dy={6}>
            <AuditTrail rows={mine} name={(s) => cleanText(sellerName(s), 24)} onExport={exportLog} />
          </Rise>
        )}

        <SectionHeader title="Allowed sellers" right={`${pocket.allowed.length} of ${(cfg?.sellers ?? []).length}`} />
        <ListCard>
          {(cfg?.sellers ?? []).map((s) => {
            const on = pocket.allowed.includes(s.id);
            return (
              <ListRow key={s.id} avatar={hasSellerMark(s.id) ? <View style={{ opacity: on ? 1 : 0.45 }}><SellerMark id={s.id} size={44} radius={12} /></View> : <Avatar label={s.name} tone={on ? "soft" : "fill"} size={44} />} title={cleanText(s.name, 40)} sub={on ? cleanText(s.category, 30) : "Not on this pocket's list"}>
                <Toggle on={on} disabled={!owned || !!busy || off} onChange={() => void toggle(s.name, on, s.payTo)} a11y={`Allow ${s.name}`} />
              </ListRow>
            );
          })}
        </ListCard>
        <T v="cap" color="mutedOnCanvas" style={{ paddingHorizontal: 20, paddingTop: 8 }}>{busy ? `${busy}: waiting for the chain…` : editable ? "Changing a seller or a rule is signed by your key on this phone." : " "}</T>

        <SectionHeader title="History" />
        {rows.length === 0 ? <Card style={{ marginHorizontal: PAGE_MARGIN }}><T v="sub" color="ink2">Nothing from this pocket yet. Creating, adding money, payments and refusals show up here, each with its transaction.</T></Card>
          : <ListCard><AnimatedList initial="stagger">{(allRows ? rows : rows.slice(0, HISTORY)).map((r, i, shown) => <ActivityRow key={r.key} row={r} showAgent={false} last={i === shown.length - 1} onPress={() => setReceipt(r)} />)}</AnimatedList></ListCard>}
        {!allRows && rows.length > HISTORY ? <Button label={`Show all ${rows.length}`} kind="text" small onPress={() => setAllRows(true)} style={{ marginTop: 8, alignSelf: "center" }} /> : null}
        </> : null}
      </Screen>
      {routine ? <EditRoutineSheet routine={routine} agentId={pocket.agentId} visible={editing} onClose={() => setEditing(false)} onSaved={() => void refreshPockets()} /> : null}
    </View>
  );
}

/** The revoked pocket's story as a vertical timeline, newest first, with the JSON export. */
function AuditTrail({ rows, name, onExport }: { rows: LedgerRow[]; name: (id?: string) => string; onExport: () => void }) {
  const items = [...rows].reverse().slice(0, 12).map((r) => {
    const t = new Date(r.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    if (r.kind === "owner") {
      const k = r.ownerKind;
      const title = k === "revoke" ? "You revoked the pocket" : k === "return" ? `${money(r.amount ?? 0n)} returned to your wallet` : k === "fund" ? `You added ${money(r.amount ?? 0n)}` : k === "create" ? "Pocket created" : "Rule changed";
      return { key: r.key, t, title, sub: "Owner transaction", tone: k === "revoke" ? c.vermillion : c.ink };
    }
    if (r.kind === "payment") return { key: r.key, t, title: `Paid ${name(r.sellerId)} ${money(r.amount ?? 0n)}`, sub: r.cosigned ? "Co-signed by you" : "Inside the pocket's limits", tone: c.green };
    if (r.outcome === "refused") return { key: r.key, t, title: `${name(r.sellerId)} refused`, sub: r.reasons[0] ? r.reasons[0].replace(/_/g, " ").toLowerCase() : "Not allowed by the pocket", tone: c.vermillionInk };
    return { key: r.key, t, title: r.kind === "intent" ? "Task confirmed" : "Approval", sub: r.outcome, tone: c.muted };
  });
  return (
    <Card pad={18} style={{ marginHorizontal: PAGE_MARGIN, marginTop: 12, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T v="section">Audit trail</T>
        <T v="cap" color="muted">Newest first</T>
      </View>
      <View>
        {items.map((x, i) => (
          <View key={x.key} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ alignItems: "center", width: 16 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: c.card, backgroundColor: x.tone, marginTop: 3 }} />
              {i < items.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: c.fill }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <T v="row" w="bold" style={{ flexShrink: 1 }}>{x.title}</T>
                <T v="cap" color="muted">{x.t}</T>
              </View>
              <T v="cap" color="muted">{x.sub}</T>
            </View>
          </View>
        ))}
      </View>
      <Button label="Export the audit log (JSON)" kind="secondary" icon="download" onPress={onExport} />
    </Card>
  );
}
