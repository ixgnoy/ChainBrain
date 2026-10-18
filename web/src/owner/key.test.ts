import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createBrowserKey, createPasskeyKey, loadStored, markBackedUp, unlock } from "./key";

// A fake passkey: PRF output is a fixed function of the salt, like a real authenticator's HMAC.
function fakePasskeys(o: { prfAtCreate: boolean; prfAtGet: boolean; enabled?: boolean }) {
  const prf = async (salt: BufferSource) => new Uint8Array(await crypto.subtle.digest("SHA-256", salt as ArrayBuffer));
  const create = vi.fn(async ({ publicKey }: any) => {
    const out = o.prfAtCreate ? await prf(publicKey.extensions.prf.eval.first) : undefined;
    return { rawId: new Uint8Array([1, 2, 3]).buffer, getClientExtensionResults: () => ({ prf: { enabled: o.enabled ?? o.prfAtCreate, ...(out ? { results: { first: out.buffer } } : {}) } }) };
  });
  const get = vi.fn(async ({ publicKey }: any) => {
    const out = o.prfAtGet ? await prf(publicKey.extensions.prf.eval.first) : undefined;
    return { getClientExtensionResults: () => ({ prf: out ? { results: { first: out.buffer } } : {} }) };
  });
  vi.stubGlobal("navigator", { ...navigator, credentials: { create, get } });
  return { create, get };
}

const PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("the console's owner key", () => {
  it("wraps the key with the passkey's PRF output and unlocks it back; nothing readable is stored", async () => {
    fakePasskeys({ prfAtCreate: true, prfAtGet: true });
    const k = await createPasskeyKey(PK);
    expect(k?.method).toBe("passkey");
    expect(k?.address).toBe(privateKeyToAccount(PK).address);
    expect(localStorage.getItem("cb.owner.v1")).not.toContain(PK.slice(2));
    expect(await unlock(loadStored()!)).toBe(PK);
  });

  it("asks the passkey again when creation says PRF is enabled but returns no output", async () => {
    const { get } = fakePasskeys({ prfAtCreate: false, prfAtGet: true, enabled: true });
    expect((await createPasskeyKey(PK))?.method).toBe("passkey");
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("returns null (keep it in the browser instead) when the passkey gives no PRF output at all", async () => {
    fakePasskeys({ prfAtCreate: false, prfAtGet: false, enabled: true });
    expect(await createPasskeyKey(PK)).toBeNull();
    expect(loadStored()).toBeNull();
  });

  it("refuses a passkey that unlocks to a different key", async () => {
    fakePasskeys({ prfAtCreate: true, prfAtGet: true });
    const k = (await createPasskeyKey(PK))!;
    await expect(unlock({ ...k, address: "0x0000000000000000000000000000000000000001" })).rejects.toThrow("different key");
  });

  it("a browser key asks for a backup until it is copied", () => {
    const k = createBrowserKey(PK);
    expect([k.method, k.backedUp]).toEqual(["browser", false]);
    markBackedUp();
    expect(loadStored()).toMatchObject({ method: "browser", backedUp: true, pk: PK });
  });
});
