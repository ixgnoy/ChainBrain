import { it, expect, afterEach } from "vitest";

// CoinGecko's ETH price comes from its public API, in HKD; any failure serves the stored file (null here).
const was = process.env.COINGECKO_LIVE;
afterEach(() => { process.env.COINGECKO_LIVE = was; });
const reply = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

it("formats the live price in HKD, caches it for a minute, and falls back on any failure", async () => {
  process.env.COINGECKO_LIVE = "on";
  const { liveEthPrice } = await import("../src/sellers");
  const t = 1_800_000_000_000;
  const md = await liveEthPrice(reply({ ethereum: { hkd: 18842.57, hkd_24h_vol: 83445322940.1, hkd_24h_change: 1.5546, last_updated_at: 1792428200 } }), t);
  expect(md).toContain("# ETH price (CoinGecko, simple price, live)");
  expect(md).toContain("- ethereum: 18,843 HKD");
  expect(md).toContain("- 24 h change: +1.55%");
  expect(md).toContain("- 24 h volume: 83.45 billion HKD");
  expect(md).toContain("HKT");
  expect(md).not.toMatch(/US\$|USD|usd/);
  expect(await liveEthPrice(reply({}, false), t + 30_000)).toBe(md); // cached inside the minute
  expect(await liveEthPrice(reply({}, false), t + 61_000)).toBeNull(); // HTTP error → stored file
  expect(await liveEthPrice(reply({ ethereum: {} }), t + 122_000)).toBeNull(); // no price → stored file
  expect(await liveEthPrice((async () => { throw new Error("offline"); }) as unknown as typeof fetch, t + 183_000)).toBeNull();
  process.env.COINGECKO_LIVE = "off";
  expect(await liveEthPrice(reply({ ethereum: { hkd: 1 } }), t + 244_000)).toBeNull();
});
