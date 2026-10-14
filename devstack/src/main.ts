import { startDevStack } from "./stack";

const forkUrl = process.env.FORK_URL ?? "https://sepolia.base.org";
console.log(`Starting ChainBrain dev stack (anvil fork of ${forkUrl}) ...`);
// API_PORT / SELLERS_PORT / ANVIL_PORT let a second stack run beside the default one (8787 / 4021 / 8546).
const port = (k: string) => (process.env[k] ? Number(process.env[k]) : undefined);
const s = await startDevStack({ log: (m) => console.log(m), apiPort: port("API_PORT"), sellersPort: port("SELLERS_PORT"), anvilPort: port("ANVIL_PORT") });

const line = "=".repeat(68);
console.log(`
${line}
 ChainBrain DEV STACK  (LOCAL FORK, scripted model, no real funds)
${line}
 Wallet API (web, laptop)  ${s.apiUrl}
 Wallet API (phone, LAN)   ${s.lanApiUrl ?? "no LAN address found; phone cannot connect"}
 Chain RPC via proxy       ${s.apiUrl}/dev/rpc   (anvil itself: 127.0.0.1:${s.anvilPort}, chain id 84532)
 Sellers (real, x402)      ${s.sellersUrl}
 Demo sentences            ${s.apiUrl}/dev/scenes
 Dev health                ${s.apiUrl}/dev/health
 Factory                   ${s.factory}
 Owner (anvil account 0)   ${s.owner}   1000 USDC, 10000 ETH
${line}
 Web:    VITE_API_URL=${s.apiUrl} pnpm --dir web dev
 Phone:  EXPO_PUBLIC_API_URL=${s.lanApiUrl ?? "http://<LAN IP>:" + s.apiPort} EXPO_PUBLIC_RPC_URL=${s.lanApiUrl ?? "http://<LAN IP>:" + s.apiPort}/dev/rpc npx expo start
 Stop:   Ctrl+C
${line}
`);

const stop = async () => { await s.stop().catch(() => {}); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
