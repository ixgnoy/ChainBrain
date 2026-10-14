// Scene 5's on-chain backstop against the dev stack: runs the team's server/scripts/force-transfer.ts with the dev keys.
// Usage: pnpm --dir devstack force-transfer <pocket>
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DEV_KEYS } from "./stack";

const pocket = process.argv[2];
if (!pocket) throw new Error("usage: pnpm --dir devstack force-transfer <pocket address>");
const r = spawnSync("npx", ["tsx", "scripts/force-transfer.ts", pocket], {
  cwd: fileURLToPath(new URL("../../server/", import.meta.url)),
  env: { ...process.env, ...DEV_KEYS, BASE_SEPOLIA_RPC: process.env.BASE_SEPOLIA_RPC ?? "http://127.0.0.1:8546" },
  stdio: "inherit",
});
process.exit(r.status ?? 1);
