// Creates every demo key once and appends it to server/.env (never overwrites). Prints addresses to fund.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { existsSync, appendFileSync, readFileSync } from "node:fs";

const names = ["OWNER", "AGENT", "FORCE", "FACILITATOR", "SELLER_DATALITE", "SELLER_DATAPRO", "SELLER_HARBOUR_WINES", "SELLER_SHADYFEED"];
const fund: Record<string, string> = { OWNER: "ETH + 20 USDC", FORCE: "ETH", FACILITATOR: "ETH (only if FACILITATOR=local)" };
const file = new URL("../.env", import.meta.url);
if (!existsSync(file)) appendFileSync(file, readFileSync(new URL("../.env.example", import.meta.url), "utf8").replace(/^(\w+_PK)=$/gm, ""));
const existing = readFileSync(file, "utf8");
for (const n of names) {
  const m = new RegExp(`^${n}_PK=(0x[0-9a-f]{64})$`, "m").exec(existing);
  const pk = (m?.[1] ?? generatePrivateKey()) as `0x${string}`;
  if (!m) appendFileSync(file, `${n}_PK=${pk}\n`);
  console.log(`${n.padEnd(22)} ${privateKeyToAccount(pk).address}  ${fund[n] ? `fund: ${fund[n]}` : ""}`);
}
