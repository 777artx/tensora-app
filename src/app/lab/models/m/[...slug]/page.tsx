"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { LabChrome } from "@/components/lab/lab-chrome";
import {
  ModelApiPanel,
  ModelChat,
  ModelDetailsPanel,
} from "@/components/lab/models/model-chat";
import {
  detectCapabilities,
  formatPricePerM,
  getModelById,
  providerLabel,
  providerLogoUrl,
  TENSORA_AUTO,
} from "@/lib/lab/inference-catalog";

type DetailTab = "playground" | "api" | "details";

export default function ModelDetailPage() {
  const params = useParams<{ slug?: string[] }>();
  const id = useMemo(() => {
    const parts = params?.slug;
    if (!parts?.length) return "";
    return parts.map(decodeURIComponent).join("/");
  }, [params]);

  const model = getModelById(id) || (id.includes("auto") ? TENSORA_AUTO : undefined);
  const [tab, setTab] = useState<DetailTab>("playground");

  if (!model) {
    return (
      <LabChrome active="models" title="Model">
        <div className="px-6 py-16 text-center">
          <p className="text-[var(--muted)]">Model not found.</p>
          <Link href="/lab/models" className="mt-4 inline-block text-[var(--orange)]">
            ← Back to Models
          </Link>
        </div>
      </LabChrome>
    );
  }

  const caps = detectCapabilities(model);

  return (
    <LabChrome active="models" title={model.name}>
      <div className="w-full px-4 py-6 md:px-6 md:py-7 lg:px-8">
        <Link
          href="/lab/models"
          className="text-[13px] text-[var(--muted)] hover:text-white"
        >
          ← Models
        </Link>

        <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={providerLogoUrl(model.provider, model.logoDomain)}
            alt=""
            className="h-12 w-12 rounded-lg bg-white/5 object-contain p-1.5"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display m-0 text-2xl tracking-tight text-white md:text-3xl">
              {model.name}
            </h1>
            <p className="mt-1 m-0 text-sm text-[var(--muted)]">
              {providerLabel(model.provider)}
            </p>
            {model.description ? (
              <p className="mt-3 m-0 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                {model.description}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-[var(--muted-3)]">
              <span>{model.context} context</span>
              <span>in {formatPricePerM(model.inputPerM)}</span>
              <span>out {formatPricePerM(model.outputPerM)}</span>
            </div>
            {caps.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {caps.map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-[var(--panel-2)] px-2 py-0.5 text-[11px] text-[var(--muted)]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <Link
            href="/lab/keys"
            className="shrink-0 text-sm text-[var(--orange)] hover:underline"
          >
            Use via API →
          </Link>
        </header>

        <div
          className="mt-6 flex gap-1 border-b border-[var(--border)]"
          role="tablist"
        >
          {(
            [
              ["playground", "Playground"],
              ["api", "API"],
              ["details", "Details"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`relative px-4 py-2.5 text-sm ${
                tab === id ? "text-white" : "text-[var(--muted)] hover:text-white"
              }`}
            >
              {label}
              {tab === id ? (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-grad" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "playground" ? <ModelChat model={model} /> : null}
          {tab === "api" ? <ModelApiPanel model={model} /> : null}
          {tab === "details" ? <ModelDetailsPanel model={model} /> : null}
        </div>
      </div>
    </LabChrome>
  );
}
