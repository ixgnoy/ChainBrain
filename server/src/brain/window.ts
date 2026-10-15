import type Anthropic from "@anthropic-ai/sdk";
type Msg = Anthropic.Beta.Messages.BetaMessageParam;

/** The last N owner turns. A turn starts with the owner's plain-text message, so tool pairs inside it stay together. */
export function trimHistory(h: Msg[], keep = Number(process.env.BRAIN_KEEP_TURNS ?? 3)): Msg[] {
  const starts = h.flatMap((m, i) => (m.role === "user" && typeof m.content === "string" ? [i] : []));
  return starts.length <= keep ? h : h.slice(starts[starts.length - keep]);
}
