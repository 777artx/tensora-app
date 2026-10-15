/**
 * The lineup: frontier and flagship models only, one or two per leading lab.
 *
 * Every ID below was checked against OpenRouter's live catalog on 2026-10-01
 * (GET /api/v1/models and /models/{id}/endpoints): listed, with at least one live
 * provider and 99.6%+ uptime over the last 30 minutes. Prices are the published
 * per-token rate in USD per 1M tokens. Re-check on every model release.
 */
export type Tier = "flagship" | "everyday";

export type OloraModel = {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  /** One plain-English line. */
  strength: string;
  bestFor: string;
  tier: Tier;
  inputPerM: number;
  outputPerM: number;
  context: string;
};

export const LINEUP: OloraModel[] = [
  // Flagship: each lab's most capable model.
  { id: "anthropic/claude-fable-5.1", name: "Claude Fable 5.1", provider: "anthropic", providerName: "Anthropic", strength: "Anthropic's most capable model. Long, autonomous expert work.", bestFor: "Hardest problems", tier: "flagship", inputPerM: 10, outputPerM: 50, context: "1M" },
  { id: "openai/gpt-6-astra", name: "GPT-6 Astra", provider: "openai", providerName: "OpenAI", strength: "OpenAI's flagship for deep research and analysis.", bestFor: "Research", tier: "flagship", inputPerM: 10, outputPerM: 50, context: "1M" },
  { id: "anthropic/claude-opus-5.5", name: "Claude Opus 5.5", provider: "anthropic", providerName: "Anthropic", strength: "Careful reasoning and large, multi-step coding work.", bestFor: "Reasoning, code", tier: "flagship", inputPerM: 4, outputPerM: 20, context: "1M" },
  { id: "openai/gpt-6.1-sol-pro", name: "GPT-6.1 Sol Pro", provider: "openai", providerName: "OpenAI", strength: "OpenAI's newest model with extended reasoning.", bestFor: "Analysis", tier: "flagship", inputPerM: 2, outputPerM: 10, context: "1M" },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", provider: "google", providerName: "Google", strength: "Google's top reasoning model. Strong with images and long files.", bestFor: "Multimodal", tier: "flagship", inputPerM: 2, outputPerM: 12, context: "1M" },
  { id: "qwen/qwen3.8-max-prime", name: "Qwen3.8 Max Prime", provider: "qwen", providerName: "Alibaba", strength: "Alibaba's largest model. Strong at maths and multilingual work.", bestFor: "Maths, languages", tier: "flagship", inputPerM: 4, outputPerM: 12, context: "1M" },
  { id: "z-ai/glm-5.3-prime", name: "GLM-5.3 Prime", provider: "z-ai", providerName: "Z.ai", strength: "Z.ai's flagship for agentic coding and tool use.", bestFor: "Agents", tier: "flagship", inputPerM: 2.8, outputPerM: 8.8, context: "1M" },

  // Frontier everyday: top-tier quality at a lower rate.
  { id: "anthropic/claude-sonnet-5.5", name: "Claude Sonnet 5.5", provider: "anthropic", providerName: "Anthropic", strength: "Frontier quality at everyday speed. A superb writer.", bestFor: "Writing", tier: "everyday", inputPerM: 2, outputPerM: 10, context: "1M" },
  { id: "openai/gpt-6.1-sol", name: "GPT-6.1 Sol", provider: "openai", providerName: "OpenAI", strength: "OpenAI's newest all-rounder for professional work.", bestFor: "Everyday work", tier: "everyday", inputPerM: 2, outputPerM: 10, context: "1M" },
  { id: "x-ai/grok-4.7", name: "Grok 4.7", provider: "x-ai", providerName: "xAI", strength: "xAI's flagship. Strong at code and checks its own work.", bestFor: "Code, STEM", tier: "everyday", inputPerM: 2, outputPerM: 6, context: "500K" },
  { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "google", providerName: "Google", strength: "Google's newest fast model. Reads huge files and images.", bestFor: "Files, speed", tier: "everyday", inputPerM: 0.75, outputPerM: 3.75, context: "1M" },
  { id: "moonshotai/kimi-k3", name: "Kimi K3", provider: "moonshotai", providerName: "Moonshot", strength: "Moonshot's flagship. Long agentic tasks at a low input rate.", bestFor: "Long tasks", tier: "everyday", inputPerM: 0.38, outputPerM: 10, context: "1M" },
  { id: "deepseek/deepseek-v4-pro-0813", name: "DeepSeek V4 Pro", provider: "deepseek", providerName: "DeepSeek", strength: "DeepSeek's flagship. Frontier reasoning at a fraction of the price.", bestFor: "Value", tier: "everyday", inputPerM: 0.66, outputPerM: 1.98, context: "1M" },
  { id: "mistralai/mistral-medium-3-5", name: "Mistral Medium 3.5", provider: "mistralai", providerName: "Mistral", strength: "Mistral's flagship. Fast, precise and European-hosted.", bestFor: "Precision", tier: "everyday", inputPerM: 1.5, outputPerM: 7.5, context: "262K" },
];

export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-5.5";

export function curatedModels(): OloraModel[] {
  return LINEUP;
}

export function findCurated(id: string | null | undefined): OloraModel | undefined {
  if (!id) return undefined;
  return LINEUP.find((m) => m.id === id);
}

export function defaultModel(): OloraModel {
  return findCurated(DEFAULT_MODEL_ID) || LINEUP[0];
}
