/**
 * Turns a plain-English task into an honest token estimate.
 * Input  = the task itself (~4 characters per token) + any pasted material.
 * Output = what that kind of task usually produces, or the length the user asked for.
 * Everything is shown to the user, so the guess is explainable, not magic.
 */

export type TaskKind = "answer" | "write" | "code" | "analyse" | "summarise" | "translate";
export type Depth = "brief" | "standard" | "thorough";

export const KIND_LABEL: Record<TaskKind, string> = {
  answer: "Quick answer",
  write: "Writing",
  code: "Coding",
  analyse: "Analysis",
  summarise: "Summary",
  translate: "Translation",
};

/** Typical output tokens at "standard" depth. */
const BASE_OUT: Record<TaskKind, number> = {
  answer: 350,
  write: 1_100,
  code: 2_200,
  analyse: 1_600,
  summarise: 500,
  translate: 0, // mirrors input
};

const DEPTH_MULT: Record<Depth, number> = { brief: 0.45, standard: 1, thorough: 2.4 };

const RULES: [TaskKind, RegExp][] = [
  ["code", /\b(code|function|bug|debug|refactor|script|api|sql|regex|component|typescript|python|javascript|react|test(s)?|deploy|endpoint|class)\b/i],
  ["summarise", /\b(summari[sz]e|summary|tl;?dr|key points|condense|recap)\b/i],
  ["translate", /\b(translate|translation|into (spanish|french|german|japanese|chinese|italian|portuguese|korean|arabic|hindi))\b/i],
  ["analyse", /\b(analy[sz]e|analysis|compare|evaluate|research|review|audit|strategy|plan|forecast|pros and cons|report|market)\b/i],
  ["write", /\b(write|draft|essay|email|blog|post|article|story|letter|copy|cover letter|speech|script|tweet|thread|newsletter|poem)\b/i],
];

export function classify(task: string): TaskKind {
  for (const [kind, rx] of RULES) if (rx.test(task)) return kind;
  return "answer";
}

/** "800 words", "3 pages", "2,000-word" → requested output tokens. */
function requestedLength(task: string): number | null {
  const words = /(\d[\d,]*)\s*-?\s*(words?|w)\b/i.exec(task);
  if (words) return Math.round(Number(words[1].replace(/,/g, "")) * 1.35);
  const pages = /(\d+)\s*-?\s*pages?\b/i.exec(task);
  if (pages) return Number(pages[1]) * 500 * 1.35;
  return null;
}

export function tokensOf(text: string): number {
  return Math.ceil(text.trim().length / 4);
}

/** System prompt + formatting overhead every request carries. */
const OVERHEAD_IN = 120;

export type Estimate = {
  kind: TaskKind;
  inputTokens: number;
  outputTokens: number;
  /** True when the user stated a length and we used it. */
  fromRequest: boolean;
};

export function estimateTask(task: string, material: string, depth: Depth, kindOverride?: TaskKind | null): Estimate {
  const kind = kindOverride ?? classify(task);
  const inTok = OVERHEAD_IN + tokensOf(task) + tokensOf(material);
  const asked = requestedLength(task);
  let out: number;
  if (asked) out = asked;
  else if (kind === "translate") out = Math.max(200, tokensOf(material) || tokensOf(task) * 2) * 1.15;
  else if (kind === "summarise" && material) out = Math.min(1_200, Math.max(250, tokensOf(material) * 0.12));
  else out = BASE_OUT[kind];
  if (!asked) out *= DEPTH_MULT[depth];
  return { kind, inputTokens: Math.round(inTok), outputTokens: Math.round(out), fromRequest: !!asked };
}

export function costOf(e: Pick<Estimate, "inputTokens" | "outputTokens">, inputPerM: number | null, outputPerM: number | null): number | null {
  if (inputPerM == null || outputPerM == null) return null;
  return (e.inputTokens * inputPerM + e.outputTokens * outputPerM) / 1e6;
}

export const EXAMPLES: string[] = [
  "Write a 1,200-word blog post on remote work",
  "Refactor this React component and add tests",
  "Summarise a 40-page contract into key risks",
  "Plan a 5-day trip to Tokyo on a budget",
];
