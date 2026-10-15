import { score as core, verdictOf as coreVerdict, DEFAULT_RULES, type Category, type Exposure, type Rule, type Thresholds } from "../../../shared/sim/radar";

export { DEFAULT_RULES, type Rule, type Verdict, type Factor } from "../../../shared/sim/radar";

export const THRESHOLDS: Thresholds = { review: Number(process.env.RADAR_REVIEW_AT ?? 5), block: Number(process.env.RADAR_BLOCK_AT ?? 8) };
export const verdictOf = (s: number) => coreVerdict(s, THRESHOLDS);
export const score = (self: Category | undefined, exp: Exposure[], rules: Rule[] = DEFAULT_RULES) => core(self, exp, rules, THRESHOLDS);
