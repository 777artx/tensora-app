"use client";

import { providerLabel, providerLogo, type GpuModelSummary } from "@/lib/lab/compute";

export function useCase(vram: number): string {
  if (!vram) return "CPU only";
  if (vram >= 140) return "Frontier training";
  if (vram >= 80) return "Large-model training";
  if (vram >= 40) return "Fine-tuning";
  return "Inference & diffusion";
}

export function generation(gpuType: string): string {
  const t = gpuType.toUpperCase();
  if (t.startsWith("B3") || t.startsWith("B2")) return "Blackwell";
  if (t.startsWith("H1") || t.startsWith("H2")) return "Hopper";
  if (t.startsWith("A1") || t.startsWith("A6") || t.startsWith("A4") || t.startsWith("A5")) return "Ampere";
  if (t.startsWith("L4") || t.includes("ADA") || t.startsWith("RTX4")) return "Ada";
  if (t.startsWith("RTX3")) return "Ampere";
  return "";
}

export function availability(model: GpuModelSummary) {
  if (!model.available) return { text: "Sold out", dot: "bg-white/25", tone: "text-white/40" };
  const n = model.availableOfferCount;
  if (n <= 1) return { text: "1 offer left", dot: "bg-grad", tone: "text-[var(--orange)]" };
  if (n <= 3) return { text: `${n} offers`, dot: "bg-amber-300", tone: "text-white/75" };
  return { text: `${n} offers`, dot: "bg-[var(--live)]", tone: "text-white/80" };
}

export function VramBar({ gb }: { gb: number }) {
  const pct = Math.min(100, Math.round((gb / 262) * 100));
  return (
    <span className="block">
      <span className="block font-mono text-[13.5px] tabular-nums text-white/90">{gb ? `${gb} GB` : "—"}</span>
      {gb ? (
        <span className="mt-1.5 block h-[3px] w-full max-w-[88px] overflow-hidden rounded-full bg-white/[0.06]">
          <span className="block h-full rounded-full bg-white/40" style={{ width: `${Math.max(6, pct)}%` }} />
        </span>
      ) : null}
    </span>
  );
}

export function ConfigChips({ configs }: { configs: number[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {configs.map((n) => (
        <span
          key={n}
          className="rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-white/70 ring-1 ring-inset ring-white/[0.06]"
        >
          {n}×
        </span>
      ))}
    </span>
  );
}

export function ProviderStack({ providers, regions }: { providers: string[]; regions: string[] }) {
  const shown = providers.slice(0, 4);
  const extra = providers.length - shown.length;
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex shrink-0 -space-x-1.5">
        {shown.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p}
            src={providerLogo(p)}
            alt=""
            title={providerLabel(p)}
            className="h-5 w-5 rounded-full bg-white object-contain p-[2px] ring-2 ring-[var(--dark)]"
          />
        ))}
        {extra > 0 ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px] font-medium text-white/70 ring-2 ring-[var(--dark)]">
            +{extra}
          </span>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] text-white/80">
          {providers.length === 1 ? providerLabel(providers[0]) : `${providers.length} providers`}
        </span>
        <span className="block truncate text-[11px] text-white/35">
          {regions.length > 2 ? `${regions.length} regions` : regions.join(", ")}
        </span>
      </span>
    </span>
  );
}
