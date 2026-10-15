"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectCapabilities,
  estimateCost,
  formatPrice,
  getModelById,
  INFERENCE_CATALOG,
  modelDetailHref,
  providerLabel,
  providerLogoUrl,
  type InferenceModel,
} from "@/lib/lab/inference-catalog";
import { sendChat, type ChatMessage } from "@/lib/lab/inference-chat";
import { LabButton } from "@/components/lab/ui";
import { pushActivity } from "@/lib/lab/projects";
import { useLabAuth } from "@/lib/lab/auth";
import { TENSORA_APP_URL } from "@/lib/lab/public-url";
import { useMarketSnap } from "@/components/olora/market-snapshot";
import { effectiveCreditCost, usdSmall } from "@/lib/olora/pricing";

type UiMessage = ChatMessage & {
  id: string;
  latencyMs?: number;
  tokens?: number;
  cost?: number | null;
  modelUsed?: string;
};

export function ModelChat({
  model,
  costTier,
}: {
  model: InferenceModel;
  costTier?: "low" | "medium" | "high";
}) {
  const { getAccessToken } = useLabAuth();
  const snap = useMarketSnap();
  const creditCost = effectiveCreditCost(snap.book?.bestAsk, snap.feeBps);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    const userMsg: UiMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);

    const res = await sendChat({
      model: model.id,
      messages: next.map(({ role, content }) => ({ role, content })),
      cost_tier: model.id.includes("auto") ? costTier || "medium" : undefined,
      getAccessToken,
    });

    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }

    const promptTokens = res.usage?.prompt_tokens;
    const completionTokens = res.usage?.completion_tokens;
    const total =
      res.usage?.total_tokens ??
      (typeof promptTokens === "number" && typeof completionTokens === "number"
        ? promptTokens + completionTokens
        : undefined);
    const cost =
      typeof (res.usage as { cost?: number } | undefined)?.cost === "number"
        ? (res.usage as { cost: number }).cost
        : estimateCost(model.inputPerM, model.outputPerM, promptTokens, completionTokens);

    setMessages((prev) => [
      ...prev,
      {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: res.content,
        latencyMs: res.latencyMs,
        tokens: total,
        cost,
        modelUsed: res.model,
      },
    ]);

    pushActivity({
      kind: "inference",
      title: `${model.name} · chat`,
      detail: [
        total ? `${total} tok` : null,
        res.latencyMs != null ? `${res.latencyMs}ms` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      amount: cost != null ? `−$${cost.toFixed(4)}` : undefined,
      resource: model.name,
      provider: model.provider,
      status: "ok",
    });
  }

  function copyLast() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (last) void navigator.clipboard.writeText(last.content);
  }

  return (
    <div className="flex min-h-[520px] flex-col rounded-xl border border-[var(--border)] bg-[var(--panel)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={providerLogoUrl(model.provider, model.logoDomain)}
          alt=""
          className="h-7 w-7 rounded-md bg-white/5 object-contain p-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] text-[var(--foreground)]">{model.name}</div>
          <div className="text-[11px] text-[var(--muted)]">{providerLabel(model.provider)}</div>
        </div>
        <ModelSwitcher currentId={model.id} />
        <div className="flex gap-1.5">
          <LabButton variant="subtle" onClick={clear}>
            New chat
          </LabButton>
          <LabButton variant="subtle" onClick={copyLast}>
            Copy
          </LabButton>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {!messages.length && !busy ? (
          <p className="m-0 pt-12 text-center text-sm text-[var(--muted)]">
            Message {model.name}…
          </p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[48rem] ${m.role === "user" ? "ml-auto" : ""}`}
          >
            <div
              className={`rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-[var(--orange-soft)] text-[var(--foreground)]"
                  : "bg-[var(--panel-2)] text-[var(--muted)]"
              }`}
            >
              {m.content}
            </div>
            {m.role === "assistant" ? (
              <div className="mt-1.5 flex flex-wrap gap-2 font-mono text-[10px] text-[var(--muted-3)]">
                {m.latencyMs != null ? <span>{m.latencyMs}ms</span> : null}
                {m.tokens != null ? <span>{m.tokens} tokens</span> : null}
                {m.cost != null ? (
                  <span>
                    {model.name.split(" ")[0]} · {usdSmall(m.cost * creditCost)}
                  </span>
                ) : null}
                {m.cost != null && m.cost * (1 - creditCost) >= 0.0005 ? (
                  <span>Saved {usdSmall(m.cost * (1 - creditCost))}</span>
                ) : null}
                {m.modelUsed && m.modelUsed !== model.id ? (
                  <span className="text-[var(--orange)]">{m.modelUsed}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        {busy ? (
          <div className="rounded-lg bg-[var(--panel-2)] px-3.5 py-2.5 text-sm text-[var(--muted)]">
            <span className="inline-flex gap-1">
              <span className="animate-pulse">Generating</span>
              <span className="animate-pulse opacity-60">…</span>
            </span>
          </div>
        ) : null}
        {error ? <p className="m-0 text-sm text-red-400">{error}</p> : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Message the model…"
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-3)] focus:border-[var(--orange)]/45"
          />
          <LabButton onClick={() => void send()} disabled={busy || !input.trim()}>
            Send →
          </LabButton>
        </div>
      </div>
    </div>
  );
}

function ModelSwitcher({ currentId }: { currentId: string }) {
  const options = INFERENCE_CATALOG.slice(0, 40);
  return (
    <select
      className="max-w-[10rem] truncate rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1.5 text-xs text-[var(--muted)] outline-none"
      value={currentId}
      onChange={(e) => {
        window.location.href = modelDetailHref(e.target.value);
      }}
      aria-label="Switch model"
    >
      {getModelById(currentId) ? (
        <option value={currentId}>{getModelById(currentId)!.name}</option>
      ) : null}
      {options
        .filter((m) => m.id !== currentId)
        .map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
    </select>
  );
}

export function ModelApiPanel({ model }: { model: InferenceModel }) {
  const [lang, setLang] = useState<"ts" | "py" | "curl">("ts");
  const appUrl = TENSORA_APP_URL;
  const snippets = {
    ts: `const res = await fetch("${appUrl}/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.OLORA_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "${model.id}",
    messages: [{ role: "user", content: "Hello" }],
  }),
})`,
    py: `import os, requests

requests.post(
  "${appUrl}/api/v1/chat/completions",
  headers={
    "Authorization": f"Bearer {os.environ['OLORA_API_KEY']}",
    "Content-Type": "application/json",
  },
  json={
    "model": "${model.id}",
    "messages": [{"role": "user", "content": "Hello"}],
  },
)`,
    curl: `curl ${appUrl}/api/v1/chat/completions \\
  -H "Authorization: Bearer $OLORA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model.id}",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display m-0 text-lg text-[var(--foreground)]">
          Use {model.name} through Olora
        </h3>
        <span className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
          Live API
        </span>
      </div>
      <p className="mt-2 m-0 text-sm text-[var(--muted)]">
        OpenAI-compatible. Use a <code className="font-mono text-[12px]">tsk_…</code> key from API
        Access. Base URL:{" "}
        <code className="font-mono text-[12px]">{appUrl}/api/v1</code>
      </p>

      <div className="mt-4 flex gap-1 border-b border-[var(--border)]">
        {(
          [
            ["ts", "TypeScript"],
            ["py", "Python"],
            ["curl", "cURL"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setLang(id)}
            className={`px-3 py-2 text-sm ${
              lang === id ? "text-[var(--foreground)] border-b-2 border-[var(--orange)]" : "text-[var(--muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <pre className="mt-4 overflow-x-auto rounded-lg bg-[var(--panel-2)] p-4 font-mono text-[12px] leading-relaxed text-[var(--muted)]">
        {snippets[lang]}
      </pre>

      <div className="mt-4 flex flex-wrap gap-2">
        <LabButton
          variant="ghost"
          onClick={() => void navigator.clipboard.writeText(snippets[lang])}
        >
          Copy
        </LabButton>
        <Link
          href="/lab/keys"
          className="inline-flex items-center rounded-[var(--lab-radius-sm)] bg-[var(--hero)] px-4 py-2 text-sm font-medium text-[var(--hero-fg)] rounded-full"
        >
          Create API Key
        </Link>
        <Link
          href="/lab/docs"
          className="inline-flex items-center rounded-[var(--lab-radius-sm)] border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]"
        >
          View Docs
        </Link>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] text-[var(--muted)]">Model ID</dt>
          <dd className="mt-1 m-0 font-mono text-sm text-[var(--foreground)]">{model.id}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--muted)]">Provider</dt>
          <dd className="mt-1 m-0 text-sm text-[var(--foreground)]">{providerLabel(model.provider)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--muted)]">Pricing</dt>
          <dd className="mt-1 m-0 font-mono text-sm text-[var(--foreground)]">
            {formatPrice(model.inputPerM)}/M in · {formatPrice(model.outputPerM)}/M out
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function ModelDetailsPanel({ model }: { model: InferenceModel }) {
  const caps = detectCapabilities(model);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 md:p-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        {[
          ["Provider", providerLabel(model.provider)],
          ["Model ID", model.id],
          ["Context window", model.context === "-" ? "-" : `${model.context}`],
          ["Input pricing", `${formatPrice(model.inputPerM)} / M tokens`],
          ["Output pricing", `${formatPrice(model.outputPerM)} / M tokens`],
          ["Capabilities", caps.length ? caps.join(" · ") : "-"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-[var(--muted)]">{k}</dt>
            <dd className="mt-1 m-0 text-sm text-[var(--foreground)]">{v}</dd>
          </div>
        ))}
      </dl>
      {model.description ? (
        <div className="mt-6">
          <div className="text-[11px] text-[var(--muted)]">About</div>
          <p className="mt-1 m-0 text-sm leading-relaxed text-[var(--muted)]">
            {model.description}
          </p>
        </div>
      ) : null}
      {caps.length ? (
        <div className="mt-6">
          <div className="text-[11px] text-[var(--muted)]">Best for</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {caps.map((c) => (
              <span
                key={c}
                className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-xs text-[var(--foreground)]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
