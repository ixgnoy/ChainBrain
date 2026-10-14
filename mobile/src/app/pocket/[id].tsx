import React, { useMemo, useState } from "react";
import { Switch, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "../../theme";
import { useApp } from "../../store";
import { Screen } from "../../ui/Screen";
import { BackHeader } from "../../ui/BackHeader";
import { Button, Card, DevBadge, Divider } from "../../ui/primitives";
import { HoldToRevoke } from "../../ui/HoldToRevoke";
import { T, Mono } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import { PocketCard, cardOf, isExpired } from "../../components/PocketCard";
import { ActivityRow } from "../../components/ActivityRow";
import { txError } from "../../components/ActionSheet";
import { TxLink } from "../../components/TxLink";
import { cleanText } from "../../lib/sanitize";
import { sameAddr } from "../../lib/events";
import { usd, askText, dateLabel, shortAddr } from "../../lib/util";
import { haptic } from "../../haptics";
import { radius } from "../../tokens";

function SettingRow({ icon, k, v, sub }: { icon: IconName; k: string; v: string; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
      <View style={{ width: 34, height: 34, borderRadius: radius.md, backgroundColor: c.bgElev2, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={16} color={c.text2} /></View>
      <View style={{ flex: 1 }}><T v="bodySm" color="text2">{k}</T>{sub ? <T v="caption" color="text3">{sub}</T> : null}</View>
      <T v="bodySm" weight="semi" style={{ maxWidth: "52%", textAlign: "right" }}>{v}</T>
    </View>
  );
}

export default function PocketDetail() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findPocket, pocketsLoaded, cfg, wallet, ledger, dev, setAction, setReceipt, refreshPockets, fireFlash } = useApp();
  const pocket = findPocket(id);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const rows = useMemo(() => ledger.filter((r) => sameAddr(r.pocket, id)).reverse(), [ledger, id]);

  if (!pocket) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <BackHeader title="Pocket" />
        <View style={{ padding: 24 }}><T v="body" color="text2">{pocketsLoaded ? "This pocket was not found. After a dev stack restart, pockets on the old chain are gone." : "Loading…"}</T></View>
      </View>
    );
  }
  const owned = pocket.owned && !!wallet;
  const expired = isExpired(pocket);
  const daysLeft = Math.ceil((Number(pocket.expiresAt) * 1000 - Date.now()) / 86400000);

  const run = async (label: string, f: () => Promise<{ hash: string }>) => {
    setBusy(label); setErr(null);
    try { const { hash } = await f(); setLastTx(hash); haptic.success(); await refreshPockets(); }
    catch (e) { haptic.error(); setErr(txError(e)); }
    finally { setBusy(""); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BackHeader title={cleanText(pocket.name, 30)} right={dev ? <DevBadge /> : undefined} />
      <Screen tabs={false} contentContainerStyle={{ paddingTop: 0 }}>
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <PocketCard pocket={cardOf(pocket)} width="100%" hero />

          {pocket.revoked ? (
            <View style={{ padding: 14, borderRadius: radius.lg, backgroundColor: c.revokedBg, borderWidth: 1, borderColor: c.revokedBorder, flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Icon name="lock" size={20} color={c.revoked} />
              <View style={{ flex: 1 }}>
                <T v="bodySm" weight="semi" color="revoked">Revoked</T>
                <T v="caption" color="text2">The agent can't spend from this pocket. {pocket.balance > 0n ? "The remaining balance stays here until you return it." : ""}</T>
              </View>
            </View>
          ) : owned ? (
            <View style={{ gap: 6 }}>
              <HoldToRevoke onComplete={() => run("Revoked", async () => { const r = await wallet!.revoke(pocket.address); fireFlash(); haptic.heavy(); return r; })} busy={busy === "Revoked"} />
              <T v="caption" color="text3" style={{ textAlign: "center" }}>Press and hold. The agent stops at once. This is final.</T>
            </View>
          ) : (
            <View style={{ padding: 14, borderRadius: radius.lg, backgroundColor: c.infoBg, borderWidth: 1, borderColor: c.infoBorder, flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Icon name="globe" size={20} color={c.info} />
              <View style={{ flex: 1 }}><T v="bodySm" weight="semi">Owned by another key</T><T v="caption" color="text2">Revoke, fund and return from the device that holds this pocket's key.</T></View>
            </View>
          )}
          {err && <T v="bodySm" color="refused" style={{ textAlign: "center" }}>{err}</T>}
          {lastTx && <View style={{ alignItems: "center" }}><TxLink tx={lastTx} /></View>}

          {owned && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {!pocket.revoked && <Button label="Fund" kind="secondary" icon="plus" small style={{ flex: 1 }} onPress={() => setAction({ mode: "fund", pocket: pocket.address })} />}
              <Button label="Return funds" kind="secondary" icon="undo" small style={{ flex: 1 }} disabled={pocket.balance === 0n} onPress={() => setAction({ mode: "return", pocket: pocket.address })} />
            </View>
          )}

          <Card pad={16}>
            <T v="caption" color="text3" style={{ marginBottom: 2 }}>THIS POCKET'S RULES</T>
            <SettingRow icon="wallet" k="Funds" v={`${usd(pocket.balance)} USDC`} sub="The balance is the budget" />
            <Divider />
            <SettingRow icon="user" k="Who can spend" v={shortAddr(pocket.agent)} sub="The ChainBrain agent key" />
            <Divider />
            <SettingRow icon="bolt" k="How much" v={`Up to ${usd(pocket.cap)}`} sub="Per payment" />
            <Divider />
            <SettingRow icon="shieldAlert" k="When to ask me" v={askText(pocket.askAbove, pocket.cap)} />
            <Divider />
            <SettingRow icon="clock" k="How long" v={dateLabel(Number(pocket.expiresAt))} sub={pocket.revoked ? "Revoked" : expired ? "Expired" : `${Math.max(daysLeft, 0)} day${daysLeft === 1 ? "" : "s"} left`} />
          </Card>

          <View style={{ gap: 8 }}>
            <T v="caption" color="text3" style={{ paddingLeft: 4 }}>ALLOWED SELLERS</T>
            <Card pad={0}>
              {(cfg?.sellers ?? []).map((s, i) => {
                const on = pocket.allowed.includes(s.id);
                return (
                  <View key={s.id}>
                    {i > 0 && <Divider />}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                      <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}><T v="bodySm" weight="bold" color="accentInk">{cleanText(s.name, 2).slice(0, 1).toUpperCase()}</T></View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <T v="bodySm" weight="semi" numberOfLines={1}>{cleanText(s.name, 40)}</T>
                        <Mono size={11} color="text3">{cleanText(s.category, 30)} · {shortAddr(s.payTo)}</Mono>
                      </View>
                      <Switch value={on} disabled={!owned || !!busy || pocket.revoked} trackColor={{ true: c.accent, false: c.bgElev3 }}
                        onValueChange={() => run(`${on ? "Removed" : "Allowed"} ${s.name}`, () => wallet!.setSeller(pocket.address, s.payTo, !on))} accessibilityLabel={`Allow ${s.name}`} />
                    </View>
                  </View>
                );
              })}
            </Card>
            {busy && busy !== "Revoked" ? <T v="caption" color="text3" style={{ paddingLeft: 4 }}>{busy}: waiting for the chain…</T> : <T v="caption" color="text3" style={{ paddingLeft: 4 }}>Each switch is a transaction signed by your key.</T>}
          </View>

          <View style={{ gap: 6 }}>
            <T v="caption" color="text3" style={{ paddingLeft: 4 }}>ACTIVITY</T>
            {rows.length === 0 ? <Card><T v="bodySm" color="text2">Nothing from this pocket yet.</T></Card> : <Card pad={0}><View style={{ paddingVertical: 4 }}>{rows.map((r) => <ActivityRow key={r.key} row={r} onPress={() => setReceipt(r)} compact />)}</View></Card>}
          </View>
        </View>
      </Screen>
    </View>
  );
}
