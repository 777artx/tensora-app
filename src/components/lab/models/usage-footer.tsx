"use client";

import { useEffect, useState } from "react";

type UsageStats = {
  requests: number;
  tokens: number;
  spend: number;
  top: { title: string; count: number }[];
};

function readUsage(): UsageStats {
  try {
    const raw = JSON.parse(localStorage.getItem("gd-billing-history") || "[]");
    if (!Array.isArray(raw)) return { requests: 0, tokens: 0, spend: 0, top: [] };
    const inference = raw.filter(
      (r: { kind?: string }) => r.kind === "inference" || r.kind === "chat",
    );
    const counts = new Map<string, number>();
    let spend = 0;
    let tokens = 0;
    for (const r of inference) {
      const title = String(r.title || "Request").replace(/ request$/i, "");
      counts.set(title, (counts.get(title) || 0) + 1);
      const amt = String(r.amount || "").replace(/[^0-9.]/g, "");
      if (amt) spend += parseFloat(amt) || 0;
      const tok = String(r.detail || "").match(/(\d+)\s*tokens/i);
      if (tok) tokens += parseInt(tok[1], 10);
    }
    const top = [...counts.entries()]
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    return { requests: inference.length, tokens, spend, top };
  } catch {
    return { requests: 0, tokens: 0, spend: 0, top: [] };
  }
}

export function UsageFooter() {
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    setStats(readUsage());
  }, []);

  if (!stats) return null;

  return (
    <section className="mt-8 border-t border-[var(--border)] pt-6 pb-4">
      {stats.requests === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[14px] font-semibold tracking-tight text-[var(--foreground)]">Your model usage</h2>
          <p className="m-0 text-[12px] text-[var(--muted)]">No model usage yet. Try one in the Playground.</p>
        </div>
      ) : (
        <>
        <h2 className="m-0 text-[14px] font-semibold tracking-tight text-[var(--foreground)]">Your model usage</h2>
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Requests" value={String(stats.requests)} />
            <Stat
              label="Tokens"
              value={stats.tokens ? stats.tokens.toLocaleString() : "-"}
            />
            <Stat
              label="Spend"
              value={stats.spend ? `$${stats.spend.toFixed(2)}` : "-"}
            />
          </div>
          {stats.top.length ? (
            <div className="mt-5">
              <div className="text-[11px] text-[var(--muted)]">Top models</div>
              <ul className="mt-2 m-0 list-none space-y-1.5 p-0">
                {stats.top.map((t) => (
                  <li
                    key={t.title}
                    className="flex justify-between text-sm text-[var(--muted)]"
                  >
                    <span>{t.title}</span>
                    <span className="font-mono text-[var(--muted-3)]">{t.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className="mt-1 font-mono text-xl text-[var(--foreground)] tabular-nums">{value}</div>
    </div>
  );
}
