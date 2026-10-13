/** Seller content reaches the model only inside this wrapper; a forged closing tag cannot break out. */
export function wrapUntrusted(sellerId: string, body: string): string {
  const safe = body.replace(/<\/?untrusted_content[^>]*>/gi, "[tag removed]");
  return `<untrusted_content source="${sellerId}">\n${safe}\n</untrusted_content>`;
}

const DATA_WORDS = /name|email|phone|address|history|pocket|balance|id_?number|passport|seed|private|kyc/i;
const SIGN_KEYS = /^(sign|signature|permit|approve|approval|typeddata)$/i;

/**
 * What a seller asks for beyond the purchase: personal data, or a signature.
 * ponytail: key-name heuristic over JSON bodies; extend if a seller hides requests in prose.
 */
export function scanRequests(body: string): { disclosures: string[]; signRequest: boolean } {
  let j: unknown;
  try { j = JSON.parse(body); } catch { return { disclosures: [], signRequest: false }; }
  const disclosures = new Set<string>();
  let signRequest = false;
  const walk = (v: unknown) => {
    if (Array.isArray(v)) for (const x of v) typeof x === "string" ? DATA_WORDS.test(x) && disclosures.add(x) : walk(x);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      if (SIGN_KEYS.test(k) || (k === "primaryType" && typeof x === "string")) signRequest = true;
      walk(x);
    }
  };
  walk(j);
  return { disclosures: [...disclosures], signRequest };
}
