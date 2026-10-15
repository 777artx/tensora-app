"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { RequireAuth } from "@/components/lab/require-auth";
import { LabButton, LabHeroCard } from "@/components/lab/ui";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";

export type AgentRow = {
  id: string;
  name: string;
  credits: number;
  dailyCapUsd: number;
  perCallCapUsd: number;
  topUpCapUsd?: number;
  allowedModels: string[];
  allowedTools: string[];
  paused: boolean;
  keyPrefix: string | null;
  spentTodayUsd: number;
  spentTotalUsd: number;
  createdAt: string;
  usage: { id: string; at: string; kind: string; resource: string; cost: number }[];
};

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const field =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[14px] text-white outline-none focus:border-white/30";

export default function AgentsPage() {
  const { getAccessToken, authenticated, ready } = useLabAuth();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [dailyCap, setDailyCap] = useState("5");
  const [perCall, setPerCall] = useState("0.50");
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const headers = await labAuthHeaders(getAccessToken);
    const res = await fetch("/api/lab/agents", { headers });
    if (res.ok) {
      const data = (await res.json()) as { agents: AgentRow[] };
      setAgents(data.agents || []);
    }
    setLoaded(true);
  }

  useEffect(() => {
    if (!ready || !authenticated) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const headers = await labAuthHeaders(getAccessToken);
      const res = await fetch("/api/lab/agents", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim() || "My agent",
          dailyCapUsd: Number(dailyCap),
          perCallCapUsd: Number(perCall),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { agent?: AgentRow; secret?: string; error?: string }
        | null;
      if (!res.ok || !data?.agent) {
        setError(data?.error || "Could not create agent.");
        return;
      }
      setSecret(data.secret || null);
      setCopied(false);
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  const live = agents.filter((a) => !a.paused).length;
  const held = agents.reduce((s, a) => s + a.credits, 0);
  const today = agents.reduce((s, a) => s + a.spentTodayUsd, 0);

  return (
    <LabChrome
      active="agents"
      title="Agents"
      status={{ label: live > 0 ? `${live} running` : "None running", tone: live > 0 ? "live" : "offline" }}
    >
      <RequireAuth>
        <div className="mx-auto max-w-3xl space-y-8">
          <LabHeroCard className="p-6 md:p-8">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--hero-muted)]">
              Agent accounts
            </p>
            <h2 className="m-0 mt-2 max-w-md font-display text-[28px] font-semibold leading-tight text-[var(--hero-fg)]">
              A key and a balance for each agent.
            </h2>
            <p className="m-0 mt-2 max-w-lg text-[14px] text-[var(--hero-muted)]">
              It can only spend what you put in, up to the caps you set. Pause it whenever you want.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end">
              <label className="block text-[12px] text-[var(--hero-muted)]">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Research bot"
                  className={field}
                />
              </label>
              <label className="block text-[12px] text-[var(--hero-muted)]">
                Daily cap
                <input
                  value={dailyCap}
                  onChange={(e) => setDailyCap(e.target.value)}
                  inputMode="decimal"
                  aria-label="Daily cap in dollars"
                  className={`${field} font-mono`}
                />
              </label>
              <label className="block text-[12px] text-[var(--hero-muted)]">
                Per call
                <input
                  value={perCall}
                  onChange={(e) => setPerCall(e.target.value)}
                  inputMode="decimal"
                  aria-label="Per call cap in dollars"
                  className={`${field} font-mono`}
                />
              </label>
              <LabButton
                variant="secondary"
                className="!bg-white !font-semibold !text-[var(--dark)] sm:mb-px"
                onClick={() => void create()}
                disabled={busy}
              >
                Create
              </LabButton>
            </div>
            {error ? (
              <p className="m-0 mt-3 text-[13px] text-[var(--orange)]" role="alert">
                {error}
              </p>
            ) : null}
            {secret ? (
              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="m-0 text-[12px] text-[var(--hero-muted)]">
                  Copy this key now. It will not be shown again.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-white">{secret}</code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(secret);
                      setCopied(true);
                    }}
                    className="shrink-0 text-[13px] font-medium text-white underline-offset-2 hover:underline"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : null}
          </LabHeroCard>

          <section>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 text-[15px] font-semibold">Your agents</h3>
              {agents.length > 0 ? (
                <p className="m-0 font-mono text-[12px] text-[var(--muted)]">
                  {usd(held)} held · {usd(today)} today
                </p>
              ) : null}
            </div>
            {!loaded ? (
              <p className="m-0 text-[13px] text-[var(--muted)]">Loading…</p>
            ) : agents.length === 0 ? (
              <p className="m-0 text-[14px] text-[var(--muted)]">
                None yet. Create one above, then open it to add credits.
              </p>
            ) : (
              <ul className="m-0 list-none divide-y divide-[var(--border)] border-y border-[var(--border)] p-0">
                {agents.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/lab/agents/${a.id}`}
                      className="flex items-center justify-between gap-4 py-3.5 hover:bg-white/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium">{a.name}</span>
                        <span className="mt-0.5 block font-mono text-[12px] text-[var(--muted)]">
                          {a.keyPrefix}… · {a.paused ? "Paused" : "Running"}
                          {a.dailyCapUsd > 0 ? ` · ${usd(a.dailyCapUsd)}/day` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-[15px]">{usd(a.credits)}</span>
                        <span className="mt-0.5 block font-mono text-[12px] text-[var(--muted)]">
                          {usd(a.spentTodayUsd)} today
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </RequireAuth>
    </LabChrome>
  );
}
