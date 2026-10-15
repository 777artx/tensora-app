"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { LabButton, LabCard, LabDarkModule, LabDarkPanel, LabHeroCard } from "@/components/lab/ui";
import {
  CreditOrderBook,
  type BookSnapshot,
} from "@/components/lab/credit-order-book";
import { useLabAuth } from "@/lib/lab/auth";
import { refreshCreditsFromServer, getCredits } from "@/lib/lab/credits";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { TENSORA_APP_URL } from "@/lib/lab/public-url";
import { pushActivity } from "@/lib/lab/projects";

type Band = { id: string; discountBps: number; availableUsd: number };
type CatalogRow = {
  id: string;
  name: string;
  provider: string;
  listOutputPerM: number | null;
  tensoraOutputPerM: number | null;
  discountBps: number;
};
type Analytics = {
  spent: number;
  requests: number;
  tokens: number;
  latencyMs: number;
  p95Ms: number;
  models: { model: string; spend: number; requests: number }[];
  spendByDay: { day: string; spend: number }[];
};
type Quote = {
  faceValue: number;
  discountBps: number;
  discountedPrice: number;
  platformFee: number;
  totalPay: number;
  bandId: string;
};

function formatUsd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

export default function InferenceMarketplacePage() {
  const { getAccessToken, authenticated, requireAuth, ready } = useLabAuth();
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;

  const [bands, setBands] = useState<Band[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [orderBook, setOrderBook] = useState<BookSnapshot | null>(null);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [trust, setTrust] = useState<{ title: string; body: string }[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [feeBps, setFeeBps] = useState(500);
  const [faceValue, setFaceValue] = useState("50");
  const [bandId, setBandId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/marketplace", { headers });
      if (!res.ok) {
        setLoadError(`Marketplace unavailable (${res.status})`);
        return;
      }
      const data = (await res.json()) as {
        liquidity: {
          bands: Band[];
          totalAvailable: number;
          bookDepthUsd?: number;
          sellableCapUsd?: number;
        };
        orderBook?: BookSnapshot;
        catalog: CatalogRow[];
        trust: { title: string; body: string }[];
        analytics: Analytics | null;
        feeBps: number;
      };
      setBands(data.liquidity?.bands || []);
      setTotalAvailable(
        data.liquidity?.bookDepthUsd ?? data.liquidity?.totalAvailable ?? 0
      );
      setOrderBook(data.orderBook || null);
      setCatalog(data.catalog || []);
      setTrust(data.trust || []);
      setAnalytics(data.analytics);
      setFeeBps(data.feeBps || 500);
      setBandId((prev) => prev || data.liquidity?.bands?.[0]?.id || "");
      const snap = await refreshCreditsFromServer(() => tokenRef.current());
      setCredits(snap?.credits ?? getCredits());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load marketplace");
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(poll);
  }, [load]);

  useEffect(() => {
    if (ready && authenticated) void load();
  }, [ready, authenticated, load]);

  const selectedBand = bands.find((b) => b.id === bandId) || bands[0];
  const face = Math.max(0, Number(faceValue) || 0);

  const quote: Quote | null = useMemo(() => {
    if (!selectedBand || face < 5) return null;
    const discountedPrice = Math.round(face * (1 - selectedBand.discountBps / 10000) * 100) / 100;
    const platformFee = Math.round(discountedPrice * (feeBps / 10000) * 100) / 100;
    return {
      faceValue: face,
      discountBps: selectedBand.discountBps,
      discountedPrice,
      platformFee,
      totalPay: Math.round((discountedPrice + platformFee) * 100) / 100,
      bandId: selectedBand.id,
    };
  }, [selectedBand, face, feeBps]);

  async function purchase() {
    if (!requireAuth("/lab/inference")) return;
    if (!quote) {
      setMsg("Minimum purchase is $5 in credits.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/marketplace", {
        method: "POST",
        headers,
        body: JSON.stringify({ faceValue: quote.faceValue, bandId: quote.bandId }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; credits?: number; quote?: Quote }
        | null;
      if (!res.ok) {
        if (res.status === 402) {
          setMsg(
            data?.error ||
              "Deposit USDC on Billing first, then buy discounted credits here."
          );
          return;
        }
        setMsg(data?.error || "Purchase failed");
        return;
      }
      setMsg(
        `Added $${data?.quote?.faceValue.toFixed(2)} credits for $${data?.quote?.totalPay.toFixed(2)}.`
      );
      pushActivity({
        kind: "marketplace",
        title: `Bought $${data?.quote?.faceValue.toFixed(2)} inference credits`,
        detail: `Paid $${data?.quote?.totalPay.toFixed(2)} (−${((data?.quote?.discountBps || 0) / 100).toFixed(0)}%)`,
        amount: `−$${data?.quote?.totalPay.toFixed(2)} → +$${data?.quote?.faceValue.toFixed(2)}`,
        resource: "Inference credits",
        provider: "Marketplace",
        status: "ok",
      });
      if (typeof data?.credits === "number") {
        try {
          localStorage.setItem("gd-credits", String(data.credits));
          window.dispatchEvent(new Event("tensora-credits-change"));
        } catch {
          /* ignore */
        }
        setCredits(data.credits);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const appUrl = TENSORA_APP_URL;

  return (
    <LabChrome
      active="inference"
      title="Inference"
      status={{ label: "Marketplace", tone: "live" }}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {loadError ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-[13px] text-[var(--orange)]">
            {loadError}{" "}
            <button type="button" className="underline" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : null}

        <LabHeroCard className="overflow-hidden p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--hero-muted)]">
                Inference market
              </p>
              <h1 className="m-0 mt-2 max-w-xl font-display text-[28px] font-semibold leading-tight text-[var(--hero-fg)] md:text-[34px]">
                Buy $1 of AI inference for less than $1.
              </h1>
              <p className="m-0 mt-2 max-w-lg text-[14px] text-[var(--hero-muted)]">
                Buy discounted credits, then spend them across supported AI models through one API.
              </p>
            </div>
            <div className="text-right font-mono text-[12px] text-[var(--hero-muted)]">
              <div className="text-[11px] uppercase tracking-wide text-[var(--hero-muted)]">
                Book depth
              </div>
              <div className="mt-0.5 text-[18px] font-semibold text-white">
                {formatUsd(totalAvailable)}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.05fr]">
            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
              <label className="block text-[12px] text-[var(--hero-muted)]">
                Credit amount (face value)
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={faceValue}
                  onChange={(e) => setFaceValue(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-[16px] text-white outline-none focus:border-[var(--orange)]/50"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {bands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBandId(b.id)}
                    className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                      (selectedBand?.id || "") === b.id
                        ? "bg-white text-[var(--dark)]"
                        : "border border-white/15 text-[var(--hero-muted)] hover:text-white"
                    }`}
                  >
                    {(b.discountBps / 100).toFixed(0)}% off · ${b.availableUsd.toLocaleString()}
                  </button>
                ))}
              </div>
              {quote ? (
                <dl className="mt-4 space-y-1.5 text-[13px] text-[var(--hero-muted)]">
                  <div className="flex justify-between gap-4">
                    <dt>Credit value</dt>
                    <dd className="m-0 font-mono text-white">{formatUsd(quote.faceValue)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Book price</dt>
                    <dd className="m-0 font-mono text-white">
                      {(1 - quote.discountBps / 10000).toFixed(4)} USDC
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Discounted price</dt>
                    <dd className="m-0 font-mono text-white">{formatUsd(quote.discountedPrice)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Platform fee ({(feeBps / 100).toFixed(0)}%)</dt>
                    <dd className="m-0 font-mono text-white">{formatUsd(quote.platformFee)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-white/10 pt-2 text-white">
                    <dt className="font-medium">You pay</dt>
                    <dd className="m-0 font-mono text-[15px] font-semibold">
                      {formatUsd(quote.totalPay)}
                    </dd>
                  </div>
                </dl>
              ) : null}
              <LabButton
                variant="secondary"
                className="mt-4 !bg-white !font-semibold !text-[var(--dark)]"
                onClick={() => void purchase()}
                disabled={busy || !quote}
              >
                {busy ? "Purchasing…" : authenticated ? "Buy credits" : "Sign in to buy"}
              </LabButton>
              {msg ? (
                <p className="m-0 mt-3 text-[12px] text-[var(--orange)]">
                  {msg}{" "}
                  {/deposit|billing|usdc|need \$/i.test(msg) ? (
                    <Link href="/lab/billing" className="underline underline-offset-2">
                      Open Billing →
                    </Link>
                  ) : null}
                </p>
              ) : null}
              <p className="m-0 mt-3 text-[11px] text-[var(--hero-muted)]">
                Balance ${credits.toFixed(2)}. Pays from USDC first, then credits.{" "}
                <Link href="/lab/billing" className="underline-offset-2 hover:underline">
                  Deposit
                </Link>
              </p>
            </div>

            <CreditOrderBook
              book={orderBook}
              selectedBandId={selectedBand?.id}
              onSelectBand={(id) => setBandId(id)}
            />
          </div>
        </LabHeroCard>

        <div className="grid gap-3 md:grid-cols-3">
          {(trust.length
            ? trust
            : [
                {
                  title: "Straight relay",
                  body: "Your request goes to the model you named. Nothing is swapped or downgraded.",
                },
                {
                  title: "Provider’s own answer",
                  body: "Responses carry the provider’s model name and id, so you can check.",
                },
                {
                  title: "Prompts never stored",
                  body: "Only model, tokens, cost and timing are kept. Never the text.",
                },
              ]
          ).map((t) => (
            <LabCard key={t.title} className="p-4">
              <h3 className="m-0 text-[14px] font-semibold">{t.title}</h3>
              <p className="m-0 mt-1.5 text-[13px] text-[var(--muted)]">{t.body}</p>
            </LabCard>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <LabDarkPanel className="p-4">
            <div className="font-mono text-[20px] font-semibold text-[var(--dark-fg)]">&lt;50 ms</div>
            <div className="mt-1 text-[12px] text-[var(--dark-muted)]">gateway overhead target</div>
          </LabDarkPanel>
          <LabDarkPanel className="p-4">
            <div className="font-mono text-[20px] font-semibold text-[var(--dark-fg)]">$0</div>
            <div className="mt-1 text-[12px] text-[var(--dark-muted)]">setup or subscription fees</div>
          </LabDarkPanel>
          <LabDarkPanel className="p-4">
            <div className="font-mono text-[20px] font-semibold text-[var(--dark-fg)]">
              {orderBook?.spread != null ? orderBook.spread.toFixed(4) : "—"}
            </div>
            <div className="mt-1 text-[12px] text-[var(--dark-muted)]">spread · credits / USDC</div>
          </LabDarkPanel>
        </div>

        <LabCard className="overflow-hidden p-0">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="m-0 text-[16px] font-semibold">Catalog · output $/1M</h2>
            <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">
              Compare retail pricing with the best price available on Olora.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead className="bg-[var(--panel)] text-[11px] uppercase tracking-wide text-[var(--muted-3)]">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Model</th>
                  <th className="px-3 py-2.5 font-medium">Retail</th>
                  <th className="px-3 py-2.5 font-medium">Olora</th>
                  <th className="px-5 py-2.5 font-medium">You save</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--border)]">
                    <td className="px-5 py-3">
                      <div className="font-medium">{m.name}</div>
                      <div className="font-mono text-[11px] text-[var(--muted)]">{m.id}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[var(--muted)]">
                      {formatUsd(m.listOutputPerM)}
                    </td>
                    <td className="px-3 py-3 font-mono">{formatUsd(m.tensoraOutputPerM)}</td>
                    <td className="px-5 py-3 text-[var(--orange)]">
                      −{(m.discountBps / 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--border)] px-5 py-3 text-[12px] text-[var(--muted)]">
            Prefer the playground?{" "}
            <Link href="/lab/models" className="text-[var(--foreground)] underline-offset-2 hover:underline">
              Open Models
            </Link>
          </div>
        </LabCard>

        <LabDarkModule className="p-5">
          <h2 className="m-0 text-[15px] font-semibold text-[var(--dark-fg)]">
            Migration is two lines
          </h2>
          <p className="m-0 mt-1 text-[13px] text-[var(--dark-muted)]">
            Point any OpenAI-compatible client at Olora. Create a key in API Access, deposit
            credits, then set:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-black/30 p-4 font-mono text-[12px] text-[var(--dark-muted)]">{`OPENAI_BASE_URL=${appUrl}/api/v1
OPENAI_API_KEY=tsk_…`}</pre>
          <p className="m-0 mt-3 text-[11px] text-[var(--dark-muted)]">
            Non-streaming chat completions work today. Streaming is not enabled yet.
          </p>
          <Link
            href="/lab/keys"
            className="mt-3 inline-block text-[12px] text-[var(--orange)] underline-offset-2 hover:underline"
          >
            Create or copy an API key →
          </Link>
        </LabDarkModule>

        <LabCard className="p-5">
          <h2 className="m-0 text-[16px] font-semibold">Analytics</h2>
          <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">
            Spend, requests, tokens, and measured gateway overhead on your account.
          </p>
          {authenticated && analytics ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  { l: "Spent", v: formatUsd(analytics.spent) },
                  { l: "Requests", v: analytics.requests.toLocaleString() },
                  { l: "Tokens", v: analytics.tokens.toLocaleString() },
                  {
                    l: "Latency",
                    v: `${analytics.latencyMs} ms`,
                    s: analytics.p95Ms ? `p95 ${analytics.p95Ms} ms` : undefined,
                  },
                ].map((x) => (
                  <div key={x.l} className="rounded-lg border border-[var(--border)] p-3">
                    <div className="text-[11px] uppercase tracking-wide text-[var(--muted-3)]">
                      {x.l}
                    </div>
                    <div className="mt-1 font-mono text-[18px] font-semibold">{x.v}</div>
                    {x.s ? <div className="text-[11px] text-[var(--muted)]">{x.s}</div> : null}
                  </div>
                ))}
              </div>
              {analytics.models.length ? (
                <ul className="m-0 mt-4 list-none space-y-2 p-0">
                  {analytics.models.map((m) => (
                    <li
                      key={m.model}
                      className="flex items-center justify-between gap-3 text-[13px]"
                    >
                      <span className="truncate font-mono text-[12px] text-[var(--muted)]">
                        {m.model}
                      </span>
                      <span className="shrink-0 font-mono">
                        {formatUsd(m.spend)} · {m.requests} req
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 mt-4 text-[13px] text-[var(--muted)]">
                  No inference traffic yet. Run a model or call the API.
                </p>
              )}
            </>
          ) : (
            <p className="m-0 mt-4 text-[13px] text-[var(--muted)]">Sign in to see your analytics.</p>
          )}
        </LabCard>
      </div>
    </LabChrome>
  );
}
