"use client";

import Link from "next/link";
import { useState } from "react";
import type { CostTier } from "@/lib/lab/inference-catalog";
import { TENSORA_AUTO } from "@/lib/lab/inference-catalog";
import { sendChat } from "@/lib/lab/inference-chat";
import { TensoraMark } from "@/components/lab/tensora-brand";
import { LabHeroCard } from "@/components/lab/ui";
import { useLabAuth } from "@/lib/lab/auth";

const MODES: { id: CostTier; label: string }[] = [
  { id: "high", label: "Best" },
  { id: "medium", label: "Fastest" },
  { id: "low", label: "Cheapest" },
];

export function TensoraAutoModule(_props?: {
  onTryInPlayground?: (tier: CostTier) => void;
}) {
  const { getAccessToken } = useLabAuth();
  const [tier, setTier] = useState<CostTier>("medium");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    content: string;
    model: string;
    latencyMs: number;
    error?: string;
  } | null>(null);

  async function run() {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    setResult(null);
    const res = await sendChat({
      model: TENSORA_AUTO.id,
      cost_tier: tier,
      messages: [{ role: "user", content: text }],
      getAccessToken,
    });
    setResult({
      content: res.content,
      model: res.model,
      latencyMs: res.latencyMs,
      error: res.error,
    });
    setBusy(false);
  }

  return (
    <LabHeroCard className="relative overflow-hidden border border-[var(--dark-border)] p-6 md:p-7">
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--orange)]">
            <TensoraMark tone="light" size={12} className="opacity-80" />
            Flagship · Olora Auto
          </div>
          <h2 className="mt-2 m-0 text-[1.5rem] font-semibold leading-tight tracking-tight text-[var(--dark-fg)] md:text-[1.75rem]">
            Let Olora choose.
          </h2>
          <p className="mt-1.5 m-0 max-w-md text-[13px] leading-relaxed text-[var(--dark-muted)]">
            One endpoint that selects a model based on quality, speed, or cost.
          </p>
        </div>

        <div
          className="inline-flex rounded-full border border-white/15 bg-white/5 p-1"
          role="group"
          aria-label="Routing mode"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setTier(m.id)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${
                tier === m.id
                  ? "bg-white font-medium text-[var(--dark)]"
                  : "text-[var(--dark-muted)] hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-5 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Ask Auto</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void run();
              }
            }}
            rows={2}
            placeholder="Ask anything. Auto picks the model…"
            className="min-h-[72px] w-full resize-none rounded-[var(--lab-radius)] border border-white/10 bg-white/5 px-3.5 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-[var(--dark-muted)] focus:border-[var(--orange)]/40"
          />
        </label>
        <div className="flex shrink-0 flex-col justify-end gap-1.5">
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy || !prompt.trim()}
            className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-white px-5 text-[13px] font-semibold text-[var(--dark)] disabled:opacity-35"
          >
            {busy ? "Routing…" : "Try Auto →"}
          </button>
          <Link
            href="/lab/keys"
            className="text-center text-[11px] text-[var(--dark-muted)] hover:text-white"
          >
            Use via API →
          </Link>
        </div>
      </div>

      {result ? (
        <div className="relative mt-4 rounded-[var(--lab-radius)] border border-white/10 bg-black/40 px-4 py-3">
          {result.error ? (
            <p className="m-0 text-[13px] text-red-300">{result.error}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 font-mono text-[10px] text-[var(--dark-muted)]">
                <span className="text-[var(--orange)]">{result.model}</span>
                <span>{result.latencyMs}ms</span>
              </div>
              <p className="mt-1.5 m-0 whitespace-pre-wrap text-[13px] leading-relaxed text-[#e4e4e7]">
                {result.content}
              </p>
            </>
          )}
        </div>
      ) : null}
    </LabHeroCard>
  );
}
