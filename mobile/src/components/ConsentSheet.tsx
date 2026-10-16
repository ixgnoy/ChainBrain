// "Claude wants to use a pocket" (Stitch chainbrain_connect_agent, step 2). A pocket's agent key is fixed when the pocket is
// made (Pocket.sol `agent` is immutable), so consent gives the agent a NEW pocket: the owner picks the budget and the sellers,
// sees what the agent can and can't do (the contract's rules, the same for every agent), and slides to allow: two owner
// transactions (create with the agent's key, fund), each with its hash. Pockets other agents hold are listed, not selectable.
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import type { Address } from "viem";
import { useApp } from "../store";
import { c, radius } from "../tokens";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { Button, Chip, Press } from "../ui/kit";
import { SlideToConfirm } from "../ui/SlideToConfirm";
import { T, Eyebrow } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { AgentAvatar } from "../ui/AgentAvatar";
import { SheetSuccess } from "./SheetSuccess";
import { ErrorNote } from "./ErrorNote";
import { txError } from "./ActionSheet";
import { agentInfo, CAN, CANNOT, type AgentId } from "../../../shared/sim/agents";
import { parseUsd } from "../lib/shared";
import { uniqueName } from "../app/create";
import { useCoverDock } from "./AskDock";

// the built-in network's sellers charge per request (Exa US$0.007, CoinGecko US$0.01, Nansen up to US$0.05)
const BUDGETS = ["0.20", "0.50", "1"];
const CAP = "0.05", ASK = "0.02", DAYS = 7;

export function ConsentSheet({ agent, visible, onClose, onAllowed }: { agent: AgentId; visible: boolean; onClose: () => void; onAllowed: (pocket: Address) => void }) {
  const { pockets, wallet, cfg, addPocket, recordTx, refreshPockets, balances } = useApp();
  const info = agentInfo(agent)!;
  const [budget, setBudget] = useState("0.50");
  const research = useMemo(() => (cfg?.sellers ?? []).filter((s) => s.category === "Research data" && s.id !== "shadyfeed"), [cfg]);
  const [sellers, setSellers] = useState<string[]>(["exa", "coingecko", "nansen"]);
  const names = sellers.map((id) => cfg?.sellers.find((s) => s.id === id)?.name ?? id);
  const sellerList = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
  const [done, setDone] = useState<{ pocket: Address; name: string; txs: { label: string; hash: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const others = pockets.filter((p) => !p.revoked);
  const name = useMemo(() => uniqueName(`${info.name} research`, pockets.map((p) => p.name)), [info.name, pockets]);
  const short = balances ? balances.usdc < parseUsd(budget) : false;

  const allow = async () => {
    setError(null);
    const label = name; // fixed now: the new pocket itself must not turn it into "… · 15 Oct"
    try {
      if (!wallet || !cfg) throw new Error("not connected");
      const payTo = Object.fromEntries(cfg.sellers.map((s) => [s.id, s.payTo]));
      const made = await wallet.createPocket({
        agent: info.address as Address, cap: parseUsd(CAP), askAbove: parseUsd(ASK),
        expiresAt: BigInt(Math.floor(Date.now() / 1000) + DAYS * 86_400), sellers: sellers.map((s) => payTo[s] as Address),
      });
      recordTx({ kind: "create", pocket: made.pocket, hash: made.tx });
      await addPocket(made.pocket, { name: label, style: "custom" }, { activate: false });
      const f = await wallet.fund(made.pocket, parseUsd(budget));
      recordTx({ kind: "fund", pocket: made.pocket, hash: f.hash, amount: parseUsd(budget).toString() });
      await refreshPockets();
      setDone({ pocket: made.pocket, name: label, txs: [{ label: "Create pocket", hash: made.tx }, { label: `Add US$${budget}`, hash: f.hash }] });
    } catch (e) {
      setError(txError(e));
      throw e;
    }
  };

  useCoverDock(visible); // the ask dock would sit on Deny
  return (
    <Sheet visible={visible} onClose={onClose}>
      {done ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }}>
          <SheetSuccess title={`${info.name} can use ${done.name}`} sub={`US$${budget} in the pocket. ${info.name} pays only ${sellerList}, asks you above US$${ASK}, and stops when you disconnect it.`} txs={done.txs} />
          <Button label={`See ${info.name}`} onPress={() => onAllowed(done.pocket)} auto="consent.done" />
        </View>
      ) : (
        <SheetScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 18 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <AgentAvatar kind={agent} size={52} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ alignSelf: "flex-start", minHeight: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: c.blueSoft, justifyContent: "center" }}>
                <T v="tab" w="bold" style={{ color: c.blueInk, letterSpacing: 0.4 }}>Incoming request</T>
              </View>
              <T v="section" accessibilityRole="header" accessibilityLabel={`${info.name} wants to use a pocket`}>{`${info.name} wants to use\u00a0a\u00a0pocket`}</T>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Eyebrow>Its own pocket</Eyebrow>
            <View style={{ borderRadius: radius.tile, borderWidth: 2, borderColor: c.ink, padding: 14, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.ink, alignItems: "center", justifyContent: "center" }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.white }} /></View>
                <View style={{ flex: 1 }}>
                  <T v="row" w="bold">{`New pocket: ${name}`}</T>
                  <T v="cap" color="muted">{`Cap US$${CAP} a payment · asks you above US$${ASK} · ${DAYS} days`}</T>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <T v="cap" w="semi" color="ink2">Budget from your main wallet</T>
                <View style={{ flexDirection: "row", gap: 8 }}>{BUDGETS.map((b) => <Chip key={b} label={`US$${b}`} on={budget === b} onPress={() => setBudget(b)} />)}</View>
                {short ? <T v="cap" color="vermillionInk">Not enough in your main wallet for this budget.</T> : null}
              </View>
              <View style={{ gap: 8 }}>
                <T v="cap" w="semi" color="ink2">Sellers it may pay</T>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {research.map((s) => <Chip key={s.id} label={s.name} on={sellers.includes(s.id)} onPress={() => setSellers((x) => (x.includes(s.id) ? x.filter((y) => y !== s.id) : [...x, s.id]))} />)}
                </View>
              </View>
            </View>
            {others.length ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.tile, backgroundColor: c.fill }}>
                <View style={{ flexDirection: "row" }}>
                  {[...new Set(others.map((p) => p.agentId ?? ""))].map((k, i) => <View key={k} style={{ marginLeft: i ? -8 : 0 }}><AgentAvatar kind={k} size={26} /></View>)}
                </View>
                <T v="cap" color="ink2" style={{ flex: 1 }}>{`Your ${others.length} other ${others.length === 1 ? "pocket keeps" : "pockets keep"} the agent ${others.length === 1 ? "it was" : "they were"} made for, so they can't be handed over.`}</T>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, borderRadius: radius.tile, backgroundColor: c.greenSoft, padding: 12, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="shieldCheck" size={15} color={c.greenInk} stroke={2.2} /><T v="tab" w="bold" style={{ color: c.greenInk, letterSpacing: 0.6, textTransform: "uppercase" }}>{`${info.name} can`}</T></View>
              {CAN.map((x) => <View key={x} style={{ flexDirection: "row", gap: 6 }}><Icon name="check" size={13} color={c.greenInk} stroke={2.6} /><T v="cap" style={{ flex: 1 }}>{x}</T></View>)}
            </View>
            <View style={{ flex: 1, borderRadius: radius.tile, backgroundColor: c.vermillionSoft, padding: 12, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="ban" size={15} color={c.vermillionInk} stroke={2.2} /><T v="tab" w="bold" style={{ color: c.vermillionInk, letterSpacing: 0.6, textTransform: "uppercase" }}>{`${info.name} can't`}</T></View>
              {CANNOT.map((x) => <View key={x} style={{ flexDirection: "row", gap: 6 }}><Icon name="x" size={13} color={c.vermillionInk} stroke={2.6} /><T v="cap" style={{ flex: 1 }}>{x}</T></View>)}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Icon name="lock" size={14} color={c.muted} />
            <T v="cap" color="muted" style={{ flex: 1 }}>The pocket contract enforces these rules on every payment. Disconnect stops the agent; revoke returns the money.</T>
          </View>

        </SheetScroll>
      )}
      {done ? null : (
        // the decision stays in view while the details scroll
        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 6, borderTopWidth: 1, borderTopColor: c.fill }}>
          {error ? <ErrorNote text={error} /> : null}
          <SlideToConfirm label={`Allow · add US$${budget}`} doneLabel="Allowed" disabled={!sellers.length || short} onConfirm={allow} auto="consent.allow" />
          <Press haptics="select" onPress={onClose} accessibilityRole="button" accessibilityLabel="Deny" style={{ alignItems: "center", paddingVertical: 8 }}>
            <T v="label" color="ink2" style={{ fontSize: 15 }}>Deny</T>
          </Press>
        </View>
      )}
    </Sheet>
  );
}
