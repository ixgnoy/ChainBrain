import type { Context, MiddlewareHandler } from "hono";

/** The caller's IP: Railway's proxy sets x-real-ip / x-forwarded-for (first hop). */
export const ipOf = (c: Context) => c.req.header("x-real-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

/** A sliding-window counter: hit(key) is true while the key has had fewer than `max()` hits in the last `windowMs`. */
export function slidingWindow(windowMs: number, max: () => number) {
  const hits = new Map<string, number[]>();
  return {
    hit(key: string): boolean {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max()) { hits.set(key, recent); return false; }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 50_000) hits.clear(); // a flood of distinct keys: start over rather than grow without bound
      return true;
    },
    clear: () => hits.clear(),
  };
}

const num = (k: string, d: number) => Number(process.env[k] ?? d);
const writes = slidingWindow(60_000, () => num("RATE_LIMIT_PER_MIN", 60));
const reads = slidingWindow(60_000, () => num("RATE_LIMIT_GET_PER_MIN", 600));

/** Per-IP limits on the API: writes (POST) RATE_LIMIT_PER_MIN, reads RATE_LIMIT_GET_PER_MIN. SSE is not counted. */
export const rateLimit = (): MiddlewareHandler => async (c, next) => {
  if (c.req.method === "OPTIONS" || c.req.path === "/api/events") return next();
  const ok = (c.req.method === "GET" || c.req.method === "HEAD" ? reads : writes).hit(ipOf(c));
  if (!ok) return c.json({ error: "RATE_LIMITED" }, 429);
  return next();
};

export const resetLimits = () => { writes.clear(); reads.clear(); };
