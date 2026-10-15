import { promises as fs } from "fs";
import path from "path";

export type LeaderboardRow = {
  rank: number;
  model: string;
  organization: string;
  slug: string;
  intelligence: number | null;
  coding: number | null;
  agentic: number | null;
  bestAt: string;
  bestAtDetail: string;
  speedTokPerSec: number | null;
  priceBlended: number | null;
  openWeights: boolean;
};

export type LeaderboardPayload = {
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  snapshotDate: string | null;
  rows: LeaderboardRow[];
  categories: {
    overall: LeaderboardRow[];
    coding: LeaderboardRow[];
    agents: LeaderboardRow[];
  };
};

type AaModel = {
  name?: string;
  short_name?: string;
  slug?: string;
  deprecated?: boolean;
  open_weights?: boolean;
  creator?: { name?: string };
  evaluations?: Record<string, number | boolean | null | undefined>;
  pricing?: { price_1m_blended_3_to_1?: number | null };
  speed?: { output_tokens_per_second?: number | null };
};

const DATA_DIR = path.join(process.cwd(), ".data");
const CACHE_FILE = path.join(DATA_DIR, "aa-leaderboard.json");
const FALLBACK_FILE = path.join(process.cwd(), "src/lib/lab/aa-leaderboard-fallback.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const MIRROR_LATEST =
  "https://raw.githubusercontent.com/oolong-tea-2026/artificial-analysis-leaderboards/main/data/latest.json";
const MIRROR_BASE =
  "https://raw.githubusercontent.com/oolong-tea-2026/artificial-analysis-leaderboards/main";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function bestAtFor(m: AaModel): { bestAt: string; bestAtDetail: string } {
  const e = m.evaluations || {};
  const intel = num(e.artificial_analysis_intelligence_index) ?? 0;
  const coding = num(e.artificial_analysis_coding_index) ?? 0;
  const agentic = num(e.artificial_analysis_agentic_index) ?? 0;
  const gpqa = num(e.gpqa) ?? 0;
  const hle = num(e.hle) ?? 0;

  const scored: { label: string; score: number; detail: string }[] = [
    {
      label: "Overall intelligence",
      score: intel,
      detail: `Intelligence Index ${intel.toFixed(1)}`,
    },
    {
      label: "Coding",
      score: coding * 1.02,
      detail: `Coding Index ${coding.toFixed(1)}`,
    },
    {
      label: "Agents",
      score: agentic * 1.02,
      detail: `Agentic Index ${agentic.toFixed(1)}`,
    },
  ];

  if (gpqa > 0.75) {
    scored.push({
      label: "Hard science / GPQA",
      score: gpqa * 70,
      detail: `GPQA ${(gpqa * 100).toFixed(0)}%`,
    });
  }
  if (hle > 0.2) {
    scored.push({
      label: "Hard problems",
      score: hle * 80,
      detail: `HLE ${(hle * 100).toFixed(1)}%`,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  return { bestAt: top.label, bestAtDetail: top.detail };
}

function toRow(m: AaModel, rank: number): LeaderboardRow {
  const e = m.evaluations || {};
  const { bestAt, bestAtDetail } = bestAtFor(m);
  return {
    rank,
    model: m.short_name || m.name || m.slug || "Unknown",
    organization: m.creator?.name || "-",
    slug: m.slug || "",
    intelligence: num(e.artificial_analysis_intelligence_index),
    coding: num(e.artificial_analysis_coding_index),
    agentic: num(e.artificial_analysis_agentic_index),
    bestAt,
    bestAtDetail,
    speedTokPerSec: num(m.speed?.output_tokens_per_second),
    priceBlended: num(m.pricing?.price_1m_blended_3_to_1),
    openWeights: Boolean(m.open_weights),
  };
}

function buildPayload(
  models: AaModel[],
  meta: { sourceUrl?: string; fetchedAt?: string; snapshotDate?: string | null }
): LeaderboardPayload {
  const active = models.filter((m) => !m.deprecated);
  const byIntel = [...active].sort(
    (a, b) =>
      (num(b.evaluations?.artificial_analysis_intelligence_index) ?? -1) -
      (num(a.evaluations?.artificial_analysis_intelligence_index) ?? -1)
  );
  const byCoding = [...active]
    .filter((m) => num(m.evaluations?.artificial_analysis_coding_index) != null)
    .sort(
      (a, b) =>
        (num(b.evaluations?.artificial_analysis_coding_index) ?? -1) -
        (num(a.evaluations?.artificial_analysis_coding_index) ?? -1)
    );
  const byAgents = [...active]
    .filter((m) => num(m.evaluations?.artificial_analysis_agentic_index) != null)
    .sort(
      (a, b) =>
        (num(b.evaluations?.artificial_analysis_agentic_index) ?? -1) -
        (num(a.evaluations?.artificial_analysis_agentic_index) ?? -1)
    );

  const overall = byIntel.slice(0, 25).map((m, i) => toRow(m, i + 1));
  const coding = byCoding.slice(0, 25).map((m, i) => toRow(m, i + 1));
  const agents = byAgents.slice(0, 25).map((m, i) => toRow(m, i + 1));

  return {
    source: "Artificial Analysis",
    sourceUrl: meta.sourceUrl || "https://artificialanalysis.ai/leaderboards/models",
    fetchedAt: meta.fetchedAt || new Date().toISOString(),
    snapshotDate: meta.snapshotDate ?? null,
    rows: overall,
    categories: { overall, coding, agents },
  };
}

async function fetchFromOfficialApi(): Promise<LeaderboardPayload | null> {
  const key = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  if (!key) return null;

  const res = await fetch("https://artificialanalysis.ai/api/v2/language/models/free?page=1", {
    headers: { "x-api-key": key, Accept: "application/json" },
    next: { revalidate: 21600 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: AaModel[];
    pagination?: { total_pages?: number };
  };
  let models = json.data || [];
  const pages = json.pagination?.total_pages || 1;
  for (let page = 2; page <= Math.min(pages, 5); page++) {
    const r = await fetch(
      `https://artificialanalysis.ai/api/v2/language/models/free?page=${page}`,
      { headers: { "x-api-key": key, Accept: "application/json" } }
    );
    if (!r.ok) break;
    const body = (await r.json()) as { data?: AaModel[] };
    models = models.concat(body.data || []);
  }
  // Official free shape may nest evaluations differently. normalize if flat
  const normalized = models.map((m) => {
    const anyM = m as AaModel & Record<string, unknown>;
    if (anyM.evaluations) return m;
    return {
      ...m,
      evaluations: {
        artificial_analysis_intelligence_index: num(
          anyM.artificial_analysis_intelligence_index
        ),
        artificial_analysis_coding_index: num(anyM.artificial_analysis_coding_index),
        artificial_analysis_agentic_index: num(anyM.artificial_analysis_agentic_index),
      },
      creator: (anyM.model_creator as AaModel["creator"]) || m.creator,
    };
  });
  return buildPayload(normalized, {
    sourceUrl: "https://artificialanalysis.ai/leaderboards/models",
    fetchedAt: new Date().toISOString(),
    snapshotDate: new Date().toISOString().slice(0, 10),
  });
}

async function fetchFromPublicMirror(): Promise<LeaderboardPayload> {
  const latestRes = await fetch(MIRROR_LATEST, { next: { revalidate: 21600 } });
  if (!latestRes.ok) throw new Error(`Mirror latest failed: ${latestRes.status}`);
  const latest = (await latestRes.json()) as { date?: string; path?: string };
  const pathPart = latest.path || (latest.date ? `data/${latest.date}` : null);
  if (!pathPart) throw new Error("Mirror latest missing path");

  const llmsRes = await fetch(`${MIRROR_BASE}/${pathPart}/llms.json`, {
    next: { revalidate: 21600 },
  });
  if (!llmsRes.ok) throw new Error(`Mirror llms failed: ${llmsRes.status}`);
  const llms = (await llmsRes.json()) as {
    meta?: { source_url?: string; fetched_at?: string };
    models?: AaModel[];
  };

  return buildPayload(llms.models || [], {
    sourceUrl: llms.meta?.source_url || "https://artificialanalysis.ai/leaderboards/models",
    fetchedAt: new Date().toISOString(),
    snapshotDate: latest.date || pathPart.replace(/^data\//, ""),
  });
}

async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getLeaderboard(forceRefresh = false): Promise<LeaderboardPayload> {
  if (!forceRefresh) {
    const cached = await readJsonFile<LeaderboardPayload & { cachedAt?: string }>(CACHE_FILE);
    if (cached?.cachedAt && cached.rows?.length) {
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      if (age < CACHE_TTL_MS) return cached;
    }
  }

  try {
    const live =
      (await fetchFromOfficialApi()) || (await fetchFromPublicMirror());
    const toStore = { ...live, cachedAt: new Date().toISOString() };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(toStore, null, 2));
    return live;
  } catch (err) {
    console.warn("[lab/leaderboard] live fetch failed", err);
    const cached = await readJsonFile<LeaderboardPayload>(CACHE_FILE);
    if (cached?.rows?.length) return cached;
    const fallback = await readJsonFile<LeaderboardPayload>(FALLBACK_FILE);
    if (fallback?.rows?.length) return fallback;
    throw err;
  }
}
