"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  estimateCost,
  getFeaturedModels,
  getModelById,
  providerLogoUrl,
  TENSORA_AUTO,
} from "@/lib/lab/inference-catalog";
import { sendChat } from "@/lib/lab/inference-chat";
import { LabButton, LabCard, LabDarkModule, LabHeroCard } from "@/components/lab/ui";
import { ModelPicker } from "./model-picker";
import { pushActivity } from "@/lib/lab/projects";
import { useLabAuth } from "@/lib/lab/auth";

type PanelState = "idle" | "waiting" | "generating" | "complete" | "error";

type PanelResult = {
  status: PanelState;
  content: string;
  latencyMs?: number;
  tokens?: number;
  cost?: number | null;
  error?: string;
  modelUsed?: string;
};

type HistoryRow = {
  id: string;
  prompt: string;
  models: string[];
  at: number;
};

const HISTORY_KEY = "gd-model-comparisons";

function loadHistory(): HistoryRow[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(raw) ? raw.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveHistory(rows: HistoryRow[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(0, 8)));
}

export function ComparePlayground({
  initialModels,
  initialTier,
}: {
  initialModels?: string[];
  initialTier?: "low" | "medium" | "high";
}) {
  const { getAccessToken } = useLabAuth();
  const defaults = useMemo(() => {
    if (initialModels?.length) return initialModels.slice(0, 4);
    const featured = getFeaturedModels()
      .slice(0, 2)
      .map((m) => m.id);
    return featured.length >= 2
      ? featured
      : ["anthropic/claude-sonnet-4", "openai/gpt-4o"];
  }, [initialModels]);

  const [selected, setSelected] = useState<string[]>(defaults);
  const [prompt, setPrompt] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [results, setResults] = useState<Record<string, PanelResult>>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [running, setRunning] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (initialModels?.length) setSelected(initialModels.slice(0, 4));
  }, [initialModels]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!settingsRef.current?.contains(e.target as Node)) setSettingsOpen(false);
    }
    if (settingsOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [settingsOpen]);

  async function runComparison() {
    const text = prompt.trim();
    if (!text || selected.length < 2 || running) return;
    setRunning(true);

    const next: Record<string, PanelResult> = {};
    for (const id of selected) {
      next[id] = { status: "waiting", content: "" };
    }
    setResults(next);

    const row: HistoryRow = {
      id: `cmp_${Date.now().toString(36)}`,
      prompt: text.slice(0, 160),
      models: [...selected],
      at: Date.now(),
    };
    const hist = [row, ...loadHistory()].slice(0, 8);
    saveHistory(hist);
    setHistory(hist);

    await Promise.all(
      selected.map(async (id) => {
        setResults((prev) => ({
          ...prev,
          [id]: { status: "generating", content: "" },
        }));
        const model = getModelById(id);
        const res = await sendChat({
          model: id,
          messages: [{ role: "user", content: text }],
          cost_tier: id.includes("auto") ? initialTier || "medium" : undefined,
          getAccessToken,
        });
        if (res.error) {
          setResults((prev) => ({
            ...prev,
            [id]: { status: "error", content: "", error: res.error },
          }));
          return;
        }
        const pt = res.usage?.prompt_tokens;
        const ct = res.usage?.completion_tokens;
        const tokens =
          res.usage?.total_tokens ??
          (typeof pt === "number" && typeof ct === "number" ? pt + ct : undefined);
        const cost =
          typeof (res.usage as { cost?: number } | undefined)?.cost === "number"
            ? (res.usage as { cost: number }).cost
            : estimateCost(
                model?.inputPerM ?? null,
                model?.outputPerM ?? null,
                pt,
                ct
              );

        setResults((prev) => ({
          ...prev,
          [id]: {
            status: "complete",
            content: res.content,
            latencyMs: res.latencyMs,
            tokens,
            cost,
            modelUsed: res.model,
          },
        }));

        pushActivity({
          kind: "inference",
          title: `${model?.name || id} comparison`,
          amount: cost != null ? `$${cost.toFixed(4)}` : undefined,
        });
      })
    );

    setRunning(false);
  }

  async function rerun(id: string) {
    const text = prompt.trim();
    if (!text) return;
    setResults((prev) => ({
      ...prev,
      [id]: { status: "generating", content: "" },
    }));
    const model = getModelById(id);
    const res = await sendChat({
      model: id,
      messages: [{ role: "user", content: text }],
      getAccessToken,
    });
    if (res.error) {
      setResults((prev) => ({
        ...prev,
        [id]: { status: "error", content: "", error: res.error },
      }));
      return;
    }
    const pt = res.usage?.prompt_tokens;
    const ct = res.usage?.completion_tokens;
    const tokens =
      res.usage?.total_tokens ??
      (typeof pt === "number" && typeof ct === "number" ? pt + ct : undefined);
    setResults((prev) => ({
      ...prev,
      [id]: {
        status: "complete",
        content: res.content,
        latencyMs: res.latencyMs,
        tokens,
        cost: estimateCost(
          model?.inputPerM ?? null,
          model?.outputPerM ?? null,
          pt,
          ct
        ),
        modelUsed: res.model,
      },
    }));
  }

  const hasResults = Object.keys(results).length > 0;
  const cols =
    selected.length <= 2
      ? "md:grid-cols-2"
      : selected.length === 3
        ? "lg:grid-cols-3"
        : "md:grid-cols-2 xl:grid-cols-4";

  const canRun = !running && prompt.trim().length > 0 && selected.length >= 2;

  return (
    <div className="space-y-5">
      <LabHeroCard className="relative overflow-hidden p-6 md:p-7">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(215,0,58,0.35) 0%, transparent 70%)",
          }}
          aria-hidden
        />
        <p className="relative m-0 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--orange)]">
          Playground
        </p>
        <h2 className="relative m-0 mt-2 text-[1.45rem] font-semibold tracking-tight text-[var(--dark-fg)] md:text-[1.65rem]">
          Compare models side by side
        </h2>
        <p className="relative m-0 mt-2 max-w-lg text-[14px] leading-relaxed text-[var(--dark-muted)]">
          One prompt. Up to four models. See latency, tokens, and cost on every run.
        </p>
      </LabHeroCard>

      <LabCard className="p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Models
            </div>
            <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">
              Pick at least two to compare
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ModelPicker selected={selected} onChange={setSelected} max={4} min={2} />
        </div>

        <div className="mt-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Shared prompt
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void runComparison();
              }
            }}
            rows={5}
            placeholder="Ask all selected models…"
            className="mt-2 w-full resize-none rounded-[var(--lab-radius)] border border-[var(--border)] bg-white px-4 py-3.5 text-[14px] leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted-3)] focus:border-[var(--orange)]/45 focus:shadow-[0_0_0_3px_var(--orange-soft)]"
          />
          <p className="m-0 mt-1.5 text-[11px] text-[var(--muted-3)]">
            ⌘/Ctrl + Enter to run
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <LabButton
            variant="primary"
            onClick={() => void runComparison()}
            disabled={!canRun}
            className="!px-5 !py-2.5 !text-[13px] !font-semibold"
          >
            {running ? "Running…" : "Run comparison →"}
          </LabButton>

          <div ref={settingsRef} className="relative">
            <LabButton
              variant="ghost"
              onClick={() => setSettingsOpen((v) => !v)}
              className="!text-[13px]"
            >
              Settings
            </LabButton>
            {settingsOpen ? (
              <div className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-[var(--lab-radius)] border border-[var(--border)] bg-white p-3 shadow-lg">
                <div className="text-[11px] font-semibold text-[var(--foreground)]">
                  Generation
                </div>
                <p className="mt-1.5 m-0 text-[12px] leading-snug text-[var(--muted)]">
                  Temperature and max tokens are managed by the sandbox router for now.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </LabCard>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="m-0 text-[15px] font-semibold text-[var(--foreground)]">Results</h3>
          {hasResults ? (
            <span className="text-[12px] text-[var(--muted)]">
              {selected.length} model{selected.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className={`grid items-stretch gap-3 ${cols}`}>
          {selected.map((id) => {
            const model = getModelById(id) || TENSORA_AUTO;
            const r = hasResults
              ? results[id] || { status: "idle" as const, content: "" }
              : null;

            return (
              <LabDarkModule key={id} className="flex min-h-[280px] flex-col">
                <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={providerLogoUrl(model.provider, model.logoDomain)}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-[var(--dark-fg)]">
                      {model.name}
                    </div>
                  </div>
                  {r ? <StatusPill status={r.status} /> : null}
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-b border-white/10 px-4 py-2 font-mono text-[11px] tabular-nums text-[var(--dark-muted)]">
                  <span>{r?.latencyMs != null ? `${r.latencyMs}ms` : "- ms"}</span>
                  <span>{r?.tokens != null ? `${r.tokens} tok` : "- tok"}</span>
                  <span>{r?.cost != null ? `$${r.cost.toFixed(4)}` : "-"}</span>
                </div>

                <div className="flex flex-1 flex-col px-4 py-3">
                  {!r || r.status === "idle" || r.status === "waiting" ? (
                    <SkeletonBody
                      label={r?.status === "waiting" ? "Waiting…" : undefined}
                    />
                  ) : r.status === "generating" ? (
                    <SkeletonBody label="Generating…" pulse />
                  ) : r.status === "error" ? (
                    <p className="m-0 text-[13px] text-red-300">{r.error}</p>
                  ) : (
                    <div className="flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--dark-muted)]">
                      {r.content}
                    </div>
                  )}

                  {r?.status === "complete" ? (
                    <div className="mt-3 flex gap-3 border-t border-white/10 pt-2.5">
                      <button
                        type="button"
                        className="text-[12px] text-[var(--dark-muted)] hover:text-white"
                        onClick={() =>
                          r.content && void navigator.clipboard.writeText(r.content)
                        }
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        className="text-[12px] text-[var(--dark-muted)] hover:text-white"
                        onClick={() => void rerun(id)}
                      >
                        Rerun
                      </button>
                      <button
                        type="button"
                        className="text-[12px] text-[var(--dark-muted)] hover:text-white"
                        onClick={() => {
                          if (selected.length <= 2) return;
                          setSelected(selected.filter((x) => x !== id));
                          setResults((prev) => {
                            const n = { ...prev };
                            delete n[id];
                            return n;
                          });
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              </LabDarkModule>
            );
          })}
        </div>
      </div>

      {history.length ? (
        <LabCard className="overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h3 className="m-0 text-[13px] font-semibold text-[var(--foreground)]">Recent</h3>
          </div>
          <ul className="m-0 list-none divide-y divide-[var(--border-subtle)] p-0">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-start justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[var(--foreground)]">
                    {h.prompt}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                    {h.models.map((mid) => getModelById(mid)?.name || mid).join(" · ")}
                  </div>
                </div>
                <div className="shrink-0 text-[11px] text-[var(--muted-3)]">{relative(h.at)}</div>
              </li>
            ))}
          </ul>
        </LabCard>
      ) : null}
    </div>
  );
}

function SkeletonBody({ label, pulse }: { label?: string; pulse?: boolean }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-6">
      <div className={`space-y-2.5 ${pulse ? "animate-pulse" : ""}`}>
        <div className="h-1.5 w-[88%] rounded-full bg-white/10" />
        <div className="h-1.5 w-[72%] rounded-full bg-white/10" />
        <div className="h-1.5 w-[80%] rounded-full bg-white/[0.07]" />
        <div className="h-1.5 w-[55%] rounded-full bg-white/[0.07]" />
      </div>
      <p className="mt-5 m-0 text-center text-[12px] text-[var(--dark-muted-2)]">
        {label || "Response appears here"}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: PanelState }) {
  if (status === "idle") return null;
  const map: Record<Exclude<PanelState, "idle">, string> = {
    waiting: "text-[var(--dark-muted)]",
    generating: "text-[var(--orange)]",
    complete: "text-[var(--live)]",
    error: "text-red-400",
  };
  const label =
    status === "waiting"
      ? "Waiting"
      : status === "generating"
        ? "Generating"
        : status === "complete"
          ? "Done"
          : "Error";
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${map[status]}`}>
      {label}
    </span>
  );
}

function relative(at: number) {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}
