import { describe, expect, it } from "vitest";
import { chainIndex, loadHistory } from "./chain";

// A fake FISCO node: returns logs only within 10 blocks of fromBlock (like the local 3.16.4 node), and records every call.
function fakeNode(logs: { block: bigint; kind: "created" | "transfer" | "revoked"; args?: any; address?: string }[], head: { n: bigint }) {
  const calls: { address: unknown; from: bigint; to: bigint; event?: string }[] = [];
  const client = {
    getBlockNumber: async () => head.n,
    getLogs: async (q: any) => {
      calls.push({ address: q.address, from: q.fromBlock, to: q.toBlock, event: q.event?.name ?? "many" });
      const to = q.toBlock < q.fromBlock + 9n ? q.toBlock : q.fromBlock + 9n; // the node's silent truncation
      return logs.filter((l) => l.block >= q.fromBlock && l.block <= to).filter((l) =>
        q.event?.name === "PocketCreated" ? l.kind === "created" : q.event?.name === "Transfer" ? l.kind === "transfer"
        : l.kind === "revoked" && (q.address as string[]).map((a) => a.toLowerCase()).includes(l.address!.toLowerCase()),
      ).map((l, i) => ({ blockNumber: l.block, logIndex: i, transactionHash: `0x${l.block.toString(16).padStart(64, "0")}`, address: l.address ?? "0xf", args: l.args ?? {}, eventName: l.kind === "revoked" ? "Revoked" : undefined }));
    },
  };
  return { client: client as any, calls };
}

const P = "0x00000000000000000000000000000000000000a1";
const OWNER = "0x00000000000000000000000000000000000000b0";
const SELLER = "0x00000000000000000000000000000000000000c5";
const cfg = { factory: "0x00000000000000000000000000000000000000f1", token: "0x00000000000000000000000000000000000000e1", sellers: [{ id: "datalite", payTo: SELLER }] } as any;

describe("the console's chain index", () => {
  it("never asks for more than 10 blocks, so a truncating node loses nothing", async () => {
    const head = { n: 45n };
    const { client, calls } = fakeNode([
      { block: 3n, kind: "created", args: { pocket: P, owner: OWNER } },
      { block: 4n, kind: "transfer", args: { from: OWNER, to: P, value: 20_000_000n } },
      { block: 37n, kind: "transfer", args: { from: P, to: SELLER, value: 1_500_000n } },
      { block: 44n, kind: "revoked", address: P },
    ], head);
    const idx = chainIndex(client, cfg);
    await idx.sync(0n);
    expect(calls.every((c) => c.to - c.from <= 9n)).toBe(true);
    expect([idx.created.length, idx.transfers.length, idx.pocketLogs.length]).toEqual([1, 2, 1]);
    const pocket = { address: P, owner: OWNER, createdTx: "0x1", createdBlock: 3n } as any;
    expect(loadHistory({ ...cfg, abis: {} }, [pocket], idx).map((t) => t.kind)).toEqual(["create", "fund", "payment", "revoke"]);
  });

  it("scans only the new blocks on the next sync", async () => {
    const head = { n: 20n };
    const { client, calls } = fakeNode([{ block: 25n, kind: "transfer", args: { from: OWNER, to: P, value: 1n } }], head);
    const idx = chainIndex(client, cfg);
    await idx.sync(0n);
    const first = calls.length;
    head.n = 26n;
    await idx.sync(0n);
    expect(calls.slice(first).every((c) => c.from >= 21n)).toBe(true);
    expect(idx.transfers.length).toBe(1);
    const before = calls.length;
    await idx.sync(0n); // nothing new: no calls
    expect(calls.length).toBe(before);
  });
});
