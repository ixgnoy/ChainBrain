import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * A tiny JSON-file table for state that must survive a restart (visitors now; approvals, chats and memory later).
 * DATA_DIR is the Railway volume in production (default server/.data). Writes are debounced and atomic (tmp + rename).
 * DATA_DIR=memory keeps everything in memory (tests).
 */
const dir = () => process.env.DATA_DIR ?? new URL("../.data/", import.meta.url).pathname;

export function table<T>(name: string) {
  const mem = () => (process.env.DATA_DIR ?? "") === "memory";
  let rows: Record<string, T> | undefined;
  let timer: NodeJS.Timeout | undefined;
  const file = () => join(dir(), `${name}.json`);
  const load = () => {
    if (rows) return rows;
    rows = {};
    if (!mem() && existsSync(file())) {
      try { rows = JSON.parse(readFileSync(file(), "utf8")); } catch { rows = {}; }
    }
    return rows!;
  };
  const flush = () => {
    timer = undefined;
    if (mem() || !rows) return;
    mkdirSync(dir(), { recursive: true });
    writeFileSync(`${file()}.tmp`, JSON.stringify(rows));
    renameSync(`${file()}.tmp`, file());
  };
  return {
    get: (k: string): T | undefined => load()[k],
    set(k: string, v: T) {
      load()[k] = v;
      if (!timer) timer = setTimeout(flush, 200);
    },
    all: (): T[] => Object.values(load()),
    /** Write now (tests, shutdown). */
    flush,
    /** Forget the in-memory copy (tests). */
    reset() { rows = undefined; },
  };
}
