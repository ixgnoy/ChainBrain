/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDev, setApiUrl, setDev, setSource, rpcUrl, explorerEnabled, txUrl, ENV_RPC } from "./runtime";

const res = (status: number, body?: unknown) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => { if (body === undefined) throw new Error("not json"); return body; }, text: async () => "" });

test("dev stack detected from GET /dev/health", async () => {
  const d = await detectDev("http://x:8787/", res(200, { mode: "local-fork", chainId: 84532, rpcPath: "/dev/rpc", owner: "0x1" }));
  assert.equal(d?.mode, "local-fork");
  assert.equal(d?.rpcPath, "/dev/rpc");
});

test("real server (404), garbage, wrong mode and network errors mean no dev mode", async () => {
  assert.equal(await detectDev("http://x", res(404)), null);
  assert.equal(await detectDev("http://x", res(200)), null);
  assert.equal(await detectDev("http://x", res(200, { mode: "other" })), null);
  assert.equal(await detectDev("http://x", async () => { throw new Error("down"); }), null);
});

test("RPC and explorer follow dev mode; real path keeps EXPO_PUBLIC_RPC_URL and BaseScan", () => {
  assert.equal(txUrl("0xab"), undefined, "the built-in network (default) never links to BaseScan");
  setSource("server");
  setApiUrl("http://192.168.1.5:8787/");
  assert.equal(rpcUrl(), ENV_RPC);
  assert.equal(explorerEnabled(), true);
  assert.match(txUrl("0xab")!, /sepolia\.basescan\.org\/tx\/0xab$/);
  setDev({ mode: "local-fork", chainId: 84532, rpcPath: "/dev/rpc" });
  assert.equal(rpcUrl(), "http://192.168.1.5:8787/dev/rpc");
  assert.equal(explorerEnabled(), false);
  assert.equal(txUrl("0xab"), undefined);
  setApiUrl("http://other:8787");
  assert.equal(rpcUrl(), ENV_RPC, "changing the API URL clears dev mode until it is detected again");
});
