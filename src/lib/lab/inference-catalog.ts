import catalogJson from "./inference-catalog.json";

export type InferenceModel = {
  id: string;
  name: string;
  fullName: string;
  provider: string;
  description: string;
  context: string;
  inputPerM: number | null;
  outputPerM: number | null;
  logoDomain: string;
};

export type ModelCapability =
  | "Reasoning"
  | "Coding"
  | "Vision"
  | "Fast"
  | "Long Context"
  | "Open Source";

/** @deprecated Use ModelCapability */
export type Capability = ModelCapability;

export type CostTier = "low" | "medium" | "high";

export const CAPABILITIES: ModelCapability[] = [
  "Reasoning",
  "Coding",
  "Vision",
  "Fast",
  "Long Context",
  "Open Source",
];

export const PROVIDER_DOMAINS: Record<string, string> = {
  anthropic: "anthropic.com",
  openai: "openai.com",
  google: "google.com",
  "google-vertex": "google.com",
  "meta-llama": "meta.com",
  meta: "meta.com",
  mistralai: "mistral.ai",
  deepseek: "deepseek.com",
  qwen: "qwen.ai",
  alibaba: "alibabacloud.com",
  "x-ai": "x.ai",
  moonshotai: "moonshot.cn",
  cohere: "cohere.com",
  perplexity: "perplexity.ai",
  nvidia: "nvidia.com",
  amazon: "amazon.com",
  microsoft: "microsoft.com",
  minimax: "minimaxi.com",
  baidu: "baidu.com",
  bytedance: "bytedance.com",
  "bytedance-seed": "bytedance.com",
  ibm: "ibm.com",
  "ibm-granite": "ibm.com",
  nousresearch: "nousresearch.com",
  openrouter: "openrouter.ai",
  writer: "writer.com",
  upstage: "upstage.ai",
  liquid: "liquid.ai",
  rekaai: "reka.ai",
  allenai: "allenai.org",
  tencent: "tencent.com",
  xiaomi: "xiaomi.com",
  "z-ai": "z.ai",
  stepfun: "stepfun.ai",
  ai21: "ai21.com",
  "together-ai": "together.ai",
  togethercomputer: "together.ai",
  tensora: "olora.si",
  olora: "olora.si",
};

export const TENSORA_AUTO: InferenceModel = {
  id: "olora/auto",
  name: "Olora Auto",
  fullName: "Olora: Auto",
  provider: "olora",
  description:
    "Routes each request to the best model for quality, speed, or cost across the Olora network.",
  context: "Auto",
  inputPerM: null,
  outputPerM: null,
  logoDomain: "olora.si",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/gi, "/")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const rawCatalog = catalogJson as InferenceModel[];

export const INFERENCE_CATALOG: InferenceModel[] = rawCatalog.map((m) => ({
  ...m,
  description: decodeEntities(m.description || ""),
  name: decodeEntities(m.name || ""),
  fullName: decodeEntities(m.fullName || ""),
  logoDomain:
    m.logoDomain ||
    PROVIDER_DOMAINS[m.provider.replace(/^~/, "")] ||
    `${m.provider.replace(/^~/, "")}.com`,
}));

const CATALOG_BY_ID = new Map(INFERENCE_CATALOG.map((m) => [m.id, m]));

/** Curated featured models. recognizable frontier names present in the catalog. */
export const FEATURED_IDS = [
  "anthropic/claude-fable-5.1",
  "openai/gpt-6-astra",
  "anthropic/claude-opus-5.5",
  "google/gemini-3.1-pro-preview",
  "anthropic/claude-sonnet-5.5",
  "openai/gpt-6.1-sol",
  "x-ai/grok-4.7",
  "deepseek/deepseek-v4-pro-0813",
].filter((id) => CATALOG_BY_ID.has(id));

/** Higher = more prominent for Popular sort. */
export function popularScore(model: InferenceModel): number {
  const hay = `${model.id} ${model.name} ${model.provider}`.toLowerCase();
  let score = 0;
  if (/claude|anthropic/.test(hay)) score += 100;
  if (/gpt-5|gpt-4|openai/.test(hay)) score += 95;
  if (/gemini|google/.test(hay)) score += 90;
  if (/qwen/.test(hay)) score += 80;
  if (/deepseek/.test(hay)) score += 78;
  if (/kimi|moonshot/.test(hay)) score += 75;
  if (/llama|meta-llama/.test(hay)) score += 70;
  if (/mistral/.test(hay)) score += 55;
  if (FEATURED_IDS.includes(model.id)) score += 40;
  if (/batch|:free/.test(hay)) score -= 30;
  // Prefer shorter / cleaner display names slightly
  score -= Math.min(20, model.name.length / 4);
  return score;
}

export function getModelById(id: string): InferenceModel | undefined {
  if (
    id === TENSORA_AUTO.id ||
    id === "openrouter/auto" ||
    id === "gradient/auto"
  ) {
    return TENSORA_AUTO;
  }
  return CATALOG_BY_ID.get(id);
}

export function providerLabel(provider: string) {
  const p = provider.replace(/^~/, "");
  if (p === "tensora") return "Olora";
  if (p === "x-ai") return "xAI";
  if (p === "meta-llama") return "Meta";
  if (p === "moonshotai") return "Moonshot";
  if (p === "openai") return "OpenAI";
  if (p === "mistralai") return "Mistral";
  if (p === "deepseek") return "DeepSeek";
  if (p === "z-ai") return "Z.ai";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export function providerLogoUrl(provider: string, logoDomain?: string): string {
  const clean = provider.replace(/^~/, "");
  const domain =
    logoDomain ||
    PROVIDER_DOMAINS[clean] ||
    PROVIDER_DOMAINS[provider] ||
    `${clean.replace(/[^a-z0-9-]/gi, "")}.com`;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function detectCapabilities(model: InferenceModel): ModelCapability[] {
  const hay = `${model.id} ${model.name} ${model.description}`.toLowerCase();
  const caps: ModelCapability[] = [];

  if (/reason|thinking|r1|o1|o3|o4|opus|sonnet|deepseek-r|kimi.*think|qwq/.test(hay)) {
    caps.push("Reasoning");
  }
  if (/code|coder|codex|devstral|codestral|programming/.test(hay)) {
    caps.push("Coding");
  }
  if (/vision|vl\b|omni|image|multimodal|gpt-4o|gemini.*pro|claude-3|claude-4/.test(hay)) {
    caps.push("Vision");
  }
  if (/flash|mini|fast|turbo|lite|haiku|nano|instant/.test(hay)) {
    caps.push("Fast");
  }
  const ctx = parseContextTokens(model.context);
  if (ctx >= 200_000 || /long.?context|1m|2m|million/.test(hay)) {
    caps.push("Long Context");
  }
  if (
    ["meta-llama", "mistralai", "qwen", "deepseek"].includes(
      model.provider.replace(/^~/, ""),
    ) ||
    /open.?source|llama|mistral|qwen|deepseek|gemma|phi-/.test(hay)
  ) {
    if (
      ["meta-llama", "mistralai", "qwen", "deepseek"].includes(
        model.provider.replace(/^~/, ""),
      ) ||
      /llama|mistral|qwen|deepseek|gemma|phi-/.test(hay)
    ) {
      caps.push("Open Source");
    }
  }

  return [...new Set(caps)].slice(0, 4);
}

export function parseContextTokens(context: string): number {
  const s = String(context || "").trim();
  if (!s || s === "-" || /^auto$/i.test(s)) return 0;
  const m = s.match(/^([\d.]+)\s*([KkMmBb])?/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = (m[2] || "").toUpperCase();
  if (u === "M") return Math.round(n * 1_000_000);
  if (u === "K") return Math.round(n * 1_000);
  if (u === "B") return Math.round(n * 1_000_000_000);
  return Math.round(n);
}

export function formatPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "-";
  if (n === 0) return "Free";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function formatPricePerM(n: number | null | undefined): string {
  const p = formatPrice(n);
  return p === "-" || p === "Free" ? p : `${p}/M`;
}

export function formatContext(ctx: string) {
  if (!ctx || ctx === "-") return "-";
  return /context|auto/i.test(ctx) ? ctx : `${ctx} context`;
}

export type CatalogFilters = {
  query?: string;
  provider?: string;
  capability?: ModelCapability | "";
  context?: string;
  price?: string;
  sort?: "popular" | "name" | "price-asc" | "price-desc" | "context-desc" | "context" | string;
};

export function listProviders(): string[] {
  const set = new Set(
    INFERENCE_CATALOG.map((m) => m.provider.replace(/^~/, "")).filter(Boolean),
  );
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function getFeaturedModels(): InferenceModel[] {
  return FEATURED_IDS.map((id) => CATALOG_BY_ID.get(id)!).filter(Boolean);
}

export function filterCatalog(filters: CatalogFilters = {}): InferenceModel[] {
  const q = (filters.query || "").trim().toLowerCase();
  const provider = (filters.provider || "").trim().toLowerCase();
  const capability = filters.capability || "";
  const sort = filters.sort || "popular";

  let list = INFERENCE_CATALOG.filter((m) => {
    if (m.id.includes(":batch")) return false;
    if (m.id.startsWith("~")) return false;
    if (provider && m.provider.replace(/^~/, "").toLowerCase() !== provider) {
      return false;
    }
    if (capability) {
      if (!detectCapabilities(m).includes(capability as ModelCapability)) return false;
    }
    if (filters.context === "128k+") {
      if (parseContextTokens(m.context) < 128_000) return false;
    } else if (filters.context === "200k+") {
      if (parseContextTokens(m.context) < 200_000) return false;
    } else if (filters.context === "1m+") {
      if (parseContextTokens(m.context) < 1_000_000) return false;
    }
    if (filters.price === "free") {
      if ((m.inputPerM ?? 0) !== 0 || (m.outputPerM ?? 0) !== 0) return false;
    } else if (filters.price === "under1") {
      if (m.inputPerM == null || m.inputPerM >= 1) return false;
    } else if (filters.price === "under5") {
      if (m.inputPerM == null || m.inputPerM >= 5) return false;
    }
    if (q) {
      const hay =
        `${m.id} ${m.name} ${m.fullName} ${m.provider} ${m.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  list = [...list].sort((a, b) => {
    if (sort === "price-asc") {
      return (a.inputPerM ?? 999) + (a.outputPerM ?? 0) - ((b.inputPerM ?? 999) + (b.outputPerM ?? 0));
    }
    if (sort === "price-desc") {
      return (b.inputPerM ?? 0) + (b.outputPerM ?? 0) - ((a.inputPerM ?? 0) + (a.outputPerM ?? 0));
    }
    if (sort === "context-desc" || sort === "context") {
      return parseContextTokens(b.context) - parseContextTokens(a.context);
    }
    if (sort === "name") {
      return a.name.localeCompare(b.name);
    }
    // popular (default)
    const diff = popularScore(b) - popularScore(a);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  return list;
}

export function modelDetailHref(id: string): string {
  return `/lab/models/m/${id.split("/").map(encodeURIComponent).join("/")}`;
}

export function modelHref(id: string) {
  return modelDetailHref(id);
}

export function estimateCost(
  inputPerM: number | null,
  outputPerM: number | null,
  promptTokens?: number,
  completionTokens?: number,
): number | null {
  if (inputPerM == null || outputPerM == null) return null;
  if (promptTokens == null && completionTokens == null) return null;
  return (
    ((promptTokens || 0) / 1e6) * inputPerM +
    ((completionTokens || 0) / 1e6) * outputPerM
  );
}

export function estimateCostFromUsage(
  model: InferenceModel | undefined,
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number },
): number | undefined {
  if (!usage) return undefined;
  if (typeof usage.cost === "number") return usage.cost;
  if (!model) return undefined;
  const cost = estimateCost(
    model.inputPerM,
    model.outputPerM,
    usage.prompt_tokens,
    usage.completion_tokens,
  );
  return cost ?? undefined;
}
