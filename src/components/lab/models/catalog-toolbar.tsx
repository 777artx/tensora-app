"use client";

import type { ModelCapability } from "@/lib/lab/inference-catalog";
import { providerLabel } from "@/lib/lab/inference-catalog";

export const CAPABILITIES: ModelCapability[] = [
  "Reasoning",
  "Coding",
  "Vision",
  "Fast",
  "Long Context",
  "Open Source",
];

export type SortKey = "popular" | "name" | "price-asc" | "price-desc" | "context-desc";

const control =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-[12px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--muted-3)]";

export function CatalogToolbar(p: {
  query: string;
  setQuery: (v: string) => void;
  provider: string;
  setProvider: (v: string) => void;
  providers: string[];
  capability: ModelCapability | "";
  setCapability: (v: ModelCapability | "") => void;
  capCounts: Record<string, number>;
  total: number;
  context: string;
  setContext: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  view: "grid" | "list";
  setView: (v: "grid" | "list") => void;
}) {
  const chip = (active: boolean) =>
    `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors ${
      active
        ? "border-[var(--hero)] bg-[var(--hero)] text-[var(--hero-fg)]"
        : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-3)]"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={p.query}
            onChange={(e) => p.setQuery(e.target.value)}
            placeholder={`Search ${p.total.toLocaleString()} models…`}
            aria-label="Search models"
            className={`${control} w-full pl-8`}
          />
        </div>
        <select value={p.provider} onChange={(e) => p.setProvider(e.target.value)} className={control} aria-label="Provider">
          <option value="">All providers</option>
          {p.providers.map((v) => (
            <option key={v} value={v}>
              {providerLabel(v)}
            </option>
          ))}
        </select>
        <select value={p.context} onChange={(e) => p.setContext(e.target.value)} className={control} aria-label="Context">
          <option value="">Any context</option>
          <option value="128k+">128K+</option>
          <option value="200k+">200K+</option>
          <option value="1m+">1M+</option>
        </select>
        <select value={p.price} onChange={(e) => p.setPrice(e.target.value)} className={control} aria-label="Price">
          <option value="">Any price</option>
          <option value="free">Free</option>
          <option value="under1">Under $1/M</option>
          <option value="under5">Under $5/M</option>
        </select>
        <select value={p.sort} onChange={(e) => p.setSort(e.target.value as SortKey)} className={control} aria-label="Sort">
          <option value="popular">Popular</option>
          <option value="name">Name</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="context-desc">Largest context</option>
        </select>
        <div className="flex h-9 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-0.5" role="group" aria-label="View">
          {(["grid", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => p.setView(v)}
              aria-pressed={p.view === v}
              className={`rounded-md px-3 text-[12px] font-medium capitalize ${
                p.view === v ? "bg-[var(--hero)] text-[var(--hero-fg)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        <button type="button" onClick={() => p.setCapability("")} className={chip(!p.capability)}>
          All
        </button>
        {CAPABILITIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => p.setCapability(p.capability === c ? "" : c)}
            className={chip(p.capability === c)}
          >
            {c}
            <span className={`tabular-nums ${p.capability === c ? "text-white/55" : "text-[var(--muted-3)]"}`}>
              {p.capCounts[c] ?? 0}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
