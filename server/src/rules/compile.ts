import Anthropic from "@anthropic-ai/sdk";
import { directory } from "../wallet/directory";
import { parseSentence, proof, stricterDraft, type Compiled, type Draft, type Lifetime, type Proof, type Question } from "../../../shared/sim/speak";

export type RulesModel = (req: Anthropic.Messages.MessageCreateParamsNonStreaming) => Promise<Anthropic.Messages.Message>;
let client: Anthropic | undefined;
const claude: RulesModel = (req) => (client ??= new Anthropic()).messages.create(req);

const AMOUNT = /^\d{1,6}(\.\d{1,2})?$/;
const LIFETIMES: Lifetime[] = ["one-task", "until-tonight", "ongoing"];

const tool = (ids: string[]) => ({
  name: "propose_pocket",
  description: "Propose pocket rules from the owner's sentence. Never invent a limit the owner did not state: ask instead.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Short pocket name from the sentence, max 24 chars" },
      sellers: { type: "array", items: { type: "string", enum: ids }, description: "Seller ids the owner named" },
      cap: { type: "string", description: 'Max per payment in HK$ (Mock e-HKD), e.g. "2.00"' },
      budget: { type: "string", description: 'Total HK$ to put in the pocket, e.g. "5.00"' },
      askAbove: { type: "string", description: '"never" = never ask, "0" = ask every time, else an HK$ amount' },
      lifetime: { type: "string", enum: LIFETIMES },
      questions: {
        type: "array", description: "One question per thing the sentence leaves open or ambiguous",
        items: { type: "object", properties: { field: { type: "string", enum: ["sellers", "cap", "budget", "askAbove", "lifetime"] }, question: { type: "string" }, options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } } }, required: ["field", "question", "options"] },
      },
    },
    required: ["sellers", "cap", "budget", "askAbove", "lifetime", "questions"],
  },
});

/** One reading of the sentence by one model, checked field by field; any bad field falls back to the fixed parser's value. */
async function read(model: RulesModel, modelId: string, sentence: string, sellers: { id: string; name: string }[], fallback: Draft): Promise<{ draft: Draft; questions: Question[] } | null> {
  const ids = sellers.map((s) => s.id);
  const res = await model({
    model: modelId, max_tokens: 1500, tools: [tool(ids)], tool_choice: { type: "tool", name: "propose_pocket" },
    system: `You turn an owner's one-sentence description of a spending pocket for their AI agent into rules. All amounts are Hong Kong dollars (HK$, paid in Mock e-HKD): "$5", "5 dollars" and "HK$5" all mean HK$5.00, never US dollars. Sellers: ${sellers.map((s) => `${s.id} (${s.name})`).join(", ")}. If the sentence does not say something, ask a question and propose the stricter value.`,
    messages: [{ role: "user", content: sentence.slice(0, 500) }],
  });
  const x = res.content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use")?.input as Record<string, any> | undefined;
  if (!x) return null;
  const amt = (v: unknown, fb: string) => (typeof v === "string" && AMOUNT.test(v) ? Number(v).toFixed(2) : fb);
  const draft: Draft = {
    name: typeof x.name === "string" ? x.name.slice(0, 24) : fallback.name,
    sellers: Array.isArray(x.sellers) ? x.sellers.filter((s: unknown): s is string => typeof s === "string" && ids.includes(s)) : fallback.sellers,
    cap: amt(x.cap, fallback.cap), budget: amt(x.budget, fallback.budget),
    askAbove: x.askAbove === "never" || x.askAbove === "0" ? x.askAbove : amt(x.askAbove, fallback.askAbove),
    lifetime: LIFETIMES.includes(x.lifetime) ? x.lifetime : fallback.lifetime,
  };
  const questions: Question[] = Array.isArray(x.questions) ? x.questions.filter((q: any) => q && typeof q.question === "string" && Array.isArray(q.options)).slice(0, 4).map((q: any) => ({
    field: q.field, question: String(q.question).slice(0, 120), options: q.options.slice(0, 4).map((o: any) => ({ label: String(o.label).slice(0, 40), value: String(o.value).slice(0, 40) })),
  })) : [];
  return { draft, questions };
}

/**
 * "Speak your rules": two independent readings (the main model and a smaller one), merged so any disagreement takes the
 * stricter value, plus the proof card computed by code. Without a model (no key), the fixed parser alone.
 * The owner still reviews and signs the pocket; nothing here creates or changes one.
 */
export async function compileRules(sentence: string, deps: { main?: RulesModel; check?: RulesModel } = {}): Promise<Compiled & { proof: Proof }> {
  const sellers = (await directory()).map((s) => ({ id: s.id, name: s.name }));
  const parsed = parseSentence(sentence, sellers);
  const live = deps.main || process.env.ANTHROPIC_API_KEY;
  if (!live) return { ...parsed, proof: proof(parsed.draft, sellers) };
  const [a, b] = await Promise.all([
    read(deps.main ?? claude, process.env.RULES_MODEL ?? "claude-sonnet-5-5", sentence, sellers, parsed.draft).catch(() => null),
    read(deps.check ?? deps.main ?? claude, process.env.RULES_CHECK_MODEL ?? "claude-haiku-5-5", sentence, sellers, parsed.draft).catch(() => null),
  ]);
  if (!a && !b) return { ...parsed, proof: proof(parsed.draft, sellers) };
  const merged = a && b ? stricterDraft(a.draft, b.draft) : { draft: (a ?? b)!.draft, disagreements: [] as string[] };
  const seen = new Set<string>();
  const questions = [...(a?.questions ?? []), ...(b?.questions ?? [])].filter((q) => !seen.has(q.field) && seen.add(q.field));
  return { draft: merged.draft, questions, by: "claude", disagreements: merged.disagreements, proof: proof(merged.draft, sellers) };
}
