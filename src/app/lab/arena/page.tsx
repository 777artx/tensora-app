"use client";

import { useState, useTransition } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";

const MODELS = [
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "claude-opus-5", label: "Claude Opus 5" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "deepseek-r1", label: "DeepSeek-R1" },
  { id: "qwen3", label: "Qwen3" },
  { id: "llama-4", label: "Llama 4 Maverick" },
];

type ArenaResult = {
  responseA: string;
  responseB: string;
  live?: boolean;
  error?: string;
  cost?: number;
};

export default function ArenaPage() {
  const [prompt, setPrompt] = useState(
    "Explain what Olora does in one short paragraph for a builder audience."
  );
  const [modelA, setModelA] = useState("gpt-4.1");
  const [modelB, setModelB] = useState("claude-opus-5");
  const { getAccessToken, requireAuth } = useLabAuth();
  const [result, setResult] = useState<ArenaResult | null>(null);
  const [vote, setVote] = useState<"a" | "b" | "tie" | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    if (!requireAuth("/lab/arena")) return;
    startTransition(async () => {
      setVote(null);
      setResult(null);
      const res = await fetch("/api/lab/arena", {
        method: "POST",
        headers: await labAuthHeaders(getAccessToken),
        body: JSON.stringify({ prompt, modelA, modelB }),
      });
      const data = (await res.json()) as ArenaResult;
      setResult(data);
    });
  }

  return (
    <LabChrome active="arena" title="Arena">
      <div className="mx-auto max-w-6xl space-y-5">
        <div
          className="rounded-md border border-[var(--border)] p-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(154,180,202,0.12), rgba(12,13,15,0.2))",
          }}
        >
          <h1 className="text-xl font-medium tracking-tight">Arena</h1>
          <p className="mt-1 text-sm text-[#d0d3d8]">
            Same prompt, two live models, billed to your credits. Votes stay on this page.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[#787b82]">Model A</span>
            <select
              className="w-full rounded border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[#787b82]">Model B</span>
            <select
              className="w-full rounded border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-[#787b82]">Prompt</span>
          <textarea
            className="min-h-28 w-full rounded border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>

        <button
          type="button"
          onClick={run}
          disabled={pending || !prompt.trim() || modelA === modelB}
          className="rounded bg-white px-4 py-2 text-sm font-medium text-[#0c0d0f] disabled:opacity-50"
        >
          {pending ? "Running…" : "Run side-by-side"}
        </button>

        {result?.error ? (
          <p className="text-sm text-red-400">{result.error}</p>
        ) : null}

        {result && !result.error ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-[var(--border)] bg-[#14161a] p-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-[#787b82]">
                  Model A · {MODELS.find((m) => m.id === modelA)?.label}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#f4f4ef]">
                  {result.responseA}
                </pre>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[#14161a] p-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-[#787b82]">
                  Model B · {MODELS.find((m) => m.id === modelB)?.label}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#f4f4ef]">
                  {result.responseB}
                </pre>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#787b82]">Vote:</span>
              {(
                [
                  ["a", "A wins"],
                  ["b", "B wins"],
                  ["tie", "Tie"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVote(key)}
                  className={`rounded border px-3 py-1.5 text-sm ${
                    vote === key
                      ? "border-[#9AB4CA] bg-[rgba(154,180,202,0.18)] text-[#9AB4CA]"
                      : "border-[var(--border)] text-[#d0d3d8]"
                  }`}
                >
                  {label}
                </button>
              ))}
              {vote ? (
                <span className="text-sm text-[#4ade80]">
                  Vote saved on this page{result.cost != null ? ` · $${result.cost.toFixed(4)}` : ""}
                </span>
              ) : null}
            </div>
            <a href="/lab/network" className="inline-block text-sm text-[#9AB4CA] underline">
              Network status →
            </a>
          </div>
        ) : null}
      </div>
    </LabChrome>
  );
}
