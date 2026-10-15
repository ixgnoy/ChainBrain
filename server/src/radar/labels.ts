import { getAddress } from "viem";
import { readFileSync, existsSync } from "node:fs";
import { createLabels, isCategory, type Label } from "../../../shared/sim/radar";

export { RISKY, BENIGN, isRisky, isCategory, type Category, type Label } from "../../../shared/sim/radar";

const book = createLabels();

/** The server's label book. Addresses are stored checksummed for display; look-ups ignore case. */
export const labels = {
  get: book.get,
  all: book.all,
  add: (l: Omit<Label, "at">): Label => book.add({ ...l, address: getAddress(l.address) }),
  clear: book.clear,
};

/** RADAR_LABELS_FILE: a JSON array of {address, category, name, source}, e.g. an exported sanctions list. */
const f = process.env.RADAR_LABELS_FILE;
if (f && existsSync(f)) for (const l of JSON.parse(readFileSync(f, "utf8")) as Omit<Label, "at">[]) if (isCategory(l.category)) labels.add(l);
