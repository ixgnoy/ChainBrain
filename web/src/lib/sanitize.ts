// Seller and model text is shown as plain text only, with hidden Unicode removed and a length cap.
// Money is always rendered from numbers in code, never from text.

// Bidi controls, zero-width characters, word joiners, BOM, and Unicode tag characters (U+E0000 to U+E007F).
const HIDDEN = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]|\uDB40[\uDC00-\uDC7F]/g;

export function cleanText(s: unknown, max = 4000): string {
  const str = typeof s === "string" ? s : s == null ? "" : JSON.stringify(s);
  const out = str.replace(HIDDEN, "");
  return out.length > max ? `${out.slice(0, max)}…` : out;
}
