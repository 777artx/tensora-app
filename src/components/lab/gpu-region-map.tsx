"use client";

import { useMemo } from "react";
import {
  formatPrice,
  isOfferInStock,
  regionLabel,
  stockLabel,
  type GpuModelSummary,
} from "@/lib/lab/compute";

type RegionRow = {
  key: string;
  label: string;
  offers: number;
  available: number;
  limited: number;
  quote: number;
  minPrice: number | null;
  providers: number;
};

function buildRegionRows(models: GpuModelSummary[]): RegionRow[] {
  const byRegion = new Map<
    string,
    {
      offers: number;
      available: number;
      limited: number;
      quote: number;
      minPrice: number | null;
      providers: Set<string>;
    }
  >();

  for (const m of models) {
    for (const o of m.offers) {
      const key = o.region || "unknown";
      const row = byRegion.get(key) || {
        offers: 0,
        available: 0,
        limited: 0,
        quote: 0,
        minPrice: null as number | null,
        providers: new Set<string>(),
      };
      row.offers += 1;
      row.providers.add(o.provider);
      const stock = stockLabel(o);
      if (stock === "Available") row.available += 1;
      else if (stock === "Limited") row.limited += 1;
      else row.quote += 1;
      if (isOfferInStock(o) && o.pricePerHour > 0) {
        row.minPrice =
          row.minPrice == null ? o.pricePerHour : Math.min(row.minPrice, o.pricePerHour);
      }
      byRegion.set(key, row);
    }
  }

  return [...byRegion.entries()]
    .map(([key, r]) => ({
      key,
      label: regionLabel(key),
      offers: r.offers,
      available: r.available,
      limited: r.limited,
      quote: r.quote,
      minPrice: r.minPrice,
      providers: r.providers.size,
    }))
    .sort((a, b) => b.offers - a.offers);
}

export function GpuRegionMap({
  models,
  selectedRegion = "",
  onSelectRegion,
}: {
  models: GpuModelSummary[];
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
}) {
  const rows = useMemo(() => buildRegionRows(models), [models]);
  const maxOffers = Math.max(1, ...rows.map((r) => r.offers));

  const totals = useMemo(() => {
    let offers = 0;
    let available = 0;
    let limited = 0;
    let minPrice: number | null = null;
    const providers = new Set<string>();
    for (const m of models) {
      for (const o of m.offers) {
        offers += 1;
        providers.add(o.provider);
        const stock = stockLabel(o);
        if (stock === "Available") available += 1;
        else if (stock === "Limited") limited += 1;
        if (isOfferInStock(o) && o.pricePerHour > 0) {
          minPrice = minPrice == null ? o.pricePerHour : Math.min(minPrice, o.pricePerHour);
        }
      }
    }
    return { offers, available, limited, minPrice, providers: providers.size };
  }, [models]);

  return (
    <div className="overflow-hidden rounded-[var(--lab-radius-card)] border border-white/10 bg-[var(--dark)] text-[var(--dark-fg)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h3 className="m-0 text-[15px] font-semibold tracking-tight">Offers by region</h3>
          <p className="m-0 mt-0.5 text-[12px] text-[var(--dark-muted)]">
            {totals.offers} offer{totals.offers === 1 ? "" : "s"}
            {totals.minPrice != null ? ` · from ${formatPrice(totals.minPrice)}/hr` : ""}
            {totals.providers ? ` · ${totals.providers} providers` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] tabular-nums text-[var(--dark-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--live)]" />
            {totals.available} available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f87171]/80" />
            {totals.limited} limited
          </span>
        </div>
      </div>

      {!rows.length ? (
        <div className="px-5 py-10 text-center text-[13px] text-[var(--dark-muted)]">
          No GPU offers loaded yet.
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-white/[0.06] p-0">
          {rows.map((r) => {
            const active = selectedRegion === r.key;
            const pct = Math.max(4, Math.round((r.offers / maxOffers) * 100));
            return (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => onSelectRegion?.(active ? "" : r.key)}
                  className={`flex w-full flex-col gap-2 px-5 py-3.5 text-left transition-colors sm:flex-row sm:items-center sm:gap-4 ${
                    active
                      ? "bg-[var(--orange-soft)]"
                      : "hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="w-full shrink-0 sm:w-[7.5rem]">
                    <div className="text-[13px] font-medium">{r.label}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--dark-muted-2)]">
                      {r.providers} provider{r.providers === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full ${
                          active ? "bg-grad" : "bg-white/35"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] tabular-nums sm:justify-end">
                    <span className="min-w-[4.5rem] text-[var(--dark-muted)]">
                      {r.offers} offer{r.offers === 1 ? "" : "s"}
                    </span>
                    <span className="min-w-[5.5rem] font-medium">
                      {r.minPrice != null ? `from ${formatPrice(r.minPrice)}` : "Quote"}
                    </span>
                    <span className="inline-flex items-center gap-3 text-[var(--dark-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-[var(--live)]" />
                        {r.available}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-[#f87171]/80" />
                        {r.limited}
                      </span>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-white/10 px-5 py-2.5 text-[11px] text-[var(--dark-muted-2)]">
        From loaded marketplace inventory · click a region to filter
      </div>
    </div>
  );
}
