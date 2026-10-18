import { startDevStack } from "./stack";

const rpc = process.env.FISCO_RPC ?? "http://127.0.0.1:8545";
console.log(`Starting ChainBrain dev stack on the FISCO node at ${rpc} ...`);
// API_PORT / SELLERS_PORT let a second stack run beside the default one (8787 / 4021).
const port = (k: string) => (process.env[k] ? Number(process.env[k]) : undefined);
const s = await startDevStack({ log: (m) => console.log(m), apiPort: port("API_PORT"), sellersPort: port("SELLERS_PORT"), rpc });

const line = "=".repeat(68);
console.log(`
${line}
 ChainBrain DEV STACK  (FISCO BCOS, fresh Mock e-HKD, scripted model)
${line}
 Wallet API (web, laptop)  ${s.apiUrl}
 Wallet API (phone, LAN)   ${s.lanApiUrl ?? "no LAN address found; phone cannot connect"}
 Chain RPC via proxy       ${s.apiUrl}/dev/rpc   (FISCO node: ${s.rpc}, chain id 20200)
 Sellers (real, x402)      ${s.sellersUrl}
 Demo sentences            ${s.apiUrl}/dev/scenes
 Dev health                ${s.apiUrl}/dev/health
 Mock e-HKD / factory      ${s.token} / ${s.factory}
 Owner (dev account 0)     ${s.owner}   HK$8,000 eHKD
${line}
 Web:    VITE_API_URL=${s.apiUrl} pnpm --dir web dev
 Phone:  EXPO_PUBLIC_API_URL=${s.lanApiUrl ?? "http://<LAN IP>:" + s.apiPort} EXPO_PUBLIC_RPC_URL=${s.lanApiUrl ?? "http://<LAN IP>:" + s.apiPort}/dev/rpc npx expo start
 Explorer: ${s.apiUrl}/explorer      Faucet: ${s.apiUrl}/faucet
 Stop:   Ctrl+C
${line}
`);

const stop = async () => { await s.stop().catch(() => {}); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
