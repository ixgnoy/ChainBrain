// Create and fund a pocket from OWNER without the app (CLI scenes, rehearsals).
// Usage: pnpm tsx scripts/new-pocket.ts research|tight      research = US$5, cap 2, ask above 1, DataLite + DataPro, until tonight
//                                                           tight    = US$0.20, cap 0.20, never ask, DataLite (scene 8)
import "dotenv/config";
import { createWalletClient, http, publicActions, parseEventLogs, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { factoryAbi, factoryAddress, erc20Abi, USDC, usdcBalance } from "../src/wallet/chain";
import { sellerPayTo } from "../src/sellers";

const kind = process.argv[2] ?? "research";
const presets = {
  research: { budget: 5_000_000n, cap: 2_000_000n, askAbove: 1_000_000n, sellers: ["datalite", "datapro"] },
  tight: { budget: 200_000n, cap: 200_000n, askAbove: 2n ** 256n - 1n, sellers: ["datalite"] },
} as const;
const p = presets[kind as keyof typeof presets];
if (!p) throw new Error("usage: new-pocket.ts research|tight");

const owner = privateKeyToAccount(process.env.OWNER_PK as Hex);
const agent = privateKeyToAccount(process.env.AGENT_PK as Hex).address;
const w = createWalletClient({ account: owner, chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC) }).extend(publicActions);
const payTo = sellerPayTo();
const tonight = new Date();
tonight.setHours(23, 59, 0, 0);

const create = await w.writeContract({
  address: factoryAddress(), abi: factoryAbi, functionName: "create",
  args: [agent, p.cap, p.askAbove, BigInt(Math.floor(tonight.getTime() / 1000)), p.sellers.map((s) => payTo[s])],
} as any);
const [ev] = parseEventLogs({ abi: factoryAbi, logs: (await w.waitForTransactionReceipt({ hash: create })).logs, eventName: "PocketCreated" }) as any[];
const fund = await w.writeContract({ address: USDC, abi: erc20Abi, functionName: "transfer", args: [ev.args.pocket, p.budget] });
await w.waitForTransactionReceipt({ hash: fund });
console.log(`create https://sepolia.basescan.org/tx/${create}\nfund   https://sepolia.basescan.org/tx/${fund}`);
console.log(`POCKET=${ev.args.pocket} balance=${await usdcBalance(ev.args.pocket)}`);
