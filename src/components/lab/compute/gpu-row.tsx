"use client";

import {
  formatPrice,
  perGpuHourly,
  regionLabel,
  shortGpuName,
  type GpuModelSummary,
} from "@/lib/lab/compute";
import { availability, ConfigChips, generation, ProviderStack, useCase, VramBar } from "./gpu-row-parts";

/** "A100_80GB" → "A100", "RTX6000Ada_48GB" → "RTX 6000 Ada". */
export function gpuDisplayName(model: Pick<GpuModelSummary, "gpuType" | "label">): string {
  const base = (model.gpuType || "").split("_")[0];
  const pretty = base.replace(/^RTX(\d+)(Ada)?$/i, (_, n, ada) => `RTX ${n}${ada ? " Ada" : ""}`);
  if (!pretty || /^(RTX|GTX|GPU|NVIDIA)$/i.test(pretty)) return shortGpuName(model.label) || pretty || "GPU";
  return pretty;
}

export const GPU_GRID =
  "grid items-center gap-x-3 grid-cols-[minmax(0,1fr)_auto_16px] md:grid-cols-[minmax(0,1.6fr)_80px_auto_16px] lg:grid-cols-[minmax(0,1.6fr)_84px_minmax(0,1.15fr)_104px_124px_16px] lg:gap-x-4 xl:grid-cols-[minmax(180px,1.7fr)_100px_108px_minmax(0,1.2fr)_116px_132px_16px] xl:gap-x-5";

export function GpuRowHead() {
  return (
    <div
      className={`${GPU_GRID} border-b border-white/[0.06] px-4 py-3 text-[10.5px] font-medium uppercase tracking-[0.07em] text-white/35 sm:px-6`}
    >
      <span>GPU</span>
      <span className="hidden md:block">VRAM</span>
      <span className="hidden xl:block">Configs</span>
      <span className="hidden lg:block">Providers</span>
      <span className="hidden lg:block">Availability</span>
      <span className="text-right">Per GPU / hr</span>
      <span />
    </div>
  );
}

export function GpuRow({
  model,
  cheapest,
  recommended,
  onSelect,
}: {
  model: GpuModelSummary;
  cheapest?: boolean;
  recommended?: boolean;
  onSelect: () => void;
}) {
  const isCpu = !model.gpuMemory;
  const name = isCpu ? "CPU node" : gpuDisplayName(model);
  let best: { pay: number; listed: number } | null = null;
  for (const o of model.offers) {
    if (!(o.pricePerHour > 0)) continue;
    const n = Math.max(1, o.gpuCount);
    const pay = perGpuHourly(o);
    if (!best || pay < best.pay) best = { pay, listed: o.pricePerHour / n };
  }
  const disabled = !model.available;
  const stock = availability(model);
  const gen = generation(model.gpuType);
  const specs = [
    useCase(model.gpuMemory),
    model.vcpuHint > 0 ? `${model.vcpuHint} vCPU` : null,
    model.memoryHint ? `${model.memoryHint} GB RAM` : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`${GPU_GRID} group relative w-full border-b border-white/[0.045] px-4 py-3.5 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--orange)]/60 sm:px-6 sm:py-4 ${
        disabled ? "cursor-not-allowed opacity-45" : "hover:bg-white/[0.035]"
      } ${recommended ? "bg-[var(--orange)]/[0.055]" : ""}`}
    >
      {recommended ? <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-grad" /> : null}

      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="truncate text-[15px] font-semibold tracking-tight text-white">{name}</span>
          <span className="text-[11.5px] text-white/40">
            {[model.socket, gen].filter(Boolean).join(" · ")}
          </span>
          {recommended ? (
            <span className="rounded-full bg-[var(--orange)]/15 px-2 py-px text-[10.5px] font-medium text-[var(--orange)]">
              Recommended
            </span>
          ) : cheapest ? (
            <span className="rounded-full bg-white/[0.07] px-2 py-px text-[10.5px] font-medium text-white/70">
              Lowest price
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-[12px] text-white/45">{specs.join(" · ")}</span>
        <span className="mt-1 block truncate text-[12px] text-white/40 lg:hidden">
          {model.gpuMemory ? `${model.gpuMemory} GB · ` : ""}
          {model.providers.length} provider{model.providers.length === 1 ? "" : "s"} · {stock.text}
        </span>
      </span>

      <span className="hidden md:block">
        <VramBar gb={model.gpuMemory} />
      </span>

      <span className="hidden xl:block">
        <ConfigChips configs={model.configs} />
      </span>

      <span className="hidden min-w-0 lg:block">
        <ProviderStack providers={model.providers} regions={model.regions.map(regionLabel)} />
      </span>

      <span className={`hidden items-center gap-2 text-[12.5px] lg:flex ${stock.tone}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stock.dot}`} />
        {stock.text}
      </span>

      <span className="text-right">
        <span className="block font-mono text-[16px] font-semibold tabular-nums text-white">
          {formatPrice(best?.pay ?? model.minPrice)}
        </span>
        {best && best.listed > best.pay + 0.0005 ? (
          <span className="block font-mono text-[11px] tabular-nums text-white/30 line-through decoration-white/20">
            {formatPrice(best.listed)}
          </span>
        ) : null}
      </span>

      <span
        aria-hidden
        className={`text-right text-[14px] transition-transform ${
          disabled ? "text-transparent" : "text-white/30 group-hover:translate-x-0.5 group-hover:text-white"
        }`}
      >
        →
      </span>
    </button>
  );
}
