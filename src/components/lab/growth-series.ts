export type SeriesKey = "volume" | "requests" | "tokens" | "gpus" | "agents" | "revenue";
export type Unit = "count" | "usd" | "hours" | "tokens";
export type RangeKey = "24H" | "7D" | "30D" | "90D" | "ALL";

type Profile = {
  seed: number;
  /** Growth across 30 days (0.35 = last day ~35% above first). */
  growth: number;
  /** Weekend level vs weekday (1 = no dip). */
  weekend: number;
  /** Step-to-step noise size. */
  noise: number;
  /** Level series (active count) instead of a summed flow. */
  level?: boolean;
};

const PROFILES: Record<SeriesKey, Profile> = {
  volume: { seed: 11, growth: 0.38, weekend: 0.84, noise: 0.07 },
  requests: { seed: 51, growth: 0.44, weekend: 0.8, noise: 0.06 },
  tokens: { seed: 67, growth: 0.52, weekend: 0.82, noise: 0.08 },
  gpus: { seed: 37, growth: 0.26, weekend: 0.9, noise: 0.045 },
  agents: { seed: 79, growth: 0.3, weekend: 0.95, noise: 0.025, level: true },
  revenue: { seed: 23, growth: 0.42, weekend: 0.82, noise: 0.08 },
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const DAYS = 30;

type RangeSpec = { steps: number; stepHours: number; label: string };

export const RANGES: Record<RangeKey, RangeSpec> = {
  "24H": { steps: 24, stepHours: 1, label: "Last 24 hours" },
  "7D": { steps: 7, stepHours: 24, label: "Last 7 days" },
  "30D": { steps: 30, stepHours: 24, label: "Last 30 days" },
  "90D": { steps: 90, stepHours: 24, label: "Last 90 days" },
  ALL: { steps: 32, stepHours: 24 * 7, label: "All time (weekly)" },
};

export type Point = { date: Date; value: number };

/**
 * Build a series for `range`, scaled so the trailing 30 days sum to `total30d`
 * (or, for level series, so the latest point equals `total30d`).
 */
export function rangeSeries(key: SeriesKey, total30d: number, unit: Unit, range: RangeKey, now = new Date()): Point[] {
  const p = PROFILES[key];
  const spec = RANGES[range];
  const rand = rng(p.seed + spec.steps * 7);
  const stepDays = spec.stepHours / 24;
  const spanDays = spec.steps * stepDays;
  // Daily growth rate implied by 30D growth.
  const dailyG = Math.pow(1 + p.growth, 1 / (DAYS - 1)) - 1;
  // Long ranges grow more slowly early on so ALL doesn't explode.
  const g = range === "ALL" ? dailyG * 0.55 : dailyG;

  let drift = 0;
  const raw: { date: Date; r: number }[] = [];
  for (let i = 0; i < spec.steps; i++) {
    const date = new Date(now.getTime() - (spec.steps - 1 - i) * spec.stepHours * 3600_000);
    const daysAgo = (spec.steps - 1 - i) * stepDays;
    const trend = Math.pow(1 + g, -daysAgo);
    let season = 1;
    if (spec.stepHours === 1) {
      const h = date.getHours();
      // US/EU working hours busier.
      season = 0.55 + 0.45 * Math.max(0, Math.sin(((h - 6) / 24) * Math.PI * 2 * 0.9 + 0.2)) + 0.25;
    } else if (spec.stepHours === 24) {
      const dow = date.getDay();
      season = dow === 0 || dow === 6 ? p.weekend : 1;
    }
    drift = drift * 0.6 + (rand() - 0.5) * 2 * p.noise;
    raw.push({ date, r: Math.max(0.05, trend * season * (1 + drift)) });
  }

  let scale: number;
  if (p.level) {
    scale = total30d / raw[raw.length - 1].r;
  } else {
    // Reference: what the last 30 days would sum to in raw daily units.
    let ref30 = 0;
    for (let d = 0; d < DAYS; d++) ref30 += Math.pow(1 + g, -d) * (d % 7 === 0 || d % 7 === 6 ? p.weekend : 1);
    const perDay = total30d / ref30;
    scale = perDay * stepDays;
    void spanDays;
    // 30D headline must equal the KPI exactly.
    if (range === "30D") scale = total30d / raw.reduce((s, x) => s + x.r, 0);
  }
  return raw.map(({ date, r }) => {
    const v = r * scale;
    return { date, value: unit === "usd" ? Math.round(v * 100) / 100 : Math.round(v) };
  });
}

export function formatValue(n: number, unit: Unit, compact = false) {
  if (unit === "usd") {
    if (compact || n >= 100_000) return n >= 1000 ? `$${shortNum(n)}` : `$${Math.round(n)}`;
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const base = compact || n >= 100_000 ? shortNum(n) : Math.round(n).toLocaleString("en-US");
  if (unit === "hours") return `${base} hrs`;
  return base;
}

function shortNum(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e8 ? 0 : 2)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
  return `${Math.round(n)}`;
}

export function formatDay(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatTick(d: Date, range: RangeKey) {
  if (range === "24H") return d.toLocaleTimeString("en-US", { hour: "numeric" });
  if (range === "ALL") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return formatDay(d);
}

/** Smooth path through points without overshooting (monotone cubic). */
export function smoothPath(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 2) return "";
  const m: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  let path = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = (pts[i + 1].x - pts[i].x) / 3;
    path += ` C${(pts[i].x + h).toFixed(1)} ${(pts[i].y + m[i] * h).toFixed(1)} ${(pts[i + 1].x - h).toFixed(1)} ${(pts[i + 1].y - m[i + 1] * h).toFixed(1)} ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
  }
  return path;
}
