// Plain words for each of the eight scenes: what the presenter does, what the audience sees, and how it ends.
import type { Tone } from "../seller/ui";

export type SceneCopy = { doing: string; seeing: string; outcome: string; tone: Tone };

export const SCENE_COPY: Record<string, SceneCopy> = {
  "1": { doing: "Ask for a market report under US$2.", seeing: "The agent asks one question, you answer and confirm the task, then it buys within the pocket's rules.", outcome: "Asks you", tone: "warning" },
  "2": { doing: "Ask for the cheap DataLite report.", seeing: "You confirm the task and DataLite is paid, with no further approval.", outcome: "Paid", tone: "accent" },
  "3": { doing: "Ask for the premium report with the forecast.", seeing: "US$1.50 is above your limit, so you approve and sign it on the phone.", outcome: "Needs your OK", tone: "warning" },
  "4": { doing: "Ask for a report from Harbour Wines.", seeing: "The pocket refuses that shop, so the agent buys from DataLite instead.", outcome: "Refused, then paid", tone: "negative" },
  "5": { doing: "Plant text in ShadyFeed first, then ask for its preview.", seeing: "The agent flags the hidden instructions and buys only from DataLite.", outcome: "Ignored", tone: "accent" },
  "6": { doing: "Ask for ShadyFeed's full feed.", seeing: "The shop asks for personal data and a signature; the wallet refuses and nothing is paid.", outcome: "Refused", tone: "negative" },
  "7": { doing: "Revoke the pocket right after the first payment.", seeing: "The second payment is refused because the agent was stopped.", outcome: "Stopped", tone: "negative" },
  "8": { doing: "Ask for a report with only US$0.20 to spend.", seeing: "No allowed shop fits, nothing is paid and the agent suggests raising the limit.", outcome: "Nothing paid", tone: "neutral" },
};

export const copyFor = (id: string): SceneCopy | undefined => SCENE_COPY[id];
