"use client";

import Link from "next/link";
import { buyerHourly, formatPrice, type GpuModelSummary } from "@/lib/lab/compute";

export function GpuHeader({
  models,
  live,
  updatedSec,
  runningCount = 0,
}: {
  models: GpuModelSummary[];
  live: boolean;
  updatedSec: number | null;
  runningCount?: number;
}) {
  const gpus = models.filter((m) => m.gpuMemory > 0);
  let offers = 0;
  let available = 0;
  let floor: { pay: number; listed: number } | null = null;
  const providers = new Set<string>();
  const regions = new Set<string>();
  for (const m of gpus) {
    offers += m.offerCount;
    available += m.availableOfferCount;
    m.providers.forEach((p) => providers.add(p));
    m.regions.forEach((r) => regions.add(r));
    for (const o of m.offers) {
      if (!(o.pricePerHour > 0)) continue;
      const n = Math.max(1, o.gpuCount);
      const pay = buyerHourly(o) / n;
      if (!floor || pay < floor.pay) floor = { pay, listed: o.pricePerHour / n };
    }
  }

  const stats = [
    {
      label: "From, per GPU",
      value: floor != null ? `${formatPrice(floor.pay)}/hr` : "—",
      note: floor != null && floor.listed > floor.pay ? `vs ${formatPrice(floor.listed)} listed` : floor ? "Listed rate" : "",
      accent: true,
    },
    { label: "GPU models", value: String(gpus.length), note: `${offers} offers` },
    { label: "In stock", value: String(available), note: offers ? `${Math.round((available / offers) * 100)}% of offers` : "" },
    { label: "Providers", value: String(providers.size), note: `${regions.size} region${regions.size === 1 ? "" : "s"}` },
  ];

  return (
    <div className="flex flex-col gap-5 pt-1 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-x-12">
      <div className="min-w-0">
        <h2 className="lab-display m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--foreground)] sm:text-[32px] xl:text-[38px]">
          Rent GPUs below retail<span className="text-[var(--orange)]">.</span>
        </h2>
        <p className="m-0 mt-2 max-w-lg text-[13.5px] leading-snug text-[var(--muted)] sm:text-[13px]">
          Every GPU across every provider we route to, on one board. Pick a card, compare offers, launch in minutes.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[var(--live)]" : "bg-[var(--muted-3)]"}`} />
            {live ? "Live inventory" : "Catalog"}
            {updatedSec != null ? ` · updated ${updatedSec}s ago` : ""}
          </span>
          <Link href="/lab/compute/instances" className="inline-flex items-center gap-1.5 text-[var(--foreground)] hover:text-[var(--orange)]">
            {runningCount > 0 ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--live)]" />
                {runningCount} running
              </>
            ) : (
              "My instances"
            )}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
      <dl className="m-0 grid w-full grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:w-auto lg:gap-x-8">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 border-l border-[var(--border)] pl-3 sm:pl-4">
            <dt className="text-[11px] text-[var(--muted)]">{s.label}</dt>
            <dd
              className={`m-0 mt-1.5 font-mono text-[18px] font-semibold leading-none tabular-nums sm:text-[22px] ${
                s.accent ? "text-[var(--orange)]" : "text-[var(--foreground)]"
              }`}
            >
              {s.value}
            </dd>
            <div className="mt-1 truncate text-[11px] text-[var(--muted-3)]">{s.note}</div>
          </div>
        ))}
      </dl>
    </div>
  );
}
