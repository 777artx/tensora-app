"use client";

import { useMemo, useState } from "react";
import {
  RANGES,
  formatTick,
  formatValue,
  rangeSeries,
  smoothPath,
  type RangeKey,
  type SeriesKey,
  type Unit,
} from "@/components/lab/growth-series";

const SERIES: { id: SeriesKey; label: string; unit: Unit; note: string; level?: boolean }[] = [
  { id: "volume", label: "Volume", unit: "usd", note: "Credits traded on the order book" },
  { id: "requests", label: "Requests", unit: "count", note: "API calls paid with credits" },
  { id: "tokens", label: "Tokens", unit: "tokens", note: "Input + output tokens served" },
  { id: "revenue", label: "Fees", unit: "usd", note: "1% taker fees; half fund the holder allowance" },
];

const RANGE_KEYS: RangeKey[] = ["24H", "7D", "30D", "90D", "ALL"];

export type GrowthTargets = Record<SeriesKey, number>;

const DEFAULT_TARGETS: GrowthTargets = {
  volume: 6420.35,
  requests: 41_800,
  tokens: 96_000_000,
  gpus: 0,
  agents: 12,
  revenue: 64.2,
};

const W = 600;
const H = 200;

export function GrowthChart({
  dark = false,
  compact = false,
  targets,
}: {
  tick?: number;
  dark?: boolean;
  compact?: boolean;
  targets?: Partial<GrowthTargets>;
}) {
  const merged = { ...DEFAULT_TARGETS, ...targets };
  const [series, setSeries] = useState<SeriesKey>("volume");
  const [range, setRange] = useState<RangeKey>("30D");
  const [hover, setHover] = useState<number | null>(null);
  const meta = SERIES.find((s) => s.id === series)!;
  const pts = useMemo(
    () => rangeSeries(series, merged[series], meta.unit, range),
    [series, merged[series], meta.unit, range], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const values = pts.map((d) => d.value);
  const headline = meta.level ? values[values.length - 1] : values.reduce((a, b) => a + b, 0);
  const half = Math.floor(values.length / 2);
  const a = meta.level ? values[0] : values.slice(0, half).reduce((x, y) => x + y, 0);
  const b = meta.level ? values[values.length - 1] : values.slice(values.length - half).reduce((x, y) => x + y, 0);
  const delta = a > 0 ? ((b - a) / a) * 100 : 0;

  const top = niceCeil(Math.max(...values, 1) * 1.08);
  const coords = values.map((v, i) => ({ x: (i / (values.length - 1)) * W, y: H - (v / top) * H }));
  const line = smoothPath(coords);
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  const active = hover ?? values.length - 1;
  const ax = (coords[active].x / W) * 100;
  const ay = (coords[active].y / H) * 100;

  const muted = dark ? "text-[var(--dark-muted-2)]" : "text-[var(--muted)]";
  const grid = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const n = values.length;
  const ticks = [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1];
  const pill = (on: boolean) =>
    `rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
      on
        ? dark
          ? "bg-white/[0.1] text-white"
          : "bg-white text-[var(--foreground)] shadow-sm"
        : dark
          ? "text-[var(--dark-muted-2)] hover:text-white"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;
  const track = `flex flex-wrap gap-0.5 rounded-lg p-0.5 ${dark ? "bg-white/[0.04]" : "bg-black/[0.04]"}`;

  return (
    <div className={`flex h-full min-h-0 flex-col ${dark ? "text-[var(--dark-fg)]" : "text-[var(--foreground)]"}`}>
      <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 ${compact ? "mb-2" : "mb-3"}`}>
        <div className={track} role="tablist" aria-label="Chart series">
          {SERIES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={series === s.id}
              onClick={() => {
                setSeries(s.id);
                setHover(null);
              }}
              className={pill(series === s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={track} role="tablist" aria-label="Time range">
          {RANGE_KEYS.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => {
                setRange(r);
                setHover(null);
              }}
              className={`${pill(range === r)} font-mono`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[17px] font-medium leading-none tracking-tight tabular-nums">
          {formatValue(headline, meta.unit)}
        </span>
        <span className={`font-mono text-[11px] font-medium tabular-nums ${delta >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
        </span>
        <span className={`text-[11px] ${muted}`}>
          {meta.note} · {RANGES[range].label.toLowerCase()}
          {hover != null ? (
            <>
              {" · "}
              {formatTick(pts[active].date, range)}:{" "}
              <span className={`font-mono tabular-nums ${dark ? "text-white" : "text-[var(--foreground)]"}`}>
                {formatValue(values[active], meta.unit)}
              </span>
            </>
          ) : null}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        <div className={`flex w-11 shrink-0 flex-col justify-between pb-5 text-right font-mono text-[10px] tabular-nums ${muted}`}>
          <span>{formatValue(top, meta.unit, true)}</span>
          <span>{formatValue(top / 2, meta.unit, true)}</span>
          <span>0</span>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className="relative min-h-[120px] flex-1"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const t = (e.clientX - r.left) / Math.max(1, r.width);
              setHover(Math.max(0, Math.min(n - 1, Math.round(t * (n - 1)))));
            }}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="absolute inset-0 h-full w-full overflow-visible"
              preserveAspectRatio="none"
              role="img"
              aria-label={`${meta.label}, ${RANGES[range].label}`}
            >
              {[0, 0.5, 1].map((t) => (
                <line
                  key={t}
                  x1={0}
                  x2={W}
                  y1={t * H}
                  y2={t * H}
                  stroke={grid}
                  strokeWidth={1}
                  strokeDasharray={t === 1 ? undefined : "2 4"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={area} fill={dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"} />
              <path
                d={line}
                fill="none"
                stroke={dark ? "#fafaf8" : "#0a0a0a"}
                strokeWidth={1.75}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {hover != null ? (
              <span
                className={`pointer-events-none absolute bottom-0 top-0 w-px ${dark ? "bg-white/15" : "bg-black/15"}`}
                style={{ left: `${ax}%` }}
                aria-hidden
              />
            ) : null}
            <span
              className={`pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${dark ? "bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.12)]" : "bg-black shadow-[0_0_0_4px_rgba(0,0,0,0.08)]"}`}
              style={{ left: `${ax}%`, top: `${ay}%` }}
              aria-hidden
            />
          </div>
          <div className={`relative mt-1.5 h-3.5 shrink-0 font-mono text-[10px] tabular-nums ${muted}`}>
            {ticks.map((i, k) => (
              <span
                key={k}
                className="absolute whitespace-nowrap"
                style={{
                  left: `${(i / (n - 1)) * 100}%`,
                  transform: k === 0 ? "none" : k === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {k === ticks.length - 1 ? "Now" : formatTick(pts[i].date, range)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function niceCeil(n: number) {
  if (n <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / mag;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((s) => f <= s) ?? 10;
  return step * mag;
}
