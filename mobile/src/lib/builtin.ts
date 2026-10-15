// The network built into the app (shared/sim): the same wallet API, tools, agent and pocket rules as the server, running
// on the phone. The app opens on it every launch, already lived in (two pockets, earlier purchases). No React Native
// imports, so Node tests can load it.
import { recoverTypedDataAddress, type Hex } from "viem";
import { createWorld, seedOwner, claudeAsksForPremium, type World, type SeededPocket, type OwnerTxSeed } from "../../../shared/sim";
import { transferTypedData, type Authorization } from "./typed";

let world: World | null = null;
const seeded = new Map<string, Promise<{ pockets: SeededPocket[]; ownerTxs: OwnerTxSeed[] }>>();

export function builtin(): World {
  world ??= createWorld({
    seed: Math.floor(Math.random() * 2 ** 31),
    revokeWindowMs: 9000,
    // the owner's co-signature is checked exactly like the server does (server/src/index.ts)
    verifyOwnerSig: async (auth, signature, owner) => {
      const signer = await recoverTypedDataAddress({ ...transferTypedData(auth as Authorization), signature: signature as Hex });
      return signer.toLowerCase() === owner.toLowerCase();
    },
  });
  return world;
}

/** Earlier activity for this owner, created once per launch. */
export function seedFor(owner: string) {
  const k = owner.toLowerCase();
  if (!seeded.has(k)) seeded.set(k, seedOwner(builtin(), owner as Hex));
  return seeded.get(k)!;
}

/** Outside agents keep working after launch: Claude asks the owner to co-sign a premium report ~12 s in (the intro is
 *  over by then). Once per world. It waits in the Approvals inbox and expires unanswered after 10 minutes. */
let outsideStarted: World | null = null;
export function startOutsideAgents(pockets: SeededPocket[], delayMs = 12_000) {
  const w = builtin();
  if (outsideStarted === w) return;
  outsideStarted = w;
  const news = pockets.find((p) => p.agent === "claude");
  if (!news) return;
  setTimeout(() => { if (world === w) void claudeAsksForPremium(w, news.address).catch(() => {}); }, delayMs);
}

/** Tests: start over. */
export function resetBuiltin() { world = null; seeded.clear(); outsideStarted = null; }
