# MetaMask on the phone: Reown AppKit in Expo Go

Explored 14-15 Oct 2026 in a scratch copy of the Task 8 mobile app (Expo SDK 57, React Native 0.86). Outcome: **likely to work in Expo Go**; the only step not proven is the live handoff to MetaMask mobile on a real phone, which needs a Reown project ID. Phone testing (Expo Go and the Android Studio development build) is with another agent.

The app as shipped still uses the on-device key (`mobile/src/lib/wallet.ts`); this page is the upgrade path. It was first written for an older test chain and is now updated for the FISCO BCOS chain (chain id 20200) and the Mock e-HKD token (eHKD).

## Why the owner wallet matters

A pocket is a contract the owner owns; we never hold the owner's money. Every owner action is signed by the owner's main wallet:

| Action | Wallet request | Gas |
| --- | --- | --- |
| Create pocket | `eth_sendTransaction` (factory `create`) | yes |
| Fund pocket (eHKD from main wallet to pocket) | `eth_sendTransaction` (eHKD `transfer`) | yes |
| Approve a payment above ask-me | `eth_signTypedData_v4` (eHKD `TransferWithAuthorization`) | no |
| Edit rules, revoke, return funds | `eth_sendTransaction` | yes |

On FISCO the gas price is 0, so "gas" here means an on-chain transaction: the owner pays nothing, but the address needs a non-zero native balance (the server faucet gives one). Transactions are legacy type with gas price 0.

On the web these are MetaMask browser prompts. On the phone, WalletConnect (Reown AppKit) turns the same requests into MetaMask mobile prompts. Without it, the phone uses a key held on the device.

## Findings

| Question | Answer | Evidence |
| --- | --- | --- |
| Does Reown say AppKit can't run in Expo Go? | No. Its only Expo Go warning is for the Coinbase SDK | docs.reown.com/appkit/react-native/core/installation |
| Are AppKit's native dependencies in Expo Go? | Yes, all six | `expo/bundledNativeModules.json` (SDK 57): async-storage **2.2.0**, get-random-values ~1.11.0, svg 15.15.4, netinfo 12.0.1, safe-area-context ~5.7.0, expo-application ~57.0.3. Not bundled: `react-native-mmkv` (Coinbase SDK only, not needed) |
| `@walletconnect/react-native-compat` ships a native module; does that break Expo Go? | No: when `RNWalletConnectModule` isn't linked it falls back to `expo-application`; its Pay module is optional | `module/index.ts` in `@walletconnect/react-native-compat@2.26.0` (`getApplicationModule` → `getExpoModule`) |
| Typecheck, tests, `expo-doctor` | Pass: tsc clean, 7/7 logic tests (3 new for the MetaMask path), 21/21 doctor checks | scratch run, 15 Oct |
| Bundles for Expo Go's engine | Android and iOS both compile to Hermes bytecode (about 7 MB each, AppKit included) | `npx expo export --platform android|ios` |
| App boots with AppKit initialised | Yes, after one fix (below): setup screen shows **Connect MetaMask**; polyfills load; no errors | Expo web target in Chrome |
| AppKit modal opens and MetaMask connects | **Not verified.** Web isn't an AppKit React Native target and the placeholder project ID can't load the wallet list | needs a phone + real project ID |

## Gotchas found by running it

1. **`<SafeAreaProvider>` is required at the root.** Reown's docs say it isn't needed in Expo; that holds only with Expo Router supplying one. Without it AppKit throws `No safe area value available`. (The current repo app uses Expo Router, so check before adding a second one.)
2. **A custom `babel.config.js` needs `babel-preset-expo` as a direct dependency.** AppKit needs `unstable_transformImportMeta: true` (for valtio) on SDK 53+; with only Expo's nested copy the bundler fails with `Cannot find module 'babel-preset-expo'`. Fix: `npx expo install babel-preset-expo -- --save-dev`.
3. **`expo-linking` added a duplicate `expo-constants`;** `expo-doctor` flags it. Fix: `npm dedupe`.
4. **Use `npx expo install`, not `npm install`,** for async-storage: npm's latest is 3.x, Expo Go ships 2.2.0.
5. **Expo Go redirect:** `metadata.redirect.native` uses `Linking.createURL("/")` (`exp://<lan-ip>:8081` in Expo Go, `chainbrain://` in a development build). MetaMask may not jump back to Expo Go automatically; switching back by hand is expected.
6. **Wrong chain:** the wallet is switched to FISCO BCOS, chain id 20200 (`wallet_switchEthereumChain`, then `wallet_addEthereumChain` on 4902, with the RPC and explorer read from the server's `/api/config`) before anything is signed or sent; a refused switch fails with `WRONG_CHAIN` and nothing is signed.

## Integration recipe

Install (versions resolved by Expo for SDK 57):

```bash
npx expo install @reown/appkit-react-native @reown/appkit-ethers-react-native @react-native-async-storage/async-storage react-native-get-random-values react-native-svg @react-native-community/netinfo @walletconnect/react-native-compat react-native-safe-area-context expo-application expo-linking
npx expo install babel-preset-expo -- --save-dev
npm dedupe && npx expo-doctor          # expect 21/21
```

Resolved in the scratch run: `@reown/appkit-react-native` 2.0.6, `@reown/appkit-ethers-react-native` 2.0.6, `@walletconnect/react-native-compat` 2.26.0, `@react-native-async-storage/async-storage` 2.2.0, `expo-linking` ~57.0.12, `babel-preset-expo` ~57.0.0. The ethers adapter does not pull in `ethers`; signing stays in viem through AppKit's EIP-1193 provider.

`app.json`: add `"scheme": "chainbrain"`.

Entry file, first line (before anything else is imported):

```ts
// Must be first: WalletConnect polyfills (TextEncoder, getRandomValues, URL, Buffer) before anything else loads.
import "@walletconnect/react-native-compat";
import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
```

`babel.config.js`:

```js
// Reown AppKit (valtio) needs import.meta transformed on Expo SDK 53+.
module.exports = function (api) {
  api.cache(true);
  return { presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]] };
};
```

`src/lib/appkit.ts` (AppKit is created only when `EXPO_PUBLIC_REOWN_PROJECT_ID` is set; otherwise the app keeps the on-device key):

```ts
// MetaMask (or any WalletConnect wallet) as the owner's main wallet, via Reown AppKit.
// Only created when EXPO_PUBLIC_REOWN_PROJECT_ID is set (free at https://dashboard.reown.com); otherwise the app
// falls back to the on-device key (keystore.ts). '@walletconnect/react-native-compat' is imported first in index.ts.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { createAppKit, type Storage } from "@reown/appkit-react-native";
import { EthersAdapter } from "@reown/appkit-ethers-react-native";
import { defineChain } from "viem";
import { RPC } from "./shared";

export const REOWN_PROJECT_ID = process.env.EXPO_PUBLIC_REOWN_PROJECT_ID ?? "";

/** FISCO BCOS as AppKit and viem see it. RPC comes from the server's /api/config. */
export const fisco = defineChain({ id: 20200, name: "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });

const parse = <T,>(v: string | null): T | undefined => (v === null ? undefined : (JSON.parse(v) as T));

/** AppKit's session storage on AsyncStorage (bundled in Expo Go). */
export const asyncStorage: Storage = {
  getKeys: async () => [...(await AsyncStorage.getAllKeys())],
  getEntries: async <T = any,>() => (await AsyncStorage.multiGet(await AsyncStorage.getAllKeys())).map(([k, v]) => [k, parse<T>(v) as T] as [string, T]),
  getItem: async <T = any,>(key: string) => parse<T>(await AsyncStorage.getItem(key)),
  setItem: async <T = any,>(key: string, value: T) => AsyncStorage.setItem(key, JSON.stringify(value)),
  removeItem: async (key: string) => AsyncStorage.removeItem(key),
};

export const appKit = REOWN_PROJECT_ID
  ? createAppKit({
      projectId: REOWN_PROJECT_ID,
      networks: [fisco],
      defaultNetwork: fisco,
      adapters: [new EthersAdapter()],
      storage: asyncStorage,
      metadata: {
        name: "ChainBrain",
        description: "Give your AI a pocket, not your wallet",
        url: "https://github.com/ixgnoy/Grabber",
        icons: ["https://avatars.githubusercontent.com/u/37784886"],
        // Expo Go: exp://<lan-ip>:8081 ; development build: chainbrain:// (app.json "scheme")
        redirect: { native: Linking.createURL("/") },
      },
    })
  : undefined;
```

`src/lib/wallet.ts`: one owner-wallet API over two sources. `{ pk }` is the existing on-device key; `{ provider, address }` is AppKit's `useProvider()` + `useAccount()`, driven through a viem `custom` transport so every write is `eth_sendTransaction` and every approval is `eth_signTypedData_v4` in MetaMask:

```ts
// The owner's main wallet on the phone. Two sources, same API:
//   { provider, address }  MetaMask (or any WalletConnect wallet) via Reown AppKit: every action is a native wallet prompt
//   { pk }                 non-custodial key held on this device (fallback when no Reown project ID / for rehearsals)
import { createPublicClient, createWalletClient, custom, http, parseEventLogs, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { API, RPC, loadConfig, transferTypedData, type Authorization, type Seller } from "./shared";
import { fisco } from "./appkit";

export const pub = () => createPublicClient({ chain: fisco, transport: http(RPC) });
/** Gas is free on FISCO, but the RPC wants a legacy tx with gas price 0. */
const fees = { gasPrice: 0n, type: "legacy" as const };

/** What AppKit's useProvider() returns for eip155 (EIP-1193 request, with an optional CAIP chain id). */
export type WalletProvider = { request<T = unknown>(args: { method: string; params?: unknown }, chain?: string): Promise<T> };
export type WalletSource = { pk: Hex } | { provider: WalletProvider; address: Address };

const FISCO_HEX = "0x4ee8"; // 20200
const CAIP = "eip155:20200";

/** Make sure the connected wallet is on the FISCO chain before it signs or sends anything. */
export async function ensureChain(p: WalletProvider) {
  if ((await p.request<string>({ method: "eth_chainId" }, CAIP)) === FISCO_HEX) return;
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: FISCO_HEX }] }, CAIP);
  } catch (e: any) {
    if (e?.code !== 4902) throw new Error("WRONG_CHAIN: switch your wallet to FISCO BCOS (chain 20200)");
    await p.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId: FISCO_HEX, chainName: "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: [RPC], blockExplorerUrls: [`${API}/explorer`] }],
    }, CAIP).catch(() => { throw new Error("WRONG_CHAIN: switch your wallet to FISCO BCOS (chain 20200)"); });
  }
}

export type PocketView = { address: Address; owner: Address; agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; revoked: boolean; balance: bigint; allowed: string[] };

export function ownerWallet(src: WalletSource) {
  const local = "pk" in src;
  const account = local ? privateKeyToAccount(src.pk) : src.address;
  const address: Address = local ? privateKeyToAccount(src.pk).address : src.address;
  const transport = local ? http(RPC) : custom({ request: ({ method, params }) => src.provider.request({ method, params }, CAIP) });
  const w = createWalletClient({ account, chain: fisco, transport });
  const ready = async () => { if (!local) await ensureChain(src.provider); };

  /** Sends the tx (a native MetaMask prompt for the provider source) and returns its hash. */
  async function send(address: Address, abi: any[], functionName: string, args: unknown[] = []) {
    await ready();
    return w.writeContract({ address, abi, functionName, args, account, chain: fisco, ...fees } as any);
  }
  async function write(address: Address, abi: any[], functionName: string, args: unknown[] = []) {
    const hash = await send(address, abi, functionName, args);
    const receipt = await pub().waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`transaction reverted: ${hash}`);
    return { hash, receipt };
  }
  const pocketWrite = async (p: Address, fn: string, args: unknown[] = []) => write(p, (await loadConfig()).abis.pocket, fn, args);

  return {
    address,
    kind: local ? ("device key" as const) : ("wallet app" as const),
    send,
    async balances() {
      const c = await loadConfig();
      const [ehkd, eth] = await Promise.all([
        pub().readContract({ address: c.token, abi: c.abis.erc20, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
        pub().getBalance({ address }),
      ]);
      return { ehkd, eth };
    },
    async createPocket(a: { agent: Address; cap: bigint; askAbove: bigint; expiresAt: bigint; sellers: Address[] }) {
      const c = await loadConfig();
      const { hash, receipt } = await write(c.factory, c.abis.factory, "create", [a.agent, a.cap, a.askAbove, a.expiresAt, a.sellers]);
      const [ev] = parseEventLogs({ abi: c.abis.factory, logs: receipt.logs, eventName: "PocketCreated" }) as any[];
      return { pocket: ev.args.pocket as Address, tx: hash };
    },
    fund: async (p: Address, amount: bigint) => { const c = await loadConfig(); return write(c.token, c.abis.erc20, "transfer", [p, amount]); },
    revoke: (p: Address) => pocketWrite(p, "revoke"),
    returnFunds: (p: Address) => pocketWrite(p, "returnFunds"),
    setSeller: (p: Address, s: Address, ok: boolean) => pocketWrite(p, "setSeller", [s, ok]),
    /** Co-sign the exact eHKD transfer the wallet tool layer built (payments above the ask-me threshold). */
    signTransfer: async (auth: Authorization): Promise<Hex> => {
      await ready();
      return w.signTypedData({ account, ...transferTypedData(auth) });
    },
  };
}
export type OwnerWallet = ReturnType<typeof ownerWallet>;

export async function readPocket(address: Address): Promise<PocketView> {
  const c = await loadConfig();
  const sellers: Seller[] = c.sellers;
  const r = (functionName: string, args: unknown[] = []) => pub().readContract({ address, abi: c.abis.pocket, functionName, args }) as Promise<any>;
  const [owner, agent, cap, askAbove, expiresAt, revoked, balance, flags] = await Promise.all([
    r("owner"), r("agent"), r("perPaymentCap"), r("askAbove"), r("expiresAt"), r("revoked"),
    pub().readContract({ address: c.token, abi: c.abis.erc20, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
    Promise.all(sellers.map((s) => r("sellerAllowed", [s.payTo]))),
  ]);
  return { address, owner, agent, cap, askAbove, expiresAt, revoked, balance, allowed: sellers.filter((_, i) => flags[i]).map((s) => s.id) };
}

export const pocketStatus = (p: PocketView, now = Date.now()) => (p.revoked ? "Revoked" : Number(p.expiresAt) * 1000 < now ? "Expired" : "Active");
```

Wiring in the app root (adapt to the Expo Router layout):

```tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Address, Hex } from "viem";
import { AppKit, AppKitProvider, useAccount, useAppKit, useProvider } from "@reown/appkit-react-native";
import { loadConfig, API, type Config } from "./src/lib/shared";
import { ownerWallet, type OwnerWallet, type WalletProvider } from "./src/lib/wallet";
import { loadKey, loadPockets, savePockets } from "./src/lib/keystore";
import { appKit } from "./src/lib/appkit";
import { usePolledEvents } from "./src/lib/events";
import { Setup } from "./src/screens/Setup";
import { Home } from "./src/screens/Home";
import { Pocket } from "./src/screens/Pocket";
import { Agent } from "./src/screens/Agent";
import { T, usePalette } from "./src/ui";

type Tab = "home" | "agent" | "pocket";

/** Device-key wallet (fallback, or when no Reown project ID is configured). */
function useDeviceKey() {
  const [pk, setPk] = useState<Hex | null | undefined>(undefined);
  useEffect(() => { loadKey().then(setPk).catch(() => setPk(null)); }, []);
  const wallet = useMemo(() => (pk ? ownerWallet({ pk }) : undefined), [pk]);
  return { wallet, loading: pk === undefined, setPk };
}

/** With AppKit: MetaMask (via WalletConnect) is the main wallet; every owner action is a native wallet prompt. */
function WithMetaMask() {
  const { address, isConnected } = useAccount();
  const { provider } = useProvider();
  const { open } = useAppKit();
  const key = useDeviceKey();
  const mm = useMemo(
    () => (isConnected && address && provider ? ownerWallet({ provider: provider as unknown as WalletProvider, address: address as Address }) : undefined),
    [isConnected, address, provider],
  );
  return (
    <>
      <Shell wallet={mm ?? key.wallet} loading={key.loading} setup={<Setup onReady={key.setPk} onConnectWallet={() => open()} />} />
      <AppKit />
    </>
  );
}

function DeviceKeyOnly() {
  const key = useDeviceKey();
  return <Shell wallet={key.wallet} loading={key.loading} setup={<Setup onReady={key.setPk} />} />;
}

export default function App() {
  // AppKit's modal reads safe-area insets: the provider is required here (no Expo Router to supply it).
  return (
    <SafeAreaProvider>
      {appKit ? <AppKitProvider instance={appKit}><WithMetaMask /></AppKitProvider> : <DeviceKeyOnly />}
    </SafeAreaProvider>
  );
}

function Shell(props: { wallet?: OwnerWallet; loading: boolean; setup: ReactNode }) {
  const p = usePalette();
  const { wallet } = props;
  const [cfg, setCfg] = useState<Config>();
  const [err, setErr] = useState("");
  const [pockets, setPockets] = useState<Address[]>([]);
  const [active, setActive] = useState<Address>();
  const [tab, setTab] = useState<Tab>("home");
  const [refresh, setRefresh] = useState(0);
  const events = usePolledEvents(active);
  const bump = () => setRefresh((n) => n + 1);

  useEffect(() => { loadConfig().then(setCfg).catch(() => setErr(`Wallet API not reachable at ${API}. On a phone, set EXPO_PUBLIC_API_URL to your laptop's LAN IP.`)); }, []);
  useEffect(() => {
    if (!wallet) return;
    loadPockets(wallet.address).then((list) => { setPockets(list); setActive(list[0]); });
  }, [wallet?.address]);
  useEffect(() => { if (events.at(-1)?.type === "payment") bump(); }, [events.length]);

  const addPocket = (a: Address) => {
    const next = [a, ...pockets.filter((x) => x.toLowerCase() !== a.toLowerCase())];
    setPockets(next);
    setActive(a);
    if (wallet) void savePockets(wallet.address, next);
  };

  let body;
  if (err) body = <T color={p.danger}>{err}</T>;
  else if (!cfg || props.loading) body = <T muted>Loading…</T>;
  else if (!wallet) body = props.setup;
  else if (tab === "home") body = <Home cfg={cfg} wallet={wallet} pockets={pockets} active={active} refresh={refresh} onOpen={(a) => { setActive(a); setTab("pocket"); }} onAdd={addPocket} onChanged={bump} />;
  else if (!active) body = <T muted>Create a pocket first.</T>;
  else if (tab === "agent") body = <Agent pocket={active} wallet={wallet} events={events} onChanged={bump} />;
  else body = <Pocket cfg={cfg} wallet={wallet} pocket={active} events={events} refresh={refresh} onChanged={bump} />;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56 }} keyboardShouldPersistTaps="handled">{body}</ScrollView>
      {wallet && cfg && (
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: p.line, backgroundColor: p.card, paddingBottom: 24 }}>
          {(["home", "agent", "pocket"] as Tab[]).map((t) => (
            <Pressable key={t} accessibilityRole="tab" onPress={() => setTab(t)} style={{ flex: 1, padding: 14, alignItems: "center" }}>
              <Text style={{ color: tab === t ? p.accent : p.muted, fontWeight: "600" }}>{t === "home" ? "Wallet" : t === "agent" ? "Agent" : "Pocket"}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
```

Tests for the MetaMask path (a recording mock stands in for the wallet; add to the mobile logic tests):

```ts
// ---- MetaMask via WalletConnect (AppKit provider), with a recording mock of the wallet ----
import { ensureChain, type WalletProvider } from "./wallet";

function mockWallet(o: { chainId?: string; onSign?: () => Promise<`0x${string}`>; switchFails?: boolean } = {}) {
  const calls: { method: string; params: any; chain?: string }[] = [];
  let chainId = o.chainId ?? "0x4ee8";
  const provider: WalletProvider = {
    async request({ method, params }: { method: string; params?: any }, chain?: string): Promise<any> {
      calls.push({ method, params, chain });
      if (method === "eth_chainId") return chainId;
      if (method === "wallet_switchEthereumChain") { if (o.switchFails) throw Object.assign(new Error("rejected"), { code: 4001 }); chainId = "0x4ee8"; return null; }
      if (method === "eth_signTypedData_v4") return o.onSign!();
      if (method === "eth_sendTransaction") return `0x${"ab".repeat(32)}`;
      if (method === "eth_estimateGas") return "0x5208";
      if (method === "eth_getTransactionCount") return "0x0";
      if (method === "eth_gasPrice" || method === "eth_maxPriorityFeePerGas") return "0x0";
      if (method === "eth_getBlockByNumber") return { baseFeePerGas: "0x1", number: "0x1" };
      throw new Error(`unexpected ${method}`);
    },
  };
  return { provider, calls };
}

test("MetaMask path: the co-sign is requested from the wallet as eth_signTypedData_v4 for FISCO (chain 20200)", async () => {
  const owner = privateKeyToAccount(PK);
  const { provider, calls } = mockWallet({ onSign: () => owner.signTypedData(transferTypedData(auth)) });
  const w = ownerWallet({ provider, address: owner.address });
  const sig = await w.signTransfer(auth);
  const req = calls.find((c) => c.method === "eth_signTypedData_v4")!;
  assert.equal(req.params[0].toLowerCase(), owner.address.toLowerCase());
  const td = JSON.parse(req.params[1]);
  assert.equal(td.primaryType, "TransferWithAuthorization");
  assert.equal(td.domain.chainId, 20200);
  assert.equal(td.message.value, "1500000");
  assert.ok(calls.every((c) => c.chain === "eip155:20200"));
  assert.equal(await recoverTypedDataAddress({ ...transferTypedData(auth), signature: sig }), owner.address);
});

test("MetaMask path: Revoke goes to the wallet as eth_sendTransaction to the pocket", async () => {
  const owner = privateKeyToAccount(PK);
  const { provider, calls } = mockWallet();
  const w = ownerWallet({ provider, address: owner.address });
  const pocket = "0x00000000000000000000000000000000000000cc";
  const abi = [{ type: "function", name: "revoke", inputs: [], outputs: [], stateMutability: "nonpayable" }];
  const hash = await w.send(pocket, abi, "revoke");
  assert.equal(hash, `0x${"ab".repeat(32)}`);
  const tx = calls.find((c) => c.method === "eth_sendTransaction")!.params[0];
  assert.equal(tx.to, pocket);
  assert.equal(tx.data, "0xb6549f75");
  assert.equal(tx.from.toLowerCase(), owner.address.toLowerCase());
});

test("MetaMask path: wrong chain is switched first; a refused switch is WRONG_CHAIN and nothing is signed", async () => {
  const ok = mockWallet({ chainId: "0x1" });
  await ensureChain(ok.provider);
  assert.equal(ok.calls[1].method, "wallet_switchEthereumChain");
  const no = mockWallet({ chainId: "0x1", switchFails: true, onSign: async () => { throw new Error("must not sign"); } });
  const w = ownerWallet({ provider: no.provider, address: privateKeyToAccount(PK).address });
  await assert.rejects(w.signTransfer(auth), /WRONG_CHAIN/);
  assert.ok(!no.calls.some((c) => c.method === "eth_signTypedData_v4"));
});
```

## To finish on a device

1. Create a free project at https://dashboard.reown.com and copy the project ID.
2. Expo Go: `EXPO_PUBLIC_REOWN_PROJECT_ID=<id> EXPO_PUBLIC_API_URL=http://<lan-ip>:8787 npx expo start`, scan the QR, tap **Connect MetaMask**, approve in MetaMask mobile (MetaMask adds the FISCO network, chain id 20200, symbol FISCO, on first use), switch back to Expo Go if it doesn't return by itself.
3. Before the first owner tx, tap **Get test funds** (the server faucet: native balance plus HK$100 eHKD). Expected: Create pocket, Fund, the approval sheet's **Approve and sign**, Revoke and Return funds each open a MetaMask prompt.
4. If Expo Go fails: same code as a development build, `npx expo run:android` with the phone on USB debugging (Android Studio, Android SDK, JDK 17). No code changes.

