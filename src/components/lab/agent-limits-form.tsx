"use client";

import { useState } from "react";
import { LabButton, LabCard } from "@/components/lab/ui";

export type AgentLimits = {
  name: string;
  dailyCapUsd: number;
  perCallCapUsd: number;
  topUpCapUsd: number;
  allowedModels: string[];
  allowedTools: string[];
};

const TOOLS = ["search", "scrape", "social", "onchain", "post"];

const input =
  "mt-1 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none";

export function AgentLimitsForm({
  initial,
  busy,
  onSave,
}: {
  initial: AgentLimits;
  busy: boolean;
  onSave: (v: AgentLimits) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [daily, setDaily] = useState(String(initial.dailyCapUsd));
  const [perCall, setPerCall] = useState(String(initial.perCallCapUsd));
  const [topUp, setTopUp] = useState(String(initial.topUpCapUsd));
  const [models, setModels] = useState(initial.allowedModels.join(", "));
  const [tools, setTools] = useState<string[]>(initial.allowedTools);

  function toggleTool(t: string) {
    setTools((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <LabCard className="p-5">
      <h3 className="m-0 text-[15px] font-semibold">Limits</h3>
      <p className="m-0 mt-1 text-[12px] text-[var(--muted)]">
        Set a cap to 0 to turn it off. Leave models empty to allow all. Use a trailing * to allow a
        family, like <span className="font-mono">openai/*</span>.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block text-[12px] text-[var(--muted)]">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </label>
        <label className="block text-[12px] text-[var(--muted)]">
          Daily cap ($)
          <input
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            inputMode="decimal"
            className={`${input} font-mono`}
          />
        </label>
        <label className="block text-[12px] text-[var(--muted)]">
          Per call cap ($)
          <input
            value={perCall}
            onChange={(e) => setPerCall(e.target.value)}
            inputMode="decimal"
            className={`${input} font-mono`}
          />
        </label>
      </div>
      <label className="mt-3 block text-[12px] text-[var(--muted)]">
        Self top-up cap ($/day). The agent can buy this much from your balance on the order book when it runs low.
        0 turns it off.
        <input
          value={topUp}
          onChange={(e) => setTopUp(e.target.value)}
          inputMode="decimal"
          className={`${input} max-w-[10rem] font-mono`}
        />
      </label>
      <label className="mt-3 block text-[12px] text-[var(--muted)]">
        Allowed models (comma separated)
        <input
          value={models}
          onChange={(e) => setModels(e.target.value)}
          placeholder="All models"
          className={`${input} font-mono`}
        />
      </label>
      <fieldset className="mt-3 border-0 p-0">
        <legend className="text-[12px] text-[var(--muted)]">
          Allowed tools {tools.length === 0 ? "(none picked, so all are allowed)" : ""}
        </legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] ${
                tools.includes(t)
                  ? "border-[var(--orange)] text-[var(--orange)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={tools.includes(t)}
                onChange={() => toggleTool(t)}
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      <LabButton
        className="mt-4"
        disabled={busy}
        onClick={() =>
          onSave({
            name,
            dailyCapUsd: Number(daily) || 0,
            perCallCapUsd: Number(perCall) || 0,
            topUpCapUsd: Number(topUp) || 0,
            allowedModels: models
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean),
            allowedTools: tools,
          })
        }
      >
        Save limits
      </LabButton>
    </LabCard>
  );
}
