/**
 * First-party analytics. Counters live in the same Upstash Redis as the ledger
 * (HINCRBY on per-day hashes). Without Redis it keeps counts in memory so dev works.
 *
 * Keys
 *   olora:an:{project}:d:{YYYY-MM-DD}   hash  event -> count, event:usd -> cents
 *   olora:an:{project}:m:{epochMinute}  hash  same, kept 3 days (first-15m windows)
 *   olora:an:{project}:uv:{YYYY-MM-DD}  HyperLogLog of visitor ids
 */

export const EVENTS = [
  "pageview",
  "visit_landing",
  "signup",
  "wallet_connect",
  "deposit",
  "trade",
  "subscribe",
  "card_declined",
  "chat",
] as const;
export type AnalyticsEvent = (typeof EVENTS)[number];

export function isEvent(v: string): v is AnalyticsEvent {
  return (EVENTS as readonly string[]).includes(v);
}

function cfg() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  return url && token ? { url, token } : null;
}

const mem = new Map<string, Map<string, number>>();
const memUv = new Map<string, Set<string>>();

async function pipeline(cmds: (string | number)[][]): Promise<unknown[]> {
  const c = cfg();
  if (!c) return [];
  const res = await fetch(`${c.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds.map((x) => x.map(String))),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => [])) as { result?: unknown }[];
  return Array.isArray(data) ? data.map((d) => d?.result) : [];
}

export function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function clean(project: string) {
  return (project || "olora").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "olora";
}

export async function track(opts: {
  project?: string;
  event: AnalyticsEvent;
  usd?: number;
  visitor?: string;
  at?: Date;
}) {
  const p = clean(opts.project || "olora");
  const at = opts.at ?? new Date();
  const d = `olora:an:${p}:d:${dayKey(at)}`;
  const m = `olora:an:${p}:m:${Math.floor(at.getTime() / 60000)}`;
  const cents = Math.max(0, Math.round((opts.usd || 0) * 100));
  const fields: [string, number][] = [[opts.event, 1]];
  if (cents > 0) fields.push([`${opts.event}:usd`, cents]);

  if (!cfg()) {
    for (const key of [d, m]) {
      const h = mem.get(key) ?? new Map<string, number>();
      for (const [f, n] of fields) h.set(f, (h.get(f) || 0) + n);
      mem.set(key, h);
    }
    if (opts.visitor) {
      const k = `olora:an:${p}:uv:${dayKey(at)}`;
      const s = memUv.get(k) ?? new Set<string>();
      s.add(opts.visitor);
      memUv.set(k, s);
    }
    return;
  }
  const cmds: (string | number)[][] = [];
  for (const [f, n] of fields) {
    cmds.push(["HINCRBY", d, f, n]);
    cmds.push(["HINCRBY", m, f, n]);
  }
  cmds.push(["EXPIRE", m, 3 * 24 * 3600]);
  if (opts.visitor) cmds.push(["PFADD", `olora:an:${p}:uv:${dayKey(at)}`, opts.visitor.slice(0, 64)]);
  try {
    await pipeline(cmds);
  } catch {
    /* analytics must never break a request */
  }
}

/** Fire-and-forget helper for server routes. */
export function trackSoon(event: AnalyticsEvent, usd?: number, visitor?: string) {
  void track({ event, usd, visitor }).catch(() => undefined);
}

export type DayRow = { day: string; uniques: number; counts: Record<string, number>; usd: Record<string, number> };

function parseHash(raw: unknown): Map<string, number> {
  const out = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (let i = 0; i + 1 < raw.length; i += 2) out.set(String(raw[i]), Number(raw[i + 1]) || 0);
  }
  return out;
}

function toRow(day: string, h: Map<string, number>, uniques: number): DayRow {
  const counts: Record<string, number> = {};
  const usd: Record<string, number> = {};
  for (const [k, v] of h) {
    if (k.endsWith(":usd")) usd[k.slice(0, -4)] = v / 100;
    else counts[k] = v;
  }
  return { day, uniques, counts, usd };
}

export async function readDays(project: string, days: number): Promise<DayRow[]> {
  const p = clean(project);
  const list: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) list.push(dayKey(new Date(now - i * 86400000)));
  if (!cfg()) {
    return list.map((day) =>
      toRow(day, mem.get(`olora:an:${p}:d:${day}`) ?? new Map(), memUv.get(`olora:an:${p}:uv:${day}`)?.size ?? 0)
    );
  }
  const cmds: (string | number)[][] = [];
  for (const day of list) {
    cmds.push(["HGETALL", `olora:an:${p}:d:${day}`]);
    cmds.push(["PFCOUNT", `olora:an:${p}:uv:${day}`]);
  }
  const res = await pipeline(cmds).catch(() => [] as unknown[]);
  return list.map((day, i) => toRow(day, parseHash(res[i * 2]), Number(res[i * 2 + 1]) || 0));
}

/** Per-minute rows for a window, e.g. the first 15 minutes after launch. */
export async function readMinutes(project: string, startMs: number, minutes: number): Promise<DayRow[]> {
  const p = clean(project);
  const first = Math.floor(startMs / 60000);
  const keys = Array.from({ length: minutes }, (_, i) => first + i);
  if (!cfg()) {
    return keys.map((k) => toRow(new Date(k * 60000).toISOString(), mem.get(`olora:an:${p}:m:${k}`) ?? new Map(), 0));
  }
  const res = await pipeline(keys.map((k) => ["HGETALL", `olora:an:${p}:m:${k}`])).catch(() => [] as unknown[]);
  return keys.map((k, i) => toRow(new Date(k * 60000).toISOString(), parseHash(res[i]), 0));
}
