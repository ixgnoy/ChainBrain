import { beforeEach, expect, it, vi } from "vitest";
import { applyServerParam, loadSource, resetSource, savedUrl, setSource, testConnection } from "./source";

const loc = (search: string, hash = "#live") => ({ search, pathname: "/", hash }) as Location;
const hist = () => ({ replaceState: vi.fn() }) as unknown as History;
beforeEach(() => { localStorage.clear(); resetSource(); });

it("opens on the built-in network by default", () => {
  expect(loadSource()).toEqual({ kind: "demo" });
});

it("remembers a custom server and goes back to the built-in network", () => {
  setSource({ kind: "live", url: "http://localhost:8787/" });
  expect(localStorage.getItem("cb.source")).toBe("live");
  expect(loadSource()).toEqual({ kind: "live", url: "http://localhost:8787" });
  setSource({ kind: "demo" });
  expect(loadSource()).toEqual({ kind: "demo" });
  expect(savedUrl()).toBe("http://localhost:8787"); // kept for the next time the switch is turned on
});

it("?server=<url> switches to that server and is removed from the address bar; ?server=builtin goes back", () => {
  const h = hist();
  expect(applyServerParam(loc("?server=http://127.0.0.1:8787&x=1"), h)).toBe(true);
  expect(loadSource()).toEqual({ kind: "live", url: "http://127.0.0.1:8787" });
  expect((h.replaceState as any).mock.calls[0][2]).toBe("/?x=1#live");
  expect(applyServerParam(loc("?server=builtin"), hist())).toBe(true);
  expect(loadSource()).toEqual({ kind: "demo" });
  expect(applyServerParam(loc(""), hist())).toBe(false);
});

it("tests a connection: time on success, a reason on failure", async () => {
  const ok = vi.fn(async () => new Response(JSON.stringify({ factory: "0x1" }))) as unknown as typeof fetch;
  let t = 0;
  expect(await testConnection("http://api/", ok, 5000, () => (t += 42))).toEqual({ ok: true, ms: 42 });
  expect((ok as any).mock.calls[0][0]).toBe("http://api/api/config");
  expect(await testConnection("http://api", (async () => new Response("x", { status: 500 })) as any)).toEqual({ ok: false, error: "The server answered 500" });
  expect(await testConnection("http://api", (async () => new Response("<html>")) as any)).toMatchObject({ ok: false, error: "Not a ChainBrain server" });
  expect(await testConnection("http://api", (async () => { throw new TypeError("fetch failed"); }) as any)).toMatchObject({ ok: false });
});
