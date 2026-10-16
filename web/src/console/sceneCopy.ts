// Plain words for each scene (1-8 from the spec, 9 Radar and 10 Sentinel on the built-in network): what the presenter does, what the audience sees, and how it ends. No seller or
// price is named: the built-in network sells per-request data (Exa, CoinGecko, Nansen) and the real test chain has its own.
import type { Tone } from "../seller/ui";

export type SceneCopy = { doing: string; seeing: string; outcome: string; tone: Tone };

export const SCENE_COPY: Record<string, SceneCopy> = {
  "1": { doing: "Ask the agent to research a durian deal, with a total limit.", seeing: "The agent asks one question, you answer and confirm the task, then it buys within the pocket's rules.", outcome: "Asks you", tone: "warning" },
  "2": { doing: "Ask for a cheap lookup.", seeing: "You confirm the task and the seller is paid, with no further approval.", outcome: "Paid", tone: "accent" },
  "3": { doing: "Ask for the premium check.", seeing: "It costs more than your ask-me limit, so you approve and sign it on the phone.", outcome: "Needs your OK", tone: "warning" },
  "4": { doing: "Ask for a report from Harbour Wines.", seeing: "The pocket refuses that shop, so the agent buys from an allowed seller instead.", outcome: "Refused, then paid", tone: "accent" },
  "5": { doing: "Plant text in ShadyFeed first, then ask for its preview.", seeing: "The agent flags the hidden instructions and buys only from an allowed seller.", outcome: "Ignored", tone: "accent" },
  "6": { doing: "Ask for ShadyFeed's full feed.", seeing: "The shop asks for personal data and a signature; the wallet refuses and nothing is paid.", outcome: "Refused", tone: "accent" },
  "7": { doing: "Revoke the pocket right after the first payment.", seeing: "The second payment is refused because the agent was stopped.", outcome: "Stopped", tone: "accent" },
  "8": { doing: "Ask for a lookup in a pocket too small to afford it.", seeing: "No allowed shop fits, nothing is paid and the agent suggests raising the limit.", outcome: "Nothing paid", tone: "neutral" },
  "9": { doing: "Ask for TradeWire's report right after a drainer wallet pays it.", seeing: "Radar traces TradeWire's funds to the drainer, so the agent does not pay it and buys from a clean seller instead.", outcome: "Radar blocked", tone: "accent" },
  "11": { doing: "Ask for DataPro's premium report, but have the agent negotiate first.", seeing: "The agent and DataPro's agent trade prices only, 1.50 down to 1.10; you co-sign the deal and the pocket pays exactly that.", outcome: "US$0.40 saved", tone: "accent" },
  "10": { doing: "Assume the agent is fooled into retrying a shop that is not allowed.", seeing: "The pocket refuses every try; after the third the Sentinel freezes the pocket on-chain, so nothing more is paid.", outcome: "Frozen", tone: "accent" },
};

/** One or two words under each step number in the presenter's stepper. */
export const SHORT_LABEL: Record<string, string> = { "1": "Ask", "2": "Pay", "3": "Approve", "4": "Refuse", "5": "Injection", "6": "Data grab", "7": "Revoke", "8": "Dead end", "9": "Radar", "10": "Sentinel", "11": "Haggle" };
export const shortFor = (id: string) => SHORT_LABEL[id] ?? `Scene ${id}`;
export const copyFor = (id: string): SceneCopy | undefined => SCENE_COPY[id];
