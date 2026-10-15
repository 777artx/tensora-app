"use client";

import { useEffect, useMemo, useState } from "react";
import { pickOffer, sortModels, type GpuModelSummary } from "@/lib/lab/compute";
import { GpuHeader } from "./gpu-header";
import { GpuFilterBar, type GpuSort } from "./gpu-filter-bar";
import { GpuRow, GpuRowHead } from "./gpu-row";

type Props = {
  models: GpuModelSummary[];
  topology: "all" | "single" | "multi";
  onTopologyChange: (t: "all" | "single" | "multi") => void;
  onSelectGpu: (modelKey: string, offerId?: string) => void;
  fetchedAt?: string | null;
  live?: boolean;
  runningCount?: number;
};

const TIERS: { id: string; title: string; note: string; test: (m: GpuModelSummary) => boolean }[] = [
  {
    id: "frontier",
    title: "Frontier",
    note: "141 GB+ · largest models and long-context training",
    test: (m) => m.gpuMemory >= 141,
  },
  {
    id: "datacenter",
    title: "Datacenter",
    note: "40–80 GB · training, fine-tuning, high-throughput serving",
    test: (m) => m.gpuMemory >= 40 && m.gpuMemory < 141 && /^(H|A100|A800|L40)/i.test(m.gpuType),
  },
  {
    id: "workstation",
    title: "Workstation & consumer",
    note: "Inference, diffusion and budget experiments",
    test: () => true,
  },
];

function tierOf(m: GpuModelSummary) {
  return TIERS.find((t) => t.test(m))!.id;
}

/** Best-value pick: cheapest in-stock GPU, nudged toward models with more offers. */
function recommend(models: GpuModelSummary[]) {
  let best: { key: string; offerId: string; score: number } | null = null;
  for (const m of models) {
    if (!m.available || !m.gpuMemory) continue;
    const pick = pickOffer(m.offers, "best-value");
    if (!pick) continue;
    if (m.gpuMemory < 80) continue;
    const perGpu = pick.offer.pricePerHour / Math.max(1, pick.offer.gpuCount);
    const score = perGpu * (1 + 0.15 / Math.max(1, m.availableOfferCount));
    if (!best || score < best.score) best = { key: m.modelKey, offerId: pick.offer.id, score };
  }
  return best;
}

function SectionHead({ title, note, count }: { title: string; note: string; count: number }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-white/[0.05] bg-white/[0.018] px-4 pb-2 pt-5 sm:px-6">
      <span className="text-[13px] font-semibold tracking-tight text-white/85">{title}</span>
      <span className="font-mono text-[11px] tabular-nums text-white/30">{count}</span>
      <span className="basis-full text-[12px] leading-snug text-white/40 sm:basis-auto sm:truncate">{note}</span>
    </div>
  );
}

export function GpuChoose({ models, topology, onTopologyChange, onSelectGpu, fetchedAt, live, runningCount }: Props) {
  const [query, setQuery] = useState("");
  const [vramMin, setVramMin] = useState<number | null>(null);
  const [provider, setProvider] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState<GpuSort>("best-value");
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!fetchedAt) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [fetchedAt]);

  const updatedSec =
    fetchedAt != null ? Math.max(0, Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 1000)) : null;

  const providers = useMemo(() => {
    const set = new Set<string>();
    models.forEach((m) => m.providers.forEach((p) => set.add(p)));
    return [...set].sort();
  }, [models]);

  const regions = useMemo(() => {
    const set = new Set<string>();
    models.forEach((m) => m.regions.forEach((r) => set.add(r)));
    return [...set].sort();
  }, [models]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = models.filter((m) => {
      if (q && !`${m.label} ${m.gpuType} ${m.socket}`.toLowerCase().includes(q)) return false;
      if (vramMin != null && m.gpuMemory < vramMin) return false;
      if (provider && !m.providers.includes(provider)) return false;
      if (region && !m.regions.includes(region)) return false;
      return true;
    });
    const sorted = sortModels(list, sort);
    return sorted
      .map((m, i) => ({ m, i }))
      .sort((a, b) => Number(!a.m.available) - Number(!b.m.available) || a.i - b.i)
      .map(({ m }) => m);
  }, [models, query, vramMin, provider, region, sort]);

  const gpuRows = filtered.filter((m) => m.gpuMemory > 0);
  const cpuRows = filtered.filter((m) => !m.gpuMemory);
  const rec = useMemo(() => recommend(gpuRows), [gpuRows]);
  const recModel = rec ? gpuRows.find((m) => m.modelKey === rec.key) || null : null;
  const sections = TIERS.map((t) => ({
    ...t,
    rows: gpuRows.filter((m) => m.modelKey !== recModel?.modelKey && tierOf(m) === t.id),
  })).filter((s) => s.rows.length > 0);

  const cheapestKey = useMemo(() => {
    let best: GpuModelSummary | null = null;
    for (const m of gpuRows) {
      if (m.minPrice == null || !m.available) continue;
      if (!best || m.minPrice < (best.minPrice ?? Infinity)) best = m;
    }
    return best?.modelKey ?? null;
  }, [gpuRows]);

  const activeFilters = [query, vramMin, provider, region].filter(Boolean).length;

  function reset() {
    setQuery("");
    setVramMin(null);
    setProvider("");
    setRegion("");
  }

  return (
    <div className="flex flex-col gap-6">
      <GpuHeader
        models={models}
        live={Boolean(live)}
        updatedSec={updatedSec}
        runningCount={runningCount}
      />

      <div className="lab-dark overflow-hidden rounded-[var(--lab-radius-card)] border border-[var(--dark-border)] bg-[var(--dark)] text-[var(--dark-fg)] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_24px_48px_-24px_rgba(0,0,0,0.35)]">
        <GpuFilterBar
          query={query}
          onQuery={setQuery}
          topology={topology}
          onTopology={onTopologyChange}
          vramMin={vramMin}
          onVram={setVramMin}
          region={region}
          regions={regions}
          onRegion={setRegion}
          provider={provider}
          providers={providers}
          onProvider={setProvider}
          sort={sort}
          onSort={setSort}
          activeFilters={activeFilters}
          onReset={reset}
          shown={gpuRows.length}
          total={models.filter((m) => m.gpuMemory > 0).length}
        />

        <GpuRowHead />

        {gpuRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="m-0 text-[13px] text-white/60">No GPUs match these filters.</p>
            {activeFilters > 0 ? (
              <button type="button" onClick={reset} className="text-[12px] text-[var(--orange)] hover:underline">
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {recModel ? (
              <GpuRow
                model={recModel}
                recommended
                onSelect={() => onSelectGpu(recModel.modelKey, rec?.offerId)}
              />
            ) : null}
            {sections.map((s) => (
              <section key={s.id} aria-label={s.title}>
                <SectionHead title={s.title} note={s.note} count={s.rows.length} />
                {s.rows.map((m) => (
                  <GpuRow
                    key={m.modelKey}
                    model={m}
                    cheapest={m.modelKey === cheapestKey}
                    onSelect={() => onSelectGpu(m.modelKey)}
                  />
                ))}
              </section>
            ))}
          </>
        )}

        {cpuRows.length > 0 ? (
          <section aria-label="CPU nodes">
            <SectionHead title="CPU nodes" note="Data prep, APIs and light jobs" count={cpuRows.length} />
            {cpuRows.map((m) => (
              <GpuRow key={m.modelKey} model={m} onSelect={() => onSelectGpu(m.modelKey)} />
            ))}
          </section>
        ) : null}

        <div className="border-t border-white/[0.06] px-4 py-3 text-[12px] leading-relaxed text-white/40 sm:px-6">
          Lowest in-stock price per GPU per hour. A struck price is the provider’s list rate. Multi-GPU nodes are priced per card.
        </div>
      </div>
    </div>
  );
}
