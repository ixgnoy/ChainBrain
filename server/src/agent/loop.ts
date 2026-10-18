import Anthropic from "@anthropic-ai/sdk";
import type { Address } from "viem";
import { bus, toJson } from "../wallet/events";
import { tools as walletTools, type ToolMap } from "../wallet/tools";
import { systemPrompt } from "./prompt";

type Msg = Anthropic.Beta.Messages.BetaMessageParam;
type Req = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
export type TurnResult = { history: Msg[]; reply: string; stopped?: "llm_error" | "max_steps" | "refusal" | "max_tokens" };
export type ModelFn = (req: Req) => Promise<Anthropic.Beta.Messages.BetaMessage>;

import { createMessage, llmOn, modelFor } from "../llm";

/** The configured provider (LLM_PROVIDER, llm.ts): OpenRouter by default, Claude Haiku 5.5. */
const defaultModel: ModelFn = (req) => createMessage(req, "agent");

/**
 * Request shape for the current models (Claude Opus 5.5 default): thinking is always on, so no `thinking` field;
 * `temperature` is rejected (400), so repeatability comes from the fixed seller list, not sampling;
 * effort is explicit (Opus 5.5 defaults to medium); server-side refusal fallback is on.
 */
export function buildRequest(tools: ToolMap, messages: Msg[], memory = ""): Req {
  return {
    model: modelFor("agent"),
    max_tokens: 16000,
    output_config: { effort: (process.env.AGENT_EFFORT as "low" | "medium" | "high") ?? "high" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: memory ? `${systemPrompt()}

${memory}` : systemPrompt(), // the brain's current memory snapshot, never the old ones
    tools: Object.entries(tools).map(([name, t]) => {
      const { $schema: _drop, ...schema } = t.input_schema as Record<string, unknown>; // zod adds $schema; keep the plain JSON Schema
      return { name, description: t.description, input_schema: schema as Anthropic.Beta.Messages.BetaTool.InputSchema };
    }),
    messages,
  } as Req;
}

/**
 * One owner message → as many model/tool steps as the model wants. With `fallback` (the scripted agent): when the model
 * errors, or none is configured, the rest of the turn runs on the fallback and `onFallback` announces it. Never silent.
 */
export async function runTurn(ctx: { pocket: Address }, history: Msg[], userText: string, deps: { model?: ModelFn; tools?: ToolMap; maxSteps?: number; memory?: string; fallback?: ModelFn; onFallback?: (why: string) => void } = {}): Promise<TurnResult> {
  let model = deps.model ?? (llmOn() || !deps.fallback ? defaultModel : undefined);
  if (!model) { deps.onFallback?.("no model is configured"); model = deps.fallback!; }
  let fellBack = model === deps.fallback;
  const tools = deps.tools ?? walletTools;
  const h: Msg[] = [...history, { role: "user", content: userText }];
  const paid: string[] = [];
  const trace = (phase: string, extra: object) => bus.publish({ type: "trace", pocket: ctx.pocket, phase, ...extra });
  const stop = (reply: string, stopped: NonNullable<TurnResult["stopped"]>): TurnResult => (trace("reply", { text: reply }), { history: h, reply, stopped });
  const done = () => `Completed payments: ${paid.join(", ") || "none"}. Nothing will be retried.`;

  for (let step = 0; step < (deps.maxSteps ?? 24); step++) {
    let res: Anthropic.Beta.Messages.BetaMessage;
    try {
      res = await model(buildRequest(tools, h, deps.memory));
    } catch (e) {
      if (!deps.fallback || fellBack) return stop(`I stopped: the model is unavailable (${(e as Error).message}). ${done()}`, "llm_error");
      fellBack = true;
      deps.onFallback?.(String((e as Error).message).split("\n")[0].slice(0, 200));
      model = deps.fallback;
      res = await model(buildRequest(tools, h, deps.memory));
    }
    h.push({ role: "assistant", content: res.content }); // append-only, whole content (thinking/fallback blocks kept)
    for (const b of res.content) if (b.type === "text" && b.text) trace("thinking", { text: b.text });
    if (res.stop_reason === "refusal") return stop(`I stopped: the request was declined by the model's safeguards. ${done()}`, "refusal");
    if (res.stop_reason === "max_tokens") return stop(`I stopped: my reply ran too long. ${done()}`, "max_tokens");
    const uses = res.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length) {
      const reply = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      trace("reply", { text: reply });
      return { history: h, reply };
    }
    const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
    for (const u of uses) {
      trace("tool_call", { tool: u.name, args: u.input });
      const tool = tools[u.name];
      const out = tool ? await tool.run(ctx, u.input).catch((e: unknown) => ({ ok: false, error: String(e) })) : { ok: false, error: `unknown tool ${u.name}` };
      if (u.name === "pay" && (out as any).ok) paid.push((out as any).tx);
      trace("tool_result", { tool: u.name, result: out });
      results.push({ type: "tool_result", tool_use_id: u.id, content: toJson(out) });
    }
    h.push({ role: "user", content: results }); // all results of one turn in one message
  }
  return stop(`I stopped after too many steps. ${done()}`, "max_steps");
}
