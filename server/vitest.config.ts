import { defineConfig } from "vitest/config";

export default defineConfig({
  // server/.env (model key, AGENT_MODEL, ANTHROPIC_BASE_URL) is read only for the scenes run; the other tests stay offline
  test: { testTimeout: 180_000, hookTimeout: 180_000, include: ["test/**/*.test.ts"], fileParallelism: false,
    // visitor auth and rate limits have their own tests (visitors-chain.test.ts); the rest of the suite runs without them, in memory
    // no real model calls (index.ts loads server/.env, which may hold a key) except in the opt-in SCENES run
    env: { VISITOR_AUTH: "off", DATA_DIR: "memory", RATE_LIMIT_PER_MIN: "1000000", RATE_LIMIT_GET_PER_MIN: "1000000", ...(process.env.SCENES ? {} : { LLM_PROVIDER: "scripted" }) },
    setupFiles: process.env.SCENES ? ["dotenv/config"] : [] },
});
