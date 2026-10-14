import { it, expect, vi } from "vitest";
import { detectDev, devRpcUrl, loadScenes, fundDevSigner } from "./dev";
import { createDevProvider } from "./devSigner";
import { ensureChain } from "./wallet";

const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cfFFb92266";
const health = { mode: "local-fork", chainId: 84532, rpcPath: "/dev/rpc", startedAt: 1, owner: OWNER };
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

it("detects the dev stack from GET /dev/health", async () => {
  const f = vi.fn(() => json(health)) as unknown as typeof fetch;
  expect(await detectDev("http://api", f)).toMatchObject({ mode: "local-fork", owner: OWNER, rpcPath: "/dev/rpc" });
  expect((f as any).mock.calls[0][0]).toBe("http://api/dev/health");
});
it("is not dev mode on the real server (404), another mode, bad JSON, or when unreachable", async () => {
  expect(await detectDev("http://api", (() => json("Not Found", 404)) as any)).toBeNull();
  expect(await detectDev("http://api", (() => json({ mode: "mock" })) as any)).toBeNull();
  expect(await detectDev("http://api", (() => Promise.resolve(new Response("<html>", { status: 200 }))) as any)).toBeNull();
  expect(await detectDev("http://api", (() => Promise.reject(new TypeError("fetch failed"))) as any)).toBeNull();
});
it("builds the RPC url and loads demo scenes only from a good response", async () => {
  expect(devRpcUrl({ rpcPath: "/dev/rpc" }, "http://api/")).toBe("http://api/dev/rpc");
  const scenes = await loadScenes("http://api", (() => json([{ id: "1", title: "Research", text: "Get me a report", preset: "research", note: "n" }, { nope: 1 }])) as any);
  expect(scenes).toEqual([{ id: "1", title: "Research", text: "Get me a report", preset: "research", note: "n" }]);
  expect(await loadScenes("http://api", (() => json({}, 404)) as any)).toEqual([]);
});
it("funds the dev signer through POST /dev/fund and surfaces failures", async () => {
  const f = vi.fn(() => json({ address: OWNER, eth: "1", usdc: "20" }));
  await fundDevSigner(OWNER as any, "http://api", f as any);
  expect((f.mock.calls[0] as any)[1]).toMatchObject({ method: "POST", body: JSON.stringify({ address: OWNER }) });
  await expect(fundDevSigner(OWNER as any, "http://api", (() => json({}, 500)) as any)).rejects.toThrow("HTTP 500");
});

const rpc = (result: unknown) => vi.fn((_u: unknown, init: any) => json({ jsonrpc: "2.0", id: JSON.parse(init.body).id, result }));
it("dev signer answers account and chain-switch calls locally", async () => {
  const f = vi.fn();
  const p = createDevProvider("http://api/dev/rpc", OWNER as any, f as any);
  expect(await p.request({ method: "eth_requestAccounts" })).toEqual([OWNER]);
  expect(await p.request({ method: "eth_accounts" })).toEqual([OWNER]);
  expect(await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x14a34" }] })).toBeNull();
  expect(f).not.toHaveBeenCalled();
});
it("dev signer forwards everything else to /dev/rpc as JSON-RPC and sets `from` on transactions", async () => {
  const f = rpc("0x14a34");
  const p = createDevProvider("http://api/dev/rpc", OWNER as any, f as any);
  expect(await p.request({ method: "eth_chainId" })).toBe("0x14a34");
  const body = JSON.parse((f.mock.calls[0] as any)[1].body);
  expect(body).toMatchObject({ jsonrpc: "2.0", method: "eth_chainId", params: [] });
  await p.request({ method: "eth_sendTransaction", params: [{ to: "0x1", data: "0x" }] });
  expect(JSON.parse((f.mock.calls[1] as any)[1].body).params[0]).toMatchObject({ from: OWNER, to: "0x1" });
  await p.request({ method: "eth_signTypedData_v4", params: [OWNER, "{}"] });
  expect(JSON.parse((f.mock.calls[2] as any)[1].body)).toMatchObject({ method: "eth_signTypedData_v4", params: [OWNER, "{}"] });
});
it("dev signer turns JSON-RPC errors and HTTP failures into errors", async () => {
  const bad = vi.fn(() => json({ jsonrpc: "2.0", id: 1, error: { code: -32000, message: "execution reverted" } }));
  await expect(createDevProvider("u", OWNER as any, bad as any).request({ method: "eth_call" })).rejects.toMatchObject({ message: "execution reverted", code: -32000 });
  await expect(createDevProvider("u", OWNER as any, (() => json({}, 502)) as any).request({ method: "eth_call" })).rejects.toThrow("HTTP 502");
});
it("ensureChain accepts the dev signer (already on 84532)", async () => {
  const p = createDevProvider("u", OWNER as any, rpc("0x14a34") as any);
  await expect(ensureChain(p)).resolves.toBeUndefined();
});
