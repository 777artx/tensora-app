"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CostTier, ModelCapability } from "@/lib/lab/inference-catalog";
import { filterCatalog, getFeaturedModels, listProviders } from "@/lib/lab/inference-catalog";
import { ModelCard, ModelListRow } from "./model-card";
import { TensoraAutoModule } from "./tensora-auto-module";
import { CatalogPager } from "./catalog-pager";
import { CAPABILITIES, CatalogToolbar, type SortKey } from "./catalog-toolbar";
import { LabCard, LabDarkModule } from "@/components/lab/ui";

const GRID_PAGE = 12;
const LIST_PAGE = 20;

export function ExploreCatalog({ onTryAuto }: { onTryAuto?: (tier: CostTier) => void }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("");
  const [capability, setCapability] = useState<ModelCapability | "">("");
  const [context, setContext] = useState("");
  const [price, setPrice] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  const providers = useMemo(() => listProviders(), []);
  const featured = useMemo(() => getFeaturedModels().slice(0, 4), []);
  const models = useMemo(
    () => filterCatalog({ query, provider, capability, context, price, sort }),
    [query, provider, capability, context, price, sort]
  );
  const total = useMemo(() => filterCatalog({}).length, []);
  const capCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of CAPABILITIES) {
      out[c] = filterCatalog({ query, provider, capability: c, context, price }).length;
    }
    return out;
  }, [query, provider, context, price]);

  const pageSize = view === "grid" ? GRID_PAGE : LIST_PAGE;
  const pageCount = Math.max(1, Math.ceil(models.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = models.slice((current - 1) * pageSize, current * pageSize);

  // Reset to first page whenever the result set changes shape.
  useEffect(() => {
    setPage(1);
  }, [query, provider, capability, context, price, sort, view]);

  const goTo = (p: number) => {
    setPage(Math.max(1, Math.min(pageCount, p)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showFeatured = !query && !provider && !capability && !context && !price;

  return (
    <div className="space-y-6">
      <TensoraAutoModule onTryInPlayground={onTryAuto} />

      {showFeatured ? (
        <LabDarkModule className="p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 text-[15px] font-semibold tracking-tight text-[var(--dark-fg)]">Featured models</h2>
            <span className="text-[12px] text-[var(--dark-muted)]">Strong defaults for agents this month</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((m) => (
              <ModelCard key={m.id} model={m} featured />
            ))}
          </div>
        </LabDarkModule>
      ) : null}

      <section ref={topRef} className="scroll-mt-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="m-0 text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
            All models
            <span className="ml-2 text-[12px] font-normal tabular-nums text-[var(--muted)]">
              {models.length.toLocaleString()}
            </span>
          </h2>
          <span className="hidden text-[12px] text-[var(--muted)] sm:inline">
            One Olora API for every model. Usage and billing in one place.
          </span>
        </div>

        <CatalogToolbar
          query={query}
          setQuery={setQuery}
          provider={provider}
          setProvider={setProvider}
          providers={providers}
          capability={capability}
          setCapability={setCapability}
          capCounts={capCounts}
          total={total}
          context={context}
          setContext={setContext}
          price={price}
          setPrice={setPrice}
          sort={sort}
          setSort={setSort}
          view={view}
          setView={setView}
        />

        {view === "grid" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        ) : (
          <LabCard className="mt-4 overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_6.5rem_minmax(0,1fr)_auto] gap-4 border-b border-[var(--border)] px-3.5 py-2 text-[10px] uppercase tracking-wide text-[var(--muted)] sm:grid">
              <span>Model</span>
              <span>Context</span>
              <span>Pricing</span>
              <span />
            </div>
            {visible.map((m) => (
              <ModelListRow key={m.id} model={m} />
            ))}
          </LabCard>
        )}

        {!models.length ? (
          <div className="mt-6 rounded-[var(--lab-radius-card)] border border-dashed border-[var(--border)] px-6 py-10 text-center">
            <p className="m-0 text-[13px] text-[var(--foreground)]">No models match these filters.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setProvider("");
                setCapability("");
                setContext("");
                setPrice("");
              }}
              className="mt-2 text-[12px] text-[var(--orange)] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <CatalogPager page={current} pageCount={pageCount} total={models.length} pageSize={pageSize} onPage={goTo} />
        )}
      </section>
    </div>
  );
}
