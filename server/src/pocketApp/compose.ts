// POST /api/pocket-app/compose: one sentence -> the pocket's rules (Speak your rules, unchanged), its routine and its
// screen. Claude proposes a spec from the fixed block catalogue (the prompt is generated from it); the spec must pass both
// the zod schema and the shared validator, and its routine can only be stricter than the fixed picker's reading (the
// lower spend rate, the lower price limit, only items both chose). Anything that fails falls back to the picker, which is
// what the built-in network uses. The model never sees seller content and never writes UI: it picks blocks.
import Anthropic from "@anthropic-ai/sdk";
import { createMessage, llmOn, modelFor } from "../llm";
import { z } from "zod";
import { directory } from "../wallet/directory";
import { compileRules, type RulesModel } from "../rules/compile";
import { parseSentence, proof, stricterDraft } from "../../../shared/sim/speak";
import { BLOCKS, catalogPrompt, pickApp, stricterRoutine, validateSpec, type AgentChoice, type PocketAppSpec, type Registry } from "../../../shared/sim/pocketApp";
import { Spec } from "./schema";

const claude: RulesModel = (req) => createMessage(req, "pocketApp");

/** The forced tool's input schema, from the zod schema (one source of truth for what a spec may contain). */
const TOOL = () => ({ name: "compose_pocket_app", description: "Compose the pocket's app from the fixed block catalogue. Pick blocks; never write UI.", input_schema: z.toJSONSchema(Spec) as Anthropic.Messages.Tool.InputSchema });

export function checkSpec(raw: unknown, registry: Registry): { ok: true; spec: PocketAppSpec } | { ok: false; errors: string[] } {
  const z1 = Spec.safeParse(raw);
  if (!z1.success) return { ok: false, errors: z1.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const v = validateSpec(raw, registry);
  return v.ok ? { ok: true, spec: v.value } : { ok: false, errors: v.errors };
}

export async function composeApp(sentence: string, deps: { model?: RulesModel } = {}) {
  const sellers = await directory();
  const registry: Registry = sellers.map((s) => ({ id: s.id, name: s.name, items: (s.items ?? []).map((i: { sku: string; price: string | null }) => ({ sku: i.sku, price: i.price })) }));
  const named = sellers.map((s) => ({ id: s.id, name: s.name }));
  const compiled = await compileRules(sentence, { main: deps.model });
  // the model's reading of the rules has no allowance or price limit: the fixed reader's are kept, and stricter still wins
  const parsed = parseSentence(sentence, named);
  const draft = compiled.by === "claude" ? stricterDraft(compiled.draft, parsed.draft).draft : compiled.draft;
  const picked = pickApp(sentence, draft, registry);
  const base = { ...compiled, draft, proof: proof(draft, named), agent: picked.agent as AgentChoice };
  const live = deps.model || llmOn();
  if (!live) return { ...base, spec: picked.spec, specBy: "picker" as const };
  try {
    const res = await (deps.model ?? claude)({
      model: modelFor("pocketApp"), max_tokens: 1500, tools: [TOOL()], tool_choice: { type: "tool", name: "compose_pocket_app" },
      system: catalogPrompt(registry),
      messages: [{ role: "user", content: sentence.slice(0, 500) }],
    });
    const raw = res.content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use")?.input;
    const c = checkSpec(raw, registry);
    if (!c.ok) return { ...base, spec: picked.spec, specBy: "picker" as const, specErrors: c.errors.slice(0, 6) };
    let spec = c.spec;
    if (spec.routine && picked.spec.routine && spec.routine.kind === picked.spec.routine.kind) {
      const m = stricterRoutine(spec.routine, picked.spec.routine);
      spec = { ...spec, routine: m.routine };
      if (!validateSpec(spec, registry).ok) spec = picked.spec; // the merge emptied it (no shared items): the picker's
      return { ...base, spec, specBy: "claude" as const, disagreements: [...base.disagreements, ...m.disagreements] };
    }
    // a routine only the model read (the picker found none in the sentence) is dropped: a routine is never wider than the words
    if (spec.routine && !picked.spec.routine) spec = { ...spec, routine: null, blocks: spec.blocks.filter((b) => !BLOCK_ROUTINE[b.type]) };
    return validateSpec(spec, registry).ok ? { ...base, spec, specBy: "claude" as const } : { ...base, spec: picked.spec, specBy: "picker" as const };
  } catch {
    return { ...base, spec: picked.spec, specBy: "picker" as const };
  }
}
const BLOCK_ROUTINE: Record<string, boolean> = Object.fromEntries(Object.entries(BLOCKS).map(([k, v]) => [k, !!(v as { routine?: boolean }).routine]));
