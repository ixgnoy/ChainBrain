// Create and fund a pocket from OWNER without the app (CLI scenes, rehearsals).
// Usage: pnpm tsx scripts/new-pocket.ts research|tight   (amounts per chain in src/chains.ts presets)
//   research = FISCO HK$40, cap 15, ask above 8 | Base US$5, cap 2, ask above 1; DataLite + DataPro, until tonight
//   tight    = FISCO HK$1.50 | Base US$0.20, cap = budget, never ask, DataLite only (scene 8)
import "dotenv/config";
import { createWalletClient, http, publicActions, parseEventLogs, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cfg, presets } from "../src/chains";
import { factoryAbi, factoryAddress, erc20Abi, tokenBalance } from "../src/wallet/chain";
import { sellerPayTo } from "../src/sellers";

const kind = process.argv[2] ?? "research";
const sellers = { research: ["datalite", "datapro"], tight: ["datalite"] };
const all = presets();
if (!(kind in all)) throw new Error("usage: new-pocket.ts research|tight");
const p = { ...all[kind as keyof typeof all], sellers: sellers[kind as keyof typeof sellers] };

const owner = privateKeyToAccount(process.env.OWNER_PK as Hex);
const agent = privateKeyToAccount(process.env.AGENT_PK as Hex).address;
const w = createWalletClient({ account: owner, chain: cfg().chain, transport: http(cfg().rpc) }).extend(publicActions);
const payTo = sellerPayTo();
const tonight = new Date();
tonight.setHours(23, 59, 0, 0);

const create = await w.writeContract({
  address: factoryAddress(), abi: factoryAbi, functionName: "create",
  args: [agent, p.cap, p.askAbove, BigInt(Math.floor(tonight.getTime() / 1000)), p.sellers.map((s) => payTo[s])],
} as any);
const [ev] = parseEventLogs({ abi: factoryAbi, logs: (await w.waitForTransactionReceipt({ hash: create })).logs, eventName: "PocketCreated" }) as any[];
const fund = await w.writeContract({ address: cfg().token, abi: erc20Abi, functionName: "transfer", args: [ev.args.pocket, p.budget] });
await w.waitForTransactionReceipt({ hash: fund });
console.log(`create ${cfg().txUrl(create)}\nfund   ${cfg().txUrl(fund)}`);
console.log(`POCKET=${ev.args.pocket} balance=${await tokenBalance(ev.args.pocket)}`);
