"use client";

import Link from "next/link";
import type { InferenceModel, ModelCapability } from "@/lib/lab/inference-catalog";
import {
  detectCapabilities,
  formatPricePerM,
  modelDetailHref,
  providerLabel,
  providerLogoUrl,
} from "@/lib/lab/inference-catalog";

export function ModelCard({
  model,
  featured = false,
}: {
  model: InferenceModel;
  featured?: boolean;
}) {
  const caps = detectCapabilities(model).slice(0, 2);
  const href = modelDetailHref(model.id);

  return (
    <Link
      href={href}
      className={`group relative flex h-full flex-col overflow-hidden rounded-[var(--lab-radius-card)] border p-4 transition-colors ${
        featured
          ? "border-white/10 bg-[var(--dark-elevated)] text-[var(--dark-fg)] hover:border-[var(--orange)]/45 hover:bg-[var(--dark-panel)]"
          : "border-[var(--border)] bg-[var(--panel)] hover:border-[var(--foreground)]/20 hover:bg-[var(--panel-2)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            featured
              ? "border-white/10 bg-white"
              : "border-[var(--border)] bg-[var(--panel-2)]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={providerLogoUrl(model.provider, model.logoDomain)}
            alt=""
            className="h-7 w-7 object-contain"
          />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <div
            className={`truncate font-semibold leading-snug tracking-tight ${
              featured ? "text-[15px] text-[var(--dark-fg)]" : "text-[14px] text-[var(--foreground)]"
            }`}
          >
            {model.name}
          </div>
          <div
            className={`mt-0.5 truncate text-[12px] ${
              featured ? "text-[var(--dark-muted)]" : "text-[var(--muted)]"
            }`}
          >
            {providerLabel(model.provider)}
          </div>
        </div>
        <span
          className={`absolute right-4 top-4 text-[11px] transition ${
            featured
              ? "text-transparent group-hover:text-[var(--dark-muted)]"
              : "text-transparent group-hover:text-[var(--muted)]"
          }`}
        >
          Open →
        </span>
      </div>

      <p
        className={`mt-3 m-0 line-clamp-2 h-[2.5rem] text-[13px] leading-snug ${
          featured ? "text-[var(--dark-muted)]" : "text-[var(--muted)]"
        }`}
      >
        {model.description || model.fullName}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <div
          className={`min-w-0 truncate font-mono text-[11px] tabular-nums ${
            featured ? "text-[var(--dark-muted-2)]" : "text-[var(--muted-2)]"
          }`}
        >
          {model.context === "-" ? "-" : model.context}
          <span className="mx-1 opacity-40">·</span>
          {formatPricePerM(model.inputPerM)}/{formatPricePerM(model.outputPerM)}
        </div>
        {caps.length ? (
          <div className="flex shrink-0 gap-1">
            {caps.map((c) => (
              <CapabilityChip key={c} label={c} dark={featured} />
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function ModelListRow({ model }: { model: InferenceModel }) {
  const caps = detectCapabilities(model).slice(0, 2);
  const href = modelDetailHref(model.id);

  return (
    <Link
      href={href}
      className="group grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_auto] items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-3 transition-colors hover:bg-[var(--panel-2)] sm:grid-cols-[minmax(0,1.6fr)_6.5rem_minmax(0,1fr)_auto] sm:gap-4"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={providerLogoUrl(model.provider, model.logoDomain)}
            alt=""
            className="h-5 w-5 object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-[var(--foreground)]">
            {model.name}
          </div>
          <div className="truncate text-[11px] text-[var(--muted)]">
            {providerLabel(model.provider)}
            <span className="hidden sm:inline"> · {model.id}</span>
          </div>
        </div>
      </div>
      <div className="hidden font-mono text-[11px] text-[var(--muted-2)] sm:block">
        {model.context}
      </div>
      <div className="truncate font-mono text-[11px] tabular-nums text-[var(--muted)]">
        {formatPricePerM(model.inputPerM)} / {formatPricePerM(model.outputPerM)}
        {caps.length ? (
          <span className="ml-1.5 hidden text-[var(--muted-3)] lg:inline">
            · {caps.join(" · ")}
          </span>
        ) : null}
      </div>
      <span className="text-[11px] text-transparent transition group-hover:text-[var(--muted)]">
        Open →
      </span>
    </Link>
  );
}

function CapabilityChip({ label, dark }: { label: ModelCapability; dark?: boolean }) {
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[9px] tracking-wide ${
        dark
          ? "bg-white/10 text-[var(--dark-muted)]"
          : "bg-[var(--panel-2)] text-[var(--muted)]"
      }`}
    >
      {label}
    </span>
  );
}
