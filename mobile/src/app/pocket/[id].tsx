import React, { useMemo, useState } from "react";
import { Switch, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useApp } from "../../store";
import { c } from "../../tokens";
import { Screen } from "../../ui/Screen";
import { BackHeader } from "../../ui/BackHeader";
import { Avatar, Card, ListCard, ListRow, Pill, RoundAction, SectionHeader } from "../../ui/kit";
import { T } from "../../ui/Text";
import { ActivityRow } from "../../components/ActivityRow";
import { factPills, isExpired, untilText } from "../../components/PocketCard";
import { txError } from "../../components/ActionSheet";
import { cleanText } from "../../lib/sanitize";
import { sameAddr } from "../../lib/events";
import { visibleRows } from "../../lib/plain";
import { money, usd } from "../../lib/util";
import { notify, DEMO_MSG } from "../../lib/toast";
import { haptic } from "../../haptics";

export default function PocketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findPocket, pocketsLoaded, cfg, wallet, ledger, setAction, setReceipt, refreshPockets, demo } = useApp();
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

  const toggle = async (name: string, on: boolean, payTo: `0x${string}`) => {
    if (demo) { notify(DEMO_MSG); return; }
    setBusy(`${on ? "Removing" : "Allowing"} ${name}`); setErr(null);
    try { await wallet!.setSeller(pocket.address, payTo, !on); haptic.success(); await refreshPockets(); }
    catch (e) { haptic.error(); setErr(txError(e)); }
    finally { setBusy(""); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <BackHeader title={cleanText(pocket.name, 30)} sub={pocket.revoked ? "Turned off" : expired ? "Expired" : untilText(pocket.expiresAt)} />
      <Screen tabs={false} top={false} contentContainerStyle={{ paddingTop: 8 }}>
        <View style={{ alignItems: "center", gap: 14, paddingBottom: 8 }}>
          <Avatar label={pocket.name} size={96} tone={off ? "fill" : "soft"} />
          <T v="balance" accessibilityLabel={`pocket, ${usd(pocket.balance)} USDC`}>{money(pocket.balance)}</T>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 20 }}>
            {pocket.revoked ? <Pill label="Revoked" tone="negative" /> : expired ? <Pill label="Expired" tone="fill" /> : null}
            {factPills(pocket).map((f) => <Pill key={f} label={f} />)}
            {!off ? <Pill label={untilText(pocket.expiresAt).replace("until", "Ends")} tone="fill" icon="clock" /> : null}
          </View>
        </View>

        {owned ? (
          <View style={{ flexDirection: "row", paddingHorizontal: 20, marginTop: 24 }}>
            <RoundAction soft icon="plus" label="Add" a11y="Add money" onPress={() => setAction({ mode: "fund", pocket: pocket.address })} />
            <RoundAction soft icon="undo" label="Return" a11y="Return funds" onPress={() => setAction({ mode: "return", pocket: pocket.address })} />
            {!pocket.revoked ? <RoundAction soft icon="lock" label="Revoke" a11y="Revoke" onPress={() => setAction({ mode: "revoke", pocket: pocket.address })} /> : null}
          </View>
        ) : (
          <Card style={{ marginHorizontal: 20, marginTop: 20 }}><T v="sub" color="ink2">Another key owns this pocket. Add money, return or revoke from the device that created it.</T></Card>
        )}
        {pocket.revoked ? <T v="sub" color="muted" style={{ textAlign: "center", paddingHorizontal: 32, marginTop: 16 }}>Your agent can't spend from this pocket any more.{pocket.balance > 0n ? " Return the money to your main wallet when you like." : ""}</T> : null}
        {err ? <T v="sub" color="negative" style={{ textAlign: "center", paddingHorizontal: 32, marginTop: 12 }}>{err}</T> : null}

        <SectionHeader title="Allowed sellers" />
        <ListCard>
          {(cfg?.sellers ?? []).map((s) => {
            const on = pocket.allowed.includes(s.id);
            return (
              <ListRow key={s.id} avatar={<Avatar label={s.name} />} title={cleanText(s.name, 40)} sub={cleanText(s.category, 30)}>
                <Switch value={on} disabled={!owned || !!busy || off} trackColor={{ true: c.accent, false: c.fill }} thumbColor="#FFFFFF" ios_backgroundColor={c.fill} {...({ activeThumbColor: "#FFFFFF" } as object)}
                  onValueChange={() => void toggle(s.name, on, s.payTo)} accessibilityLabel={`Allow ${s.name}`} />
              </ListRow>
            );
          })}
        </ListCard>
        <T v="cap" color="muted" style={{ paddingHorizontal: 24, paddingTop: 8 }}>{busy ? `${busy}: waiting for the chain…` : "Changing a seller is signed by your key on this phone."}</T>

        <SectionHeader title="Activity" />
        {rows.length === 0 ? <Card style={{ marginHorizontal: 20 }}><T v="sub" color="ink2">Nothing from this pocket yet.</T></Card> : <ListCard>{rows.map((r) => <ActivityRow key={r.key} row={r} onPress={() => setReceipt(r)} />)}</ListCard>}
      </Screen>
    </View>
  );
}
