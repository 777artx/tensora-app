"use client";

import { useState } from "react";
import { providerLabel, regionLabel } from "@/lib/lab/compute";

export type GpuSort = "best-value" | "cheapest" | "most-available" | "newest";

const SORTS: [GpuSort, string][] = [
  ["best-value", "Best value"],
  ["cheapest", "Cheapest"],
  ["most-available", "Most stock"],
  ["newest", "Newest"],
];

const VRAM: [number | null, string][] = [
  [null, "Any VRAM"],
  [24, "24 GB+"],
  [48, "48 GB+"],
  [80, "80 GB+"],
  [141, "141 GB+"],
];

const selectCls =
  "h-11 w-full min-w-0 rounded-lg border-0 bg-white/[0.04] px-2.5 text-[16px] text-white/75 outline-none ring-1 ring-inset ring-white/[0.07] focus:ring-[var(--orange)]/50 sm:h-9 sm:w-auto sm:text-[12px] [&>option]:bg-[#141416]";

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex w-full rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-inset ring-white/[0.06] sm:w-auto">
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`min-h-10 flex-1 rounded-md px-2.5 text-[13px] transition-colors sm:min-h-0 sm:flex-none sm:px-3 sm:py-1.5 sm:text-[12px] ${
            value === id ? "bg-white/[0.1] font-medium text-white" : "text-white/50 hover:text-white/80"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function GpuFilterBar(props: {
  query: string;
  onQuery: (v: string) => void;
  topology: "all" | "single" | "multi";
  onTopology: (t: "all" | "single" | "multi") => void;
  vramMin: number | null;
  onVram: (v: number | null) => void;
  region: string;
  regions: string[];
  onRegion: (v: string) => void;
  provider: string;
  providers: string[];
  onProvider: (v: string) => void;
  sort: GpuSort;
  onSort: (v: GpuSort) => void;
  activeFilters: number;
  onReset: () => void;
  shown: number;
  total: number;
}) {
  const [more, setMore] = useState(false);
  const extraOn = Boolean(props.region || props.provider);

  return (
    <div className="flex flex-col gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-6 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="relative min-w-0 w-full lg:max-w-[320px] lg:flex-1">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3 3" strokeLinecap="round" />
        </svg>
        <input
          value={props.query}
          onChange={(e) => props.onQuery(e.target.value)}
          placeholder="Search B200, H100, 4090, L40S…"
          aria-label="Search GPUs"
          className="h-11 w-full rounded-lg border-0 bg-white/[0.04] pl-8 pr-2.5 text-[16px] text-white outline-none ring-1 ring-inset ring-white/[0.07] placeholder:text-white/30 focus:ring-[var(--orange)]/50 sm:h-9 sm:text-[13px]"
        />
      </div>

      <Segmented
        label="Topology"
        options={[
          ["all", "All configs"],
          ["single", "1 GPU"],
          ["multi", "Multi-GPU"],
        ]}
        value={props.topology}
        onChange={props.onTopology}
      />

      <div className="grid grid-cols-2 gap-2 sm:contents">
        <select
          value={props.vramMin == null ? "" : String(props.vramMin)}
          onChange={(e) => props.onVram(e.target.value ? Number(e.target.value) : null)}
          aria-label="Minimum VRAM"
          className={selectCls}
        >
          {VRAM.map(([v, t]) => (
            <option key={t} value={v == null ? "" : String(v)}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={props.sort}
          onChange={(e) => props.onSort(e.target.value as GpuSort)}
          aria-label="Sort"
          className={selectCls}
        >
          {SORTS.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        aria-expanded={more || extraOn}
        onClick={() => setMore((v) => !v)}
        className={`h-11 rounded-lg px-3 text-[13px] ring-1 ring-inset lg:hidden ${
          extraOn ? "bg-[var(--orange)]/15 text-[var(--orange)] ring-[var(--orange)]/40" : "text-white/70 ring-white/[0.08]"
        }`}
      >
        {more || extraOn ? "Hide filters" : "Region & provider"}
      </button>

      <div className={`${more || extraOn ? "grid grid-cols-2 gap-2" : "hidden"} lg:contents`}>
        <select value={props.region} onChange={(e) => props.onRegion(e.target.value)} aria-label="Region" className={selectCls}>
          <option value="">All regions</option>
          {props.regions.map((r) => (
            <option key={r} value={r}>
              {regionLabel(r)}
            </option>
          ))}
        </select>
        <select
          value={props.provider}
          onChange={(e) => props.onProvider(e.target.value)}
          aria-label="Provider"
          className={selectCls}
        >
          <option value="">All providers</option>
          {props.providers.map((p) => (
            <option key={p} value={p}>
              {providerLabel(p)}
            </option>
          ))}
        </select>
      </div>

      {props.activeFilters > 0 ? (
        <button type="button" onClick={props.onReset} className="h-11 px-1 text-left text-[13px] text-white/55 hover:text-white sm:h-9 sm:text-[12px]">
          Reset
        </button>
      ) : null}

      <div className="flex items-center lg:ml-auto">
        <span className="text-[12px] tabular-nums text-white/40">
          {props.shown} of {props.total}
        </span>
      </div>
    </div>
  );
}
