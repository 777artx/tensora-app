"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { RequireAuth } from "@/components/lab/require-auth";
import { LabButton, LabCard, LabHeroCard } from "@/components/lab/ui";
import { AgentLimitsForm, type AgentLimits } from "@/components/lab/agent-limits-form";
import { McpInstall } from "@/components/lab/mcp-install";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import type { AgentRow } from "../page";

const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(n !== 0 && Math.abs(n) < 0.01 ? 4 : 2)}`;

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getAccessToken, authenticated, ready } = useLabAuth();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [missing, setMissing] = useState(false);
  const [amount, setAmount] = useState("5");
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const headers = await labAuthHeaders(getAccessToken);
    const res = await fetch(`/api/lab/agents/${id}`, { headers });
    if (!res.ok) {
      setMissing(true);
      return;
    }
    setAgent(((await res.json()) as { agent: AgentRow }).agent);
  }

  useEffect(() => {
    if (!ready || !authenticated) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, id]);

  async function act(body: Record<string, unknown>, done?: string) {
    setBusy(true);
    setMsg(null);
    try {
      const headers = await labAuthHeaders(getAccessToken);
      const res = await fetch(`/api/lab/agents/${id}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as
        | { agent?: AgentRow; secret?: string; error?: string }
        | null;
      if (!res.ok) {
        setMsg(data?.error || "Something went wrong.");
        return;
      }
      if (data?.agent) setAgent(data.agent);
      if (data?.secret) setSecret(data.secret);
      if (done) setMsg(done);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this agent? Its balance goes back to your credits and its key stops working.")) return;
    setBusy(true);
    const headers = await labAuthHeaders(getAccessToken);
    const res = await fetch(`/api/lab/agents/${id}`, { method: "DELETE", headers });
    setBusy(false);
    if (res.ok) router.push("/lab/agents");
    else setMsg("Could not delete agent.");
  }

  const limits: AgentLimits | null = agent
    ? {
        name: agent.name,
        dailyCapUsd: agent.dailyCapUsd,
        perCallCapUsd: agent.perCallCapUsd,
        topUpCapUsd: agent.topUpCapUsd ?? 0,
        allowedModels: agent.allowedModels,
        allowedTools: agent.allowedTools,
      }
    : null;

  return (
    <LabChrome
      active="agents"
      title={agent?.name || "Agent"}
      status={
        agent
          ? { label: agent.paused ? "Paused" : "Running", tone: agent.paused ? "offline" : "live" }
          : undefined
      }
    >
      <RequireAuth>
        <div className="mx-auto max-w-3xl space-y-4">
          <Link href="/lab/agents" className="text-[12px] text-[var(--muted)] hover:underline">
            ← All agents
          </Link>
          {missing ? (
            <LabCard className="p-5 text-[13px]">Agent not found.</LabCard>
          ) : !agent || !limits ? (
            <LabCard className="p-5 text-[13px] text-[var(--muted)]">Loading…</LabCard>
          ) : (
            <>
              <LabHeroCard className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-[var(--hero-muted)]">Balance</div>
                    <div className="mt-1 font-mono text-[28px] text-[var(--hero-fg)]">{usd(agent.credits)}</div>
                    <div className="mt-1 font-mono text-[12px] text-[var(--hero-muted)]">
                      {usd(agent.spentTodayUsd)} of {agent.dailyCapUsd > 0 ? usd(agent.dailyCapUsd) : "no cap"} today
                    </div>
                  </div>
                  <LabButton
                    variant="secondary"
                    className={agent.paused ? "!bg-white !font-semibold !text-[var(--dark)]" : "bg-grad !font-semibold !text-white"}
                    disabled={busy}
                    onClick={() =>
                      void act({ action: "update", paused: !agent.paused }, agent.paused ? "Agent resumed." : "Agent paused. Its key is blocked until you resume.")
                    }
                  >
                    {agent.paused ? "Resume agent" : "Pause agent"}
                  </LabButton>
                </div>
                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <label className="block text-[12px] text-[var(--hero-muted)]">
                    Amount ($)
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="decimal"
                      className="mt-1 block w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[14px] text-white outline-none"
                    />
                  </label>
                  <LabButton
                    variant="secondary"
                    className="!bg-white !font-semibold !text-[var(--dark)]"
                    disabled={busy}
                    onClick={() => void act({ action: "fund", amountUsd: Number(amount) }, "Funded from your credits.")}
                  >
                    Fund
                  </LabButton>
                  <LabButton
                    variant="subtle"
                    className="!text-white"
                    disabled={busy}
                    onClick={() => void act({ action: "drain", amountUsd: Number(amount) }, "Moved back to your credits.")}
                  >
                    Withdraw
                  </LabButton>
                </div>
                {msg ? <p className="m-0 mt-3 text-[12px] text-[var(--hero-muted)]" role="status">{msg}</p> : null}
              </LabHeroCard>

              <section className="border-y border-[var(--border)] py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="m-0 text-[15px] font-semibold">Key</h3>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act({ action: "rotate-key" }, "New key issued. The old one no longer works.")}
                    className="text-[13px] text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline disabled:opacity-50"
                  >
                    Rotate
                  </button>
                </div>
                <code className="mt-2 block break-all font-mono text-[13px]">
                  {secret || `${agent.keyPrefix}…`}
                </code>
                {secret ? (
                  <p className="m-0 mt-1 text-[12px] text-[var(--orange)]">Copy it now. It is shown once.</p>
                ) : null}
              </section>

              <McpInstall apiKey={secret} />

              <AgentLimitsForm
                key={agent.id}
                initial={limits}
                busy={busy}
                onSave={(v) => void act({ action: "update", ...v }, "Limits saved.")}
              />

              <LabCard className="p-5">
                <h3 className="m-0 text-[15px] font-semibold">Activity</h3>
                <div className="mt-3 space-y-1">
                  {agent.usage.length === 0 ? (
                    <p className="m-0 text-[13px] text-[var(--muted)]">No calls yet.</p>
                  ) : (
                    agent.usage.slice(0, 50).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 border-b border-[var(--border)] py-1.5 text-[12px] last:border-0"
                      >
                        <span>
                          <span className="mr-2 text-[10px] uppercase tracking-wide text-[var(--muted)]">{u.kind}</span>
                          <span className="font-mono">{u.resource}</span>
                        </span>
                        <span className="font-mono text-[var(--muted)]">
                          {u.kind === "topup" ? (u.cost >= 0 ? `+${usd(u.cost)}` : usd(u.cost)) : usd(u.cost)} ·{" "}
                          {new Date(u.at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </LabCard>

              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy}
                className="text-[12px] text-[var(--muted)] underline-offset-2 hover:text-[var(--orange)] hover:underline"
              >
                Delete agent
              </button>
            </>
          )}
        </div>
      </RequireAuth>
    </LabChrome>
  );
}
