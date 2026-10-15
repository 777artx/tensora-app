"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buyerHourly,
  formatPrice,
  pickOffer,
  providerLabel,
  providerUrl,
  regionLabel,
  shortGpuName,
  sortOffers,
  stockLabel,
  type GpuModelSummary,
  type GpuOffer,
  type PickStrategy,
} from "@/lib/lab/compute";
import { gpuDisplayName } from "./gpu-row";
import { OfferRow, OfferRowHead } from "./offer-row";
import { OffersAside, PickBar } from "./offers-board";

const darkSelect =
  "h-11 w-full min-w-0 rounded-lg border-0 bg-white/[0.04] px-2.5 text-[16px] text-white/75 outline-none ring-1 ring-inset ring-white/[0.07] focus:ring-[var(--orange)]/50 sm:h-8 sm:w-auto sm:text-[12px] [&>option]:bg-[#141416]";

type Props = {
  model: GpuModelSummary;
  offers: GpuOffer[];
  configured: boolean;
  demoMode: boolean;
  marketplace?: string;
  highlightOfferId?: string | null;
  onBack: () => void;
  onRent: (offer: GpuOffer, mode: "prime" | "sandbox") => void;
  compareIds: string[];
  onCompareToggle: (id: string) => void;
  onOpenCompare: () => void;
  pickStrategy: PickStrategy;
};

export function GpuOffers({
  model,
  offers,
  configured,
  demoMode,
  marketplace,
  highlightOfferId,
  onBack,
  onRent,
  compareIds,
  onCompareToggle,
  onOpenCompare,
  pickStrategy,
}: Props) {
  const [sort, setSort] = useState<"cheapest" | "best-value" | "most-available">("best-value");
  const [region, setRegion] = useState("");
  const [provider, setProvider] = useState("");
  const [availability, setAvailability] = useState("any");
  const [offerType, setOfferType] = useState("any");
  const [maxPrice, setMaxPrice] = useState("");
  const [externalWarn, setExternalWarn] = useState<GpuOffer | null>(null);
  const [strategy, setStrategy] = useState<PickStrategy>(pickStrategy);
  const [focusedId, setFocusedId] = useState<string | null>(highlightOfferId || null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("gd-tensora-pick");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { strategy?: PickStrategy; offerId?: string };
      if (parsed.strategy) setStrategy(parsed.strategy);
      if (parsed.offerId) setFocusedId(parsed.offerId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (highlightOfferId) setFocusedId(highlightOfferId);
  }, [highlightOfferId]);

  useEffect(() => {
    if (!focusedId) return;
    const el = document.getElementById(`offer-${focusedId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedId, offers]);

  const providers = useMemo(
    () => [...new Set(offers.map((o) => o.provider))].sort(),
    [offers]
  );
  const regions = useMemo(
    () => [...new Set(offers.map((o) => o.region))].sort(),
    [offers]
  );

  const filtered = useMemo(() => {
    const priceCap = maxPrice ? Number(maxPrice) : null;
    const list = offers.filter((o) => {
      if (region && o.region !== region) return false;
      if (provider && o.provider !== provider) return false;
      if (offerType !== "any" && (o.offerType || "on-demand") !== offerType) return false;
      const stock = stockLabel(o);
      if (availability === "available" && stock !== "Available") return false;
      if (availability === "limited" && stock !== "Limited") return false;
      if (priceCap != null && Number.isFinite(priceCap) && o.pricePerHour > priceCap) {
        return false;
      }
      return true;
    });
    return sortOffers(list, sort);
  }, [offers, region, provider, availability, offerType, maxPrice, sort]);

  const pick = useMemo(() => {
    const pool = filtered.length ? filtered : offers;
    if (focusedId) {
      const forced = pool.find((o) => o.id === focusedId) || offers.find((o) => o.id === focusedId);
      if (forced) {
        const result = pickOffer(pool, strategy, region || undefined);
        if (result && result.offer.id === forced.id) return result;
        return {
          offer: forced,
          strategy,
          reason: `Olora Pick selected this offer (${formatPrice(forced.pricePerHour)}/hr · ${providerLabel(forced.provider)}).`,
        };
      }
    }
    return pickOffer(pool, strategy, region || undefined);
  }, [filtered, offers, strategy, region, focusedId]);

  const providerCount = providers.length;
  const name = model.gpuMemory ? gpuDisplayName(model) : shortGpuName(model.label);

  const priceBand = useMemo(() => {
    const priced = offers.filter((o) => buyerHourly(o) > 0).map((o) => buyerHourly(o));
    if (!priced.length) return null;
    return {
      min: Math.min(...priced),
      max: Math.max(...priced),
      median: priced.sort((a, b) => a - b)[Math.floor(priced.length / 2)],
    };
  }, [offers]);

  const byProvider = useMemo(() => {
    const map = new Map<string, GpuOffer[]>();
    for (const o of offers) {
      const list = map.get(o.provider) || [];
      list.push(o);
      map.set(o.provider, list);
    }
    return [...map.entries()]
      .map(([p, list]) => {
        const priced = list.filter((o) => o.pricePerHour > 0);
        return {
          provider: p,
          count: list.length,
          min: priced.length ? Math.min(...priced.map((o) => o.pricePerHour)) : null,
          available: list.filter((o) => stockLabel(o) === "Available").length,
        };
      })
      .sort((a, b) => (a.min ?? 999) - (b.min ?? 999));
  }, [offers]);

  function openExternal(offer: GpuOffer) {
    setExternalWarn(offer);
  }

  function confirmExternal() {
    if (!externalWarn) return;
    window.open(providerUrl(externalWarn.provider, marketplace), "_blank", "noopener,noreferrer");
    setExternalWarn(null);
  }

  function primaryAction(offer: GpuOffer) {
    if (offer.integration === "integrated") {
      onRent(offer, "prime");
      return;
    }
    openExternal(offer);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="-mb-2 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← All GPUs
      </button>

      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="min-w-0">
          <h2 className="lab-display m-0 flex flex-wrap items-baseline gap-x-2.5 text-[26px] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--foreground)] sm:text-[28px] xl:text-[30px]">
            {name}
            <span className="font-mono text-[14px] font-normal tracking-normal text-[var(--muted)]">
              {model.gpuMemory}GB · {model.socket}
            </span>
          </h2>
          <p className="m-0 mt-1.5 text-[12px] text-[var(--muted)]">
            {offers.length} offer{offers.length === 1 ? "" : "s"} across {providerCount} provider
            {providerCount === 1 ? "" : "s"} · {model.regions.map(regionLabel).join(", ")}
          </p>
        </div>
        <dl className="m-0 grid w-full grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-x-8 lg:w-auto">
          {[
            { label: "Low", value: priceBand ? `${formatPrice(priceBand.min)}/hr` : "—", accent: true },
            { label: "Median", value: priceBand ? `${formatPrice(priceBand.median)}/hr` : "—" },
            { label: "High", value: priceBand ? `${formatPrice(priceBand.max)}/hr` : "—" },
            { label: "Host", value: model.vcpuHint ? `${model.vcpuHint} vCPU` : "—" },
          ].map((s) => (
            <div key={s.label}>
              <dt className="text-[11px] text-[var(--muted)]">{s.label}</dt>
              <dd
                className={`m-0 mt-1 font-mono text-[18px] font-semibold leading-none tabular-nums ${
                  s.accent ? "text-[var(--orange)]" : "text-[var(--foreground)]"
                }`}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="lab-dark overflow-hidden rounded-[var(--lab-radius-card)] border border-[var(--dark-border)] bg-[var(--dark)] text-[var(--dark-fg)] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_24px_48px_-24px_rgba(0,0,0,0.35)]">
        {pick ? (
          <PickBar
            pick={pick}
            strategy={strategy}
            onStrategy={(id) => {
              setStrategy(id);
              setFocusedId(null);
              sessionStorage.removeItem("gd-tensora-pick");
            }}
            onRent={() => onRent(pick.offer, "prime")}
            onExternal={() => openExternal(pick.offer)}
          />
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="grid grid-cols-2 gap-2 border-b border-white/[0.06] px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:px-5">
              <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region" className={darkSelect}>
                <option value="">All regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {regionLabel(r)}
                  </option>
                ))}
              </select>
              <select value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label="Availability" className={darkSelect}>
                <option value="any">Any stock</option>
                <option value="available">Available</option>
                <option value="limited">Limited</option>
              </select>
              <select value={offerType} onChange={(e) => setOfferType(e.target.value)} aria-label="Billing type" className={darkSelect}>
                <option value="any">Any billing</option>
                <option value="on-demand">On-demand</option>
                <option value="marketplace">Marketplace</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max $/hr"
                inputMode="decimal"
                aria-label="Max price per hour"
                className="h-11 w-full min-w-0 rounded-lg border-0 bg-white/[0.04] px-2.5 text-[16px] text-white outline-none ring-1 ring-inset ring-white/[0.07] placeholder:text-white/30 focus:ring-[var(--orange)]/50 sm:h-8 sm:w-24 sm:text-[12px]"
              />
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" className={darkSelect}>
                <option value="best-value">Best value</option>
                <option value="cheapest">Cheapest</option>
                <option value="most-available">Most stock</option>
              </select>
              <div className="col-span-2 flex items-center sm:ml-auto sm:w-auto">
                {compareIds.length >= 2 ? (
                  <button
                    type="button"
                    onClick={onOpenCompare}
                    className="min-h-11 w-full rounded-lg bg-white px-3 text-[13px] font-semibold text-black hover:bg-white/90 sm:min-h-0 sm:w-auto sm:py-1.5 sm:text-[12px]"
                  >
                    Compare {compareIds.length} →
                  </button>
                ) : (
                  <span className="text-[12px] text-white/40">Tick 2–4 offers to compare</span>
                )}
              </div>
            </div>

            <div>
              <div>
                <OfferRowHead />
                <div className="xl:max-h-[560px] xl:overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-6 py-14 text-center text-[13px] text-white/50">No offers match these filters.</div>
                  ) : (
                    filtered.map((o) => {
                      const isPick = pick?.offer.id === o.id;
                      return (
                        <OfferRow
                          key={o.id}
                          offer={o}
                          isPick={isPick}
                          focused={focusedId === o.id || isPick}
                          compared={compareIds.includes(o.id)}
                          compareDisabled={!compareIds.includes(o.id) && compareIds.length >= 4}
                          onCompareToggle={() => onCompareToggle(o.id)}
                          onRent={(mode) => onRent(o, mode)}
                          onExternal={() => primaryAction(o)}
                          demoMode={demoMode}
                          configured={configured}
                          marketplace={marketplace}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] lg:border-l lg:border-t-0">
            <OffersAside
              byProvider={byProvider}
              priceBand={priceBand}
              offers={offers}
              provider={provider}
              onProvider={setProvider}
            />
          </div>
        </div>
      </div>

      {externalWarn ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ext-checkout-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141416] p-6 text-white shadow-2xl"
          >
            <h3 id="ext-checkout-title" className="m-0 text-[16px] font-semibold">
              Continue on {providerLabel(externalWarn.provider)}?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/55">
              This provider is not yet directly integrated with Olora. You will complete
              checkout with {providerLabel(externalWarn.provider)}.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExternalWarn(null)}
                className="rounded-lg px-3 py-2 text-[12px] text-white/60 hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExternal}
                className="rounded-lg bg-grad px-4 py-2 text-[12px] font-semibold text-white hover:brightness-110"
              >
                Continue to provider →
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
