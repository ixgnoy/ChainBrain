import { it, expect, vi } from "vitest";
import { detectDev } from "./dev";

const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cfFFb92266";
const health = { mode: "local-chain", chainId: 20200, rpcPath: "/dev/rpc", startedAt: 1, owner: OWNER };
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

it("detects the dev stack from GET /dev/health", async () => {
  const f = vi.fn(() => json(health)) as unknown as typeof fetch;
  expect(await detectDev("http://api", f)).toMatchObject({ mode: "local-chain", owner: OWNER, rpcPath: "/dev/rpc" });
  expect((f as any).mock.calls[0][0]).toBe("http://api/dev/health");
});
it("is not dev mode on the real server (404), another mode, bad JSON, or when unreachable", async () => {
  expect(await detectDev("http://api", (() => json("Not Found", 404)) as any)).toBeNull();
  expect(await detectDev("http://api", (() => json({ mode: "mock" })) as any)).toBeNull();
  expect(await detectDev("http://api", (() => Promise.resolve(new Response("<html>", { status: 200 }))) as any)).toBeNull();
  expect(await detectDev("http://api", (() => Promise.reject(new TypeError("fetch failed"))) as any)).toBeNull();
});
