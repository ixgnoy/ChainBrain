import { it, expect, afterEach, describe } from "vitest";
import { createServer } from "node:http";
import { PRESETS, createMessage, forProvider, llmOn, modelFor, provider } from "../src/llm";

// The model flag: LLM_PROVIDER = openrouter (default) | anthropic | scripted. A fake OpenRouter stands in for the real one.
const saved = { ...process.env };
afterEach(() => { for (const k of ["LLM_PROVIDER", "LLM_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_BASE_URL", "ANTHROPIC_API_KEY", "AGENT_MODEL", "LLM_MODEL_RADAR_MODEL"]) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

describe("the model flag", () => {
  it("defaults to OpenRouter with Claude Haiku 5.5, and needs its key", () => {
    delete process.env.LLM_PROVIDER; delete process.env.LLM_MODEL; delete process.env.OPENROUTER_API_KEY;
    expect([provider(), modelFor("agent"), llmOn()]).toEqual(["openrouter", "anthropic/claude-haiku-5.5", false]);
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    expect(llmOn()).toBe(true);
  });

  it("takes a preset name or slug, and refuses any other model (no other Anthropic model may run)", () => {
    delete process.env.LLM_PROVIDER;
    process.env.LLM_MODEL = "glm-5.3-flash";
    expect(modelFor("rules")).toBe("z-ai/glm-5.3-flash");
    process.env.LLM_MODEL = "xiaomi/mimo-v2.6-pro";
    expect(modelFor("memory")).toBe("xiaomi/mimo-v2.6-pro");
    process.env.LLM_MODEL = "anthropic/claude-opus-5.5";
    expect(modelFor("agent")).toBe(PRESETS["claude-haiku-5.5"]);
    process.env.AGENT_MODEL = "anthropic/claude-opus-5.5"; // an old per-role id doesn't leak into OpenRouter
    expect(modelFor("agent")).toBe(PRESETS["claude-haiku-5.5"]);
    process.env.LLM_MODEL_RADAR_MODEL = "deepseek-v4.1-flash";
    expect(modelFor("radar")).toBe("deepseek/deepseek-v4.1-flash");
  });

  it("strips the Anthropic-only fields on OpenRouter and keeps them on Anthropic", () => {
    const req = { model: "claude-opus-5-5", max_tokens: 10, betas: ["x"], fallbacks: "default", output_config: { effort: "high" }, messages: [] };
    delete process.env.LLM_PROVIDER;
    expect(forProvider(req, "agent")).toEqual({ model: "anthropic/claude-haiku-5.5", max_tokens: 10, messages: [] });
    process.env.LLM_PROVIDER = "anthropic";
    expect(forProvider(req, "agent")).toEqual(req);
    process.env.LLM_PROVIDER = "scripted";
    expect(llmOn()).toBe(false);
  });

  it("calls OpenRouter's Messages endpoint with the key, the chosen model and no Anthropic-only fields (fake transport)", async () => {
    const seen: { path?: string; auth?: string; body?: any }[] = [];
    const srv = createServer((req, res) => {
      let b = ""; req.on("data", (c) => (b += c));
      req.on("end", () => {
        seen.push({ path: req.url, auth: req.headers.authorization ?? req.headers["x-api-key"] as string, body: JSON.parse(b) });
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: JSON.parse(b).model, content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }));
      });
    });
    await new Promise<void>((ok) => srv.listen(4598, "127.0.0.1", () => ok()));
    try {
      delete process.env.LLM_PROVIDER;
      process.env.LLM_MODEL = "mimo-v2.6-flash";
      process.env.OPENROUTER_API_KEY = "sk-or-fake";
      process.env.OPENROUTER_BASE_URL = "http://127.0.0.1:4598";
      const r = await createMessage({ model: "claude-opus-5-5", max_tokens: 50, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default", output_config: { effort: "high" }, messages: [{ role: "user", content: "hi" }] }, "agent");
      expect(r.content[0].text).toBe("ok");
      expect(seen[0].path).toBe("/v1/messages");
      expect(seen[0].auth).toMatch(/sk-or-fake/);
      expect(seen[0].body.model).toBe("xiaomi/mimo-v2.6-flash");
      expect(seen[0].body).not.toHaveProperty("betas");
      expect(seen[0].body).not.toHaveProperty("fallbacks");
      expect(seen[0].body).not.toHaveProperty("output_config");
    } finally { srv.close(); }
  });

  it("refuses to call anything when scripted or keyless (callers fall back)", async () => {
    process.env.LLM_PROVIDER = "scripted";
    await expect(createMessage({ max_tokens: 1, messages: [] }, "radar")).rejects.toThrow("scripted");
  });
});
