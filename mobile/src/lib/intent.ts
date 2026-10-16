// The task card's rows from the wallet's fixed intent text (server/src/wallet/intent.ts renderIntent): "Buy: …", then
// "Price: …", then "Deadline: …". The description is the agent's own words and may contain line breaks, so a line that
// merely looks like "Price: …" inside it must not become a limit row: the last two lines are Price and Deadline by shape,
// and everything above them is the Buy text.
export type IntentRow = { k: string; v: string };

export function intentRows(text: string): IntentRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const n = lines.length;
  if (n >= 3 && lines[0].startsWith("Buy:") && lines[n - 2].startsWith("Price:") && lines[n - 1].startsWith("Deadline:")) {
    const buy = lines.slice(0, n - 2).join(" ").slice("Buy:".length).trim();
    return [{ k: "Buy", v: buy }, { k: "Price", v: lines[n - 2].slice("Price:".length).trim() }, { k: "Deadline", v: lines[n - 1].slice("Deadline:".length).trim() }].filter((r) => r.v);
  }
  // anything else (an older or unknown format): one row per line, a short "Key:" prefix as the label
  return lines.map((l) => { const i = l.indexOf(":"); return i > 0 && i < 12 ? { k: l.slice(0, i), v: l.slice(i + 1).trim() } : { k: "", v: l }; }).filter((x) => x.v);
}
