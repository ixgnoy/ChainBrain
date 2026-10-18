import Anthropic from "@anthropic-ai/sdk";
import { createMessage, modelFor } from "../llm";
import { isAddress } from "viem";
import { directory } from "../wallet/directory";
import { toJson } from "../wallet/events";
import { labels } from "./labels";
import { radar, screen, brief } from "./screen";

type Msg = Anthropic.Messages.MessageParam;
export type AskModel = (req: Anthropic.Messages.MessageCreateParamsNonStreaming) => Promise<Anthropic.Messages.Message>;

const defaultModel: AskModel = (req) => createMessage(req, "radar");

const SYSTEM = `You are ChainBrain Radar, an on-chain risk analyst. Answer the owner's question about counterparties and fund flows.
Use only your tools; every number in your answer must come from a tool result. Give the score, the verdict and the main reason, with the share of funds and hops.
You cannot change rules, labels or limits, and you never approve a payment; if asked, say the owner does that in the app.
Two or three sentences, plain English.`;

async function resolve(who: string) {
  if (isAddress(who)) return who;
  const s = (await directory()).find((x) => x.id === who.toLowerCase() || x.name.toLowerCase() === who.toLowerCase());
  if (!s) throw new Error(`unknown counterparty "${who}": use a seller id, a seller name or an address`);
  return s.payTo;
}

const TOOLS = {
  screen_counterparty: {
    description: "Risk score (0-10), verdict and reasons for a seller id, seller name or address.",
    input_schema: { type: "object", properties: { who: { type: "string" } }, required: ["who"] },
    run: async ({ who }: { who: string }) => {
      const s = await screen(await resolve(who));
      return { ...brief(s), narrative: s.narrative };
    },
  },
  trace_funds: {
    description: "Where a counterparty's money came from (source) or went (destination): share of funds per labelled category, hops, example path.",
    input_schema: { type: "object", properties: { who: { type: "string" }, direction: { type: "string", enum: ["source", "destination"] } }, required: ["who", "direction"] },
    run: async ({ who, direction }: { who: string; direction: "source" | "destination" }) => {
      const s = await screen(await resolve(who));
      const e = direction === "source" ? s.source : s.destination;
      return {
        counterparty: s.name, direction, unknownShare: Number(e.unknown.toFixed(4)), partial: e.incomplete,
        categories: Object.entries(e.byCategory).map(([c, h]) => ({ category: c, share: Number(h!.share.toFixed(4)), hops: h!.hops, path: h!.path.map(radar.nameOf) })),
      };
    },
  },
  list_alerts: {
    description: "Open risk alerts (counterparties whose risk rose), newest first.",
    input_schema: { type: "object", properties: {} },
    run: async () => ({ alerts: radar.alerts().filter((a) => a.status === "open").slice(0, 10).map((a) => ({ counterparty: a.name, from: a.from, to: a.to, narrative: a.narrative })) }),
  },
  list_labels: {
    description: "Labelled addresses Radar knows (category, name, source).",
    input_schema: { type: "object", properties: {} },
    run: async () => ({ labels: labels.all().slice(0, 50).map((l) => ({ name: l.name, address: l.address, category: l.category, source: l.source })) }),
  },
} as const;

/**
 * "Ask Radar": a question in plain words, answered from typed tool results only (counterparty names, numbers, our labels).
 * No seller content is ever in its context, and it has no tool that changes anything.
 */
export async function ask(question: string, deps: { model?: AskModel; maxSteps?: number } = {}) {
  const model = deps.model ?? defaultModel;
  const msgs: Msg[] = [{ role: "user", content: question.slice(0, 1000) }];
  const evidence: { tool: string; input: unknown; result: unknown }[] = [];
  for (let step = 0; step < (deps.maxSteps ?? 6); step++) {
    const res = await model({
      model: modelFor("radar"),
      max_tokens: 2000,
      system: SYSTEM,
      tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, input_schema: t.input_schema as any })),
      messages: msgs,
    });
    msgs.push({ role: "assistant", content: res.content });
    const uses = res.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length) {
      return { answer: res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim(), evidence };
    }
    const results: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const u of uses) {
      const t = (TOOLS as Record<string, { run(a: any): Promise<object> }>)[u.name];
      const out = t ? await t.run(u.input).catch((e: unknown) => ({ error: String((e as Error).message ?? e) })) : { error: `unknown tool ${u.name}` };
      evidence.push({ tool: u.name, input: u.input, result: out });
      results.push({ type: "tool_result", tool_use_id: u.id, content: toJson(out) });
    }
    msgs.push({ role: "user", content: results });
  }
  return { answer: "I could not finish that question in a few steps; try asking about one seller.", evidence };
}
