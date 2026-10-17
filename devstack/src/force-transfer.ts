// Scene 5's on-chain backstop against the dev stack: runs the team's server/scripts/force-transfer.ts with the dev keys
// and the stack's own Mock e-HKD (from its /api/config). Usage: pnpm --dir devstack force-transfer <pocket>
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DEV_KEYS } from "./stack";

const pocket = process.argv[2];
if (!pocket) throw new Error("usage: pnpm --dir devstack force-transfer <pocket address>");
const api = process.env.API_URL ?? "http://localhost:8787";
const cfg = (await (await fetch(`${api}/api/config`)).json()) as { token: string; factory: string };
const r = spawnSync("npx", ["tsx", "scripts/force-transfer.ts", pocket], {
  cwd: fileURLToPath(new URL("../../server/", import.meta.url)),
  env: { ...process.env, ...DEV_KEYS, TOKEN_ADDRESS: cfg.token, FACTORY_ADDRESS: cfg.factory },
  stdio: "inherit",
  shell: process.platform === "win32", // npx is npx.cmd on Windows
});
process.exit(r.status ?? 1);
