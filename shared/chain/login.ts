// The one message a visitor's owner key signs to sign up or sign in. It moves no money and authorises nothing on chain:
// the server checks it against a single-use nonce it issued, then hands back a session token.
// Shared by the server (verifies), the web console and the phone (build and sign). Plain data: no imports.

export const LOGIN_STATEMENT = "Sign in to ChainBrain. This signature moves no money and approves no payment.";

export const LOGIN_TYPES = {
  Login: [
    { name: "statement", type: "string" },
    { name: "owner", type: "address" },
    { name: "nonce", type: "bytes32" },
    { name: "issuedAt", type: "uint256" },
  ],
} as const;

export const loginDomain = (chainId: number) => ({ name: "ChainBrain", version: "1", chainId }) as const;

export type LoginChallenge = { owner: `0x${string}`; nonce: `0x${string}`; issuedAt: number; chainId: number };

/** The exact EIP-712 typed data for a challenge (viem signTypedData / verifyTypedData shape). */
export const loginTypedData = (c: LoginChallenge) => ({
  domain: loginDomain(c.chainId),
  types: LOGIN_TYPES,
  primaryType: "Login" as const,
  message: { statement: LOGIN_STATEMENT, owner: c.owner, nonce: c.nonce, issuedAt: BigInt(c.issuedAt) },
});

/** The header every visitor-only route reads. */
export const VISITOR_HEADER = "x-visitor-token";
