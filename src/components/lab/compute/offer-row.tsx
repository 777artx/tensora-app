"use client";

import {
  buyerHourly,
  canTrySandbox,
  formatPrice,
  providerLabel,
  providerLogo,
  providerUrl,
  regionLabel,
  stockLabel,
  type GpuOffer,
} from "@/lib/lab/compute";
import { saveGpuQuote } from "@/lib/lab/compute-instances";

export const OFFER_GRID =
  "xl:grid xl:grid-cols-[28px_minmax(0,1.5fr)_minmax(0,1fr)_96px_110px_84px_minmax(150px,auto)] xl:items-center xl:gap-x-4";

export function OfferRowHead() {
  return (
    <div
      className={`${OFFER_GRID} hidden border-b border-white/[0.06] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/35 sm:px-5 xl:grid`}
    >
      <span />
      <span>Provider</span>
      <span className="hidden xl:block">Region</span>
      <span className="hidden xl:block">Stock</span>
      <span className="text-right">Price / hr</span>
      <span className="hidden text-right xl:block">Per day</span>
      <span />
    </div>
  );
}

export function OfferRow({
  offer: o,
  isPick,
  focused,
  compared,
  compareDisabled,
  onCompareToggle,
  onRent,
  onExternal,
  demoMode,
  configured,
  marketplace,
}: {
  offer: GpuOffer;
  isPick: boolean;
  focused: boolean;
  compared: boolean;
  compareDisabled: boolean;
  onCompareToggle: () => void;
  onRent: (mode: "prime" | "sandbox") => void;
  onExternal: () => void;
  demoMode: boolean;
  configured: boolean;
  marketplace?: string;
}) {
  const stock = stockLabel(o);
  const pay = buyerHourly(o);
  const priced = pay > 0;
  const integrated = o.integration === "integrated";
  const stockTone =
    stock === "Available" ? "text-[var(--live)]" : stock === "Limited" ? "text-amber-300" : "text-white/40";

  return (
    <div
      id={`offer-${o.id}`}
      className={`${OFFER_GRID} flex flex-col gap-3 border-b border-white/[0.04] px-4 py-3.5 transition-colors last:border-b-0 sm:px-5 sm:py-3 ${
        focused ? "bg-[var(--orange)]/[0.07]" : "hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-3 xl:contents">
      <input
        type="checkbox"
        aria-label={`Compare ${providerLabel(o.provider)}`}
        checked={compared}
        onChange={onCompareToggle}
        disabled={compareDisabled}
        className="mt-1 h-5 w-5 accent-[var(--orange)] sm:mt-0"
      />

      <span className="flex min-w-0 flex-1 items-center gap-2.5 xl:flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={providerLogo(o.provider)} alt="" className="h-6 w-6 shrink-0 rounded-md bg-white p-0.5" />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-white">{providerLabel(o.provider)}</span>
            {isPick ? (
              <span className="rounded bg-[var(--orange)]/15 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-wide text-[var(--orange)]">
                Pick
              </span>
            ) : null}
          </span>
          <span className="block text-[12px] leading-snug text-white/45 xl:truncate xl:text-[11px]">
            {o.gpuCount}× GPU{o.vcpu ? ` · ${o.vcpu} vCPU` : ""}
            {o.memoryGb ? ` · ${o.memoryGb} GB` : ""}
            <span className="xl:hidden">
              {` · ${regionLabel(o.region)} · `}
              <span className={stockTone}>{stock}</span>
            </span>
          </span>
        </span>
      </span>

      <span className="hidden min-w-0 text-[12px] text-white/70 xl:block">
        {regionLabel(o.region)}
        {o.dataCenter ? <span className="block truncate text-[11px] text-white/35">{o.dataCenter}</span> : null}
      </span>

      <span className={`hidden items-center gap-1.5 text-[12px] xl:inline-flex ${stockTone}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {stock}
      </span>

      <span className="shrink-0 text-right">
        <span className="block font-mono text-[16px] font-semibold tabular-nums text-white sm:text-[15px]">
          {formatPrice(pay)}
        </span>
        {priced && o.pricePerHour > pay ? (
          <span className="block font-mono text-[10.5px] tabular-nums text-white/30 line-through decoration-white/20">
            {formatPrice(o.pricePerHour)}
          </span>
        ) : null}
      </span>

      <span className="hidden text-right font-mono text-[12px] tabular-nums text-white/50 xl:block">
        {priced ? formatPrice(pay * 24) : "—"}
      </span>
      </div>

      <span className="flex flex-wrap items-center justify-end gap-2 pl-8 xl:flex-nowrap xl:pl-0">
        <button
          type="button"
          onClick={() => saveGpuQuote(o)}
          className="rounded-lg px-2 py-1.5 text-[11px] text-white/45 hover:bg-white/[0.06] hover:text-white"
        >
          Save
        </button>
        {stock === "Unavailable" ? (
          <span className="px-2 py-1.5 text-[11px] text-white/35">Sold out</span>
        ) : !priced ? (
          <a
            href={providerUrl(o.provider, marketplace)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center rounded-lg px-3 text-[12.5px] text-white/75 ring-1 ring-inset ring-white/[0.1] hover:text-white"
          >
            Request quote
          </a>
        ) : integrated ? (
          <button
            type="button"
            onClick={() => onRent("prime")}
            className="inline-flex min-h-10 items-center rounded-lg bg-white px-3 text-[12.5px] font-semibold text-black hover:bg-white/90"
          >
            Rent on Olora
          </button>
        ) : (
          <>
            {canTrySandbox(o, { demoMode, configured }) ? (
              <button
                type="button"
                onClick={() => onRent("sandbox")}
                className="px-1.5 text-[11px] text-white/40 hover:text-white"
              >
                Sandbox
              </button>
            ) : null}
            <button
              type="button"
              onClick={onExternal}
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-[12.5px] text-white/80 ring-1 ring-inset ring-white/[0.1] hover:text-white hover:ring-[var(--orange)]/50"
            >
              View provider ↗
            </button>
          </>
        )}
      </span>
    </div>
  );
}
