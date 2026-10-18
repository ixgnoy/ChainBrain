import Anthropic from "@anthropic-ai/sdk";

/**
 * One switch for every model call (agent loop, rules compile, memory, Radar ask, Sentinel decide, pocket-app compose):
 *   LLM_PROVIDER = openrouter (default) | anthropic | scripted
 * openrouter: OpenRouter's Anthropic-compatible Messages endpoint (https://openrouter.ai/api, /v1/messages) with
 *   OPENROUTER_API_KEY, model LLM_MODEL or a preset (default Claude Haiku 5.5, the only Anthropic model allowed). The
 *   Anthropic-only request fields (betas, fallbacks, output_config) are stripped.
 * anthropic: Anthropic's API with ANTHROPIC_API_KEY and the per-role model ids (AGENT_MODEL, RULES_MODEL, ...).
 * scripted: no model; the agent loop runs the scripted agent (agent/scripted.ts) and the other calls use their
 *   deterministic paths. A provider error also falls back to it, announced (see apiApp's chat).
 * Keys come only from the environment.
 */
export type Provider = "openrouter" | "anthropic" | "scripted";
export type Role = "agent" | "rules" | "rulesCheck" | "pocketApp" | "memory" | "radar" | "sentinel";

/** OpenRouter model slugs (checked against openrouter.ai/api/v1/models on 19 Oct 2026; all support tool calls). */
export const PRESETS = {
  "claude-haiku-5.5": "anthropic/claude-haiku-5.5",
  "glm-5.3-flash": "z-ai/glm-5.3-flash",
  "deepseek-v4.1-flash": "deepseek/deepseek-v4.1-flash",
  "mimo-v2.6-pro": "xiaomi/mimo-v2.6-pro",
  "mimo-v2.6-flash": "xiaomi/mimo-v2.6-flash",
} as const;
export const DEFAULT_OPENROUTER_MODEL = PRESETS["claude-haiku-5.5"];
const OPENROUTER_ALLOWED = new Set<string>(Object.values(PRESETS));

const ANTHROPIC_DEFAULTS: Record<Role, string> = {
  agent: "claude-opus-5-5", rules: "claude-sonnet-5-5", rulesCheck: "claude-haiku-5-5", pocketApp: "claude-sonnet-5-5",
  memory: "claude-haiku-5-5", radar: "claude-haiku-5-5", sentinel: "claude-haiku-5-5",
};
const ROLE_ENV: Record<Role, string> = {
  agent: "AGENT_MODEL", rules: "RULES_MODEL", rulesCheck: "RULES_CHECK_MODEL", pocketApp: "POCKET_APP_MODEL",
  memory: "BRAIN_MEMORY_MODEL", radar: "RADAR_MODEL", sentinel: "SENTINEL_MODEL",
};

export function provider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? "openrouter").toLowerCase();
  return p === "anthropic" || p === "scripted" ? p : "openrouter";
}

/** A model is configured: the provider is not "scripted" and its key is set. */
export function llmOn(): boolean {
  const p = provider();
  return p === "openrouter" ? !!process.env.OPENROUTER_API_KEY : p === "anthropic" ? !!process.env.ANTHROPIC_API_KEY : false;
}

/**
 * The model id for a role. OpenRouter: LLM_MODEL (a slug or a preset name), else Haiku 5.5; only the presets are allowed,
 * anything else falls back to the default (no other Anthropic model may run). Anthropic: the role's own env, else LLM_MODEL,
 * else the role's default.
 */
export function modelFor(role: Role): string {
  if (provider() === "openrouter") {
    const want = process.env[`LLM_MODEL_${ROLE_ENV[role]}`] ?? process.env.LLM_MODEL ?? DEFAULT_OPENROUTER_MODEL;
    const slug = (PRESETS as Record<string, string>)[want] ?? want;
    return OPENROUTER_ALLOWED.has(slug) ? slug : DEFAULT_OPENROUTER_MODEL;
  }
  return process.env[ROLE_ENV[role]] ?? process.env.LLM_MODEL ?? ANTHROPIC_DEFAULTS[role];
}

let clients: { key: string; c: Anthropic } | undefined;
/** The SDK client for the provider (OpenRouter speaks the Anthropic Messages API at https://openrouter.ai/api). */
export function client(): Anthropic {
  const p = provider();
  const key = p === "openrouter" ? `or|${process.env.OPENROUTER_API_KEY}|${process.env.OPENROUTER_BASE_URL}` : `an|${process.env.ANTHROPIC_API_KEY}|${process.env.ANTHROPIC_BASE_URL}`;
  if (clients?.key !== key) {
    clients = {
      key,
      c: p === "openrouter"
        ? new Anthropic({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api", defaultHeaders: { "X-Title": "ChainBrain" } })
        : new Anthropic(),
    };
  }
  return clients.c;
}

/** The request as the provider takes it: on OpenRouter, Anthropic-only fields are removed and the model is the chosen one. */
export function forProvider<T extends Record<string, any>>(req: T, role: Role): T {
  if (provider() !== "openrouter") return { ...req, model: req.model ?? modelFor(role) };
  const { betas: _b, fallbacks: _f, output_config: _o, ...rest } = req as any;
  return { ...rest, model: modelFor(role) } as T;
}

/** messages.create through the provider. Throws when no model is configured (callers keep their own fallback). */
export async function createMessage(req: any, role: Role): Promise<any> {
  if (!llmOn()) throw new Error(provider() === "scripted" ? "LLM_PROVIDER=scripted" : `no key for ${provider()}`);
  const r = forProvider(req, role);
  return provider() === "anthropic" && (r.betas || r.fallbacks) ? client().beta.messages.create(r) : client().messages.create(r);
}

/** The model this server runs, for /api/config and the trace. */
export const modelInfo = () => ({ provider: provider(), model: provider() === "scripted" ? "scripted" : modelFor("agent"), on: llmOn() });
