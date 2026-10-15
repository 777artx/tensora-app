"use client";

import {
  buyerHourly,
  formatPrice,
  houseSavePct,
  providerLabel,
  providerLogo,
  regionLabel,
  stockLabel,
  type GpuOffer,
  type PickStrategy,
  type TensoraPickResult,
} from "@/lib/lab/compute";

const STRATEGIES: [PickStrategy, string][] = [
  ["best-value", "Best value"],
  ["lowest-price", "Cheapest"],
  ["most-available", "In stock"],
];

export function PickBar({
  pick,
  strategy,
  onStrategy,
  onRent,
  onExternal,
}: {
  pick: TensoraPickResult;
  strategy: PickStrategy;
  onStrategy: (s: PickStrategy) => void;
  onRent: () => void;
  onExternal: () => void;
}) {
  const o = pick.offer;
  const pay = buyerHourly(o);
  const priced = pay > 0;
  const integrated = o.integration === "integrated";
  const save = houseSavePct(o);

  return (
    <section className="grid grid-cols-1 items-center gap-4 border-b border-white/[0.06] bg-gradient-to-r from-[var(--orange)]/[0.07] via-transparent to-transparent px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--orange)]">
            <span className="h-1.5 w-1.5 rounded-full bg-grad" />
            Olora Pick
          </span>
          <div className="flex rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-inset ring-white/[0.06]">
            {STRATEGIES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onStrategy(id)}
                className={`min-h-9 rounded-md px-2.5 text-[12px] ${
                  strategy === id ? "bg-white/[0.1] text-white" : "text-white/45 hover:text-white/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono text-[26px] font-semibold leading-none tabular-nums text-white">
            {formatPrice(pay)}
            {priced ? <span className="text-[13px] font-normal text-white/45">/hr</span> : null}
          </span>
          {save > 0 ? (
            <>
              <span className="font-mono text-[13px] tabular-nums text-white/35 line-through decoration-white/25">
                {formatPrice(o.pricePerHour)}
              </span>
              <span className="rounded-full bg-[var(--orange)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--orange)]">
                Save {save}%
              </span>
            </>
          ) : null}
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-white/75">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={providerLogo(o.provider)} alt="" className="h-4 w-4 rounded-sm bg-white" />
            {providerLabel(o.provider)} · {regionLabel(o.region)} ·{" "}
            <span className={stockLabel(o) === "Available" ? "text-[var(--live)]" : "text-amber-300"}>
              {stockLabel(o)}
            </span>
          </span>
        </div>
        <p className="m-0 mt-2 max-w-2xl text-[11.5px] leading-snug text-white/45">{pick.reason}</p>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        <span className="font-mono text-[10px] uppercase tracking-wide text-white/35 sm:text-right">
          {integrated ? "Olora checkout" : "External checkout"}
        </span>
        <button
          type="button"
          onClick={integrated ? onRent : onExternal}
          className="min-h-11 rounded-lg bg-grad px-4 text-[13px] font-semibold text-white transition-[filter] hover:brightness-110 sm:min-h-0 sm:py-2.5 sm:text-[12.5px]"
        >
          {integrated ? "Rent on Olora →" : "View provider ↗"}
        </button>
      </div>
    </section>
  );
}

export type ProviderSummary = {
  provider: string;
  count: number;
  min: number | null;
  available: number;
};

export function OffersAside({
  byProvider,
  priceBand,
  offers,
  provider,
  onProvider,
}: {
  byProvider: ProviderSummary[];
  priceBand: { min: number; max: number; median: number } | null;
  offers: GpuOffer[];
  provider: string;
  onProvider: (p: string) => void;
}) {
  const span = priceBand ? Math.max(0.01, priceBand.max - priceBand.min) : 1;
  return (
    <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5">
      <section>
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Price spread</div>
        {priceBand ? (
          <>
            <div className="relative h-8">
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.1]" />
              {offers
                .filter((o) => o.pricePerHour > 0)
                .map((o) => (
                  <span
                    key={o.id}
                    title={`${providerLabel(o.provider)} ${formatPrice(o.pricePerHour)}`}
                    className="absolute top-1/2 h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50"
                    style={{ left: `${((o.pricePerHour - priceBand.min) / span) * 100}%` }}
                  />
                ))}
              <span
                className="absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-grad"
                style={{ left: `${((priceBand.median - priceBand.min) / span) * 100}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-white/45">
              <span>{formatPrice(priceBand.min)}</span>
              <span className="text-[var(--orange)]">median {formatPrice(priceBand.median)}</span>
              <span>{formatPrice(priceBand.max)}</span>
            </div>
          </>
        ) : (
          <p className="m-0 text-[12px] text-white/45">No priced offers.</p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Providers</span>
          {provider ? (
            <button type="button" onClick={() => onProvider("")} className="text-[11px] text-white/45 hover:text-white">
              Clear
            </button>
          ) : null}
        </div>
        <ul className="m-0 list-none space-y-1 p-0">
          {byProvider.map((row) => {
            const active = provider === row.provider;
            return (
              <li key={row.provider}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onProvider(active ? "" : row.provider)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors ${
                    active ? "bg-[var(--orange)]/[0.12] ring-1 ring-inset ring-[var(--orange)]/40" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2 text-white/80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={providerLogo(row.provider)} alt="" className="h-4 w-4 rounded-sm bg-white" />
                    <span className="truncate">{providerLabel(row.provider)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/45">
                    {row.min != null ? formatPrice(row.min) : "—"} · {row.available}/{row.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="m-0 mt-auto text-[11px] leading-relaxed text-white/35">
        <span className="text-white/60">Rent on Olora</span> appears only when we can provision the offer
        directly. Everything else opens the provider&apos;s own checkout.
      </p>
    </aside>
  );
}
