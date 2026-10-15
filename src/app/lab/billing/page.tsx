"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LabChrome } from "@/components/lab/lab-chrome";
import { RequireAuth } from "@/components/lab/require-auth";
import { DepositPanel } from "@/components/olora/deposit-panel";
import { Page, PageHeader, SectionHeader, Stat } from "@/components/olora/primitives";
import Link from "next/link";
import {
  getCredits,
  getUsdcBalance,
  getUsdgBalance,
  loadBillingHistory,
  monthSpendTotals,
  refreshCreditsFromServer,
  type BillingHistoryRow,
  type DepositConfig,
  type DepositMethod,
} from "@/lib/lab/credits";
import { useLabAuth } from "@/lib/lab/auth";
import { savingsFromHistory, usd } from "@/lib/olora/pricing";

function label(kind: string) {
  const k = kind.toLowerCase();
  if (k.includes("deposit")) return "Added funds";
  if (k.includes("market") || k.includes("trade")) return "Market trade";
  if (k.includes("model") || k.includes("inference") || k.includes("chat")) return "AI usage";
  if (k.includes("subscription")) return "Subscription";
  if (k.includes("reward")) return "Reward";
  return kind.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function BillingInner() {
  const params = useSearchParams();
  const depositParam = params.get("deposit") as DepositMethod | null;
  const { getAccessToken, authenticated, ready } = useLabAuth();
  const [credits, setCredits] = useState(0);
  const [cash, setCash] = useState(0);
  const [history, setHistory] = useState<BillingHistoryRow[]>([]);
  const [cfg, setCfg] = useState<DepositConfig | null>(null);

  const refresh = useCallback(() => {
    setCredits(getCredits());
    setCash(getUsdcBalance() + getUsdgBalance());
    setHistory(loadBillingHistory());
  }, []);

  const sync = useCallback(() => {
    void refreshCreditsFromServer(getAccessToken).then((snap) => {
      refresh();
      if (snap?.deposit) setCfg(snap.deposit);
    });
  }, [getAccessToken, refresh]);

  useEffect(() => {
    refresh();
    if (!ready || !authenticated) return;
    sync();
    const on = () => refresh();
    window.addEventListener("tensora-credits-change", on);
    return () => window.removeEventListener("tensora-credits-change", on);
  }, [refresh, sync, ready, authenticated]);

  const month = useMemo(() => monthSpendTotals(history), [history]);
  const monthTotal = month.model + month.compute + month.tools + month.other;
  const saved = useMemo(() => savingsFromHistory(history), [history]);

  return (
    <LabChrome active="billing" title="Portfolio">
      <RequireAuth>
        <Page>
          <PageHeader
            eyebrow="Portfolio"
            title="What you hold"
            lede="Credits spend on any supported model or sell on the market. Cash buys credits."
            actions={
              <>
                <Link href="/lab/market" className="inline-flex h-10 items-center rounded-[10px] bg-[var(--ink)] px-5 text-[14px] font-medium text-[var(--paper)] hover:opacity-90">Trade</Link>
                <Link href="/lab/keys" className="inline-flex h-10 items-center rounded-[10px] px-5 text-[14px] font-medium text-[var(--ink)] ring-1 ring-[var(--mist)] hover:bg-[var(--cloud)]">Use</Link>
              </>
            }
          />

          <div className="ol-rise ol-panel grid grid-cols-2 gap-8 p-6 md:grid-cols-4 md:p-8">
            <Stat size="lg" label="Credits" value={usd(credits)} note="Use or sell" />
            <Stat size="lg" label="Cash" value={usd(cash)} note="Buy credits on the Market" />
            <Stat size="lg" label="Used this month" value={usd(monthTotal)} />
            <Stat size="lg" label="You've saved" value={saved > 0 ? usd(saved) : "—"} note={saved > 0 ? "with Olora" : "Buy on the market to save"} />
          </div>

          <section className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-[var(--hairline)] pt-8">
            <div>
              <h2 className="m-0 text-[20px] font-medium tracking-[-0.02em] text-[var(--ink)]">Olora Plus</h2>
              <p className="m-0 mt-2 max-w-[36rem] text-[14px] leading-relaxed text-[var(--gray)]">
                $20 for 30 days. 1,500 messages on everyday models. It does not renew on its own.
              </p>
            </div>
            <Link href="/lab/subscribe" className="text-[14px] font-medium text-[var(--ink)] underline-offset-4 hover:underline">
              See subscription →
            </Link>
          </section>

          <section className="mt-14">
            <DepositPanel config={cfg} initial={depositParam} onClaimed={sync} />
          </section>

          <section className="mt-14 pb-10">
            <SectionHeader title="Activity" />
            {history.length === 0 ? (
              <p className="m-0 py-10 text-center text-[15px] text-[var(--muted)]">Nothing yet. Add funds, make a trade or send a request and it will show up here.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {history.slice(0, 40).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-4 border-t border-[var(--hairline)] py-4">
                    <div className="min-w-0">
                      <div className="text-[15px] text-[var(--ink)]">{row.title || label(row.kind)}</div>
                      <div className="truncate text-[13px] text-[var(--muted)]">
                        {new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        {row.resource || row.description ? ` · ${row.resource || row.description}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-[15px] tabular-nums text-[var(--ink)]">{row.amount || "—"}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Page>
      </RequireAuth>
    </LabChrome>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <LabChrome active="billing" title="Portfolio">
          <div className="py-16 text-center text-[15px] text-[var(--muted)]">Loading…</div>
        </LabChrome>
      }
    >
      <BillingInner />
    </Suspense>
  );
}
