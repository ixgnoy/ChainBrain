import React, { useMemo, useState } from "react";
import { Switch, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../store";
import { c } from "../../tokens";
import { Screen } from "../../ui/Screen";
import { BackHeader, BACK_HEADER_H } from "../../ui/BackHeader";
import { Avatar, Card, ListCard, ListRow, Pill, Press, SectionHeader } from "../../ui/kit";
import { RoundButton } from "../../ui/RollAction";
import { WorstCase } from "../../components/WorstCase";
import { Money } from "../../ui/Money";
import { Reveal as Rise, PopIn } from "../../ui/Reveal";
import { AnimatedList } from "../../ui/AnimatedList";
import { Icon } from "../../ui/Icon";
import { T } from "../../ui/Text";
import { ActivityRow } from "../../components/ActivityRow";
import { factPills, isExpired, untilText } from "../../components/PocketCard";
import { TxNotice } from "../../components/TxNotice";
import { txError } from "../../components/ActionSheet";
import { cleanText } from "../../lib/sanitize";
import { sameAddr } from "../../lib/events";
import { visibleRows, worstCase } from "../../lib/plain";
import { money, usd, shortAddr } from "../../lib/util";
import { radius } from "../../tokens";
import { NEVER } from "../../lib/shared";
import { haptic } from "../../haptics";

/** Editable fact pill: soft accent, pencil, press 0.95 with a selection tick. */
function RulePill({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  return (
    <Press haptics="select" scale={0.95} onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}
      style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 36, borderRadius: radius.pill, backgroundColor: c.accentSoft, alignSelf: "flex-start" }}>
      <T v="cap" w="semi" color="accent">{label}</T>
      <Icon name="edit" size={13} color={c.accent} />
    </Press>
  );
}

export default function PocketDetail() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findPocket, pocketsLoaded, cfg, wallet, ledger, setAction, setReceipt, refreshPockets, setRules, recordTx, setNotice } = useApp();
  const pocket = findPocket(id);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const rows = useMemo(() => visibleRows(ledger.filter((r) => sameAddr(r.pocket, id)).reverse()), [ledger, id]);

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

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <BackHeader title={cleanText(pocket.name, 30)} sub={pocket.revoked ? "Turned off" : expired ? "Expired" : untilText(pocket.expiresAt)} scrollY={scrollY} revealAt={150} />
      <Screen tabs={false} top={false} scrollY={scrollY} contentContainerStyle={{ paddingTop: insets.top + BACK_HEADER_H }}>
        <View style={{ alignItems: "center", gap: 14, paddingBottom: 8 }}>
          <PopIn from={0.92}><Avatar label={pocket.name} size={96} tone={off ? "fill" : "soft"} /></PopIn>
          <Rise index={0} base={60}><T v="row" w="medium" color="ink2" numberOfLines={1} style={{ textAlign: "center", paddingHorizontal: 24 }}>{cleanText(pocket.name, 30)}</T></Rise>
          <Money v="balance" value={usd(pocket.balance)} countIn label={`pocket, ${usd(pocket.balance)} USDC`} />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 20 }}>
            {pocket.revoked ? <Rise index={0} step={40} base={140}><Pill label="Revoked" tone="negative" /></Rise> : expired ? <Rise index={0} step={40} base={140}><Pill label="Expired" tone="fill" /></Rise> : null}
            {factPills(pocket).map((f, i) => (
              <Rise key={f} index={i + 1} step={40} base={140}>
                {editable ? <RulePill label={f} onPress={() => setRules({ pocket: pocket.address, field: f.startsWith("Cap") ? "cap" : "ask" })} a11y={`Edit ${f.startsWith("Cap") ? "cap" : "ask-me limit"}: ${f}`} /> : <Pill label={f} />}
              </Rise>
            ))}
            {!off ? <Rise index={factPills(pocket).length + 1} step={40} base={140}><Pill label={untilText(pocket.expiresAt).replace("until", "Ends")} tone="fill" icon="clock" /></Rise> : null}
          </View>
        </View>

        {owned ? (
          <Rise index={0} base={300}>
            <View style={{ flexDirection: "row", paddingHorizontal: 20, marginTop: 24 }}>
              <RoundButton soft icon="plus" label="Add" a11y="Add money" onPress={() => setAction({ mode: "fund", pocket: pocket.address })} />
              <RoundButton soft icon="undo" label="Return" a11y="Return funds" onPress={() => setAction({ mode: "return", pocket: pocket.address })} />
              {!pocket.revoked ? <RoundButton danger icon="lock" label="Revoke" a11y="Revoke" onPress={() => setAction({ mode: "revoke", pocket: pocket.address })} /> : null}
            </View>
          </Rise>
        ) : (
          <Card style={{ marginHorizontal: 20, marginTop: 20 }}><T v="sub" color="ink2">Another key owns this pocket. Add money, return or revoke from the device that created it.</T></Card>
        )}
        <TxNotice pocket={pocket.address} />
        {pocket.revoked ? <T v="sub" color="muted" style={{ textAlign: "center", paddingHorizontal: 32, marginTop: 16 }}>Your agent can't spend from this pocket any more.{pocket.balance > 0n ? " Return the money to your main wallet when you like." : ""}</T> : null}
        {err ? <T v="sub" color="negative" style={{ textAlign: "center", paddingHorizontal: 32, marginTop: 12 }}>{err}</T> : null}

        <Rise index={0} base={360} dy={6}>
          <Card style={{ marginHorizontal: 20, marginTop: 20 }}>
            <WorstCase pocket={pocket} sellers={sellerNames} off={off} />
          </Card>
        </Rise>
        {editable ? <T v="cap" color="muted" style={{ paddingHorizontal: 24, paddingTop: 10 }}>Tap Cap or Ask above to change a rule. It is signed by your key on this phone.</T> : null}
        <T v="cap" color="muted" style={{ paddingHorizontal: 24, paddingTop: 4 }}>Agent {shortAddr(pocket.agent)}</T>

        <SectionHeader title="Allowed sellers" />
        <ListCard>
          {(cfg?.sellers ?? []).map((s) => {
            const on = pocket.allowed.includes(s.id);
            return (
              <ListRow key={s.id} avatar={<Avatar label={s.name} />} title={cleanText(s.name, 40)} sub={cleanText(s.category, 30)}>
                <Switch value={on} disabled={!owned || !!busy || off} trackColor={{ true: c.accent, false: c.fill }} thumbColor="#FFFFFF" ios_backgroundColor={c.fill} {...({ activeThumbColor: "#FFFFFF" } as object)}
                  onValueChange={() => { haptic.select(); void toggle(s.name, on, s.payTo); }} accessibilityLabel={`Allow ${s.name}`} />
              </ListRow>
            );
          })}
        </ListCard>
        <T v="cap" color="muted" style={{ paddingHorizontal: 24, paddingTop: 8 }}>{busy ? `${busy}: waiting for the chain…` : "Changing a seller is signed by your key on this phone."}</T>

        <SectionHeader title="History" />
        {rows.length === 0 ? <Card style={{ marginHorizontal: 20 }}><T v="sub" color="ink2">Nothing from this pocket yet. Creating, adding money, payments and refusals show up here, each with its transaction.</T></Card> : <AnimatedList initial="stagger">{rows.map((r) => <ActivityRow key={r.key} row={r} onPress={() => setReceipt(r)} />)}</AnimatedList>}
      </Screen>
    </View>
  );
}
