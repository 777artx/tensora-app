"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { TensoraCa } from "@/components/lab/tensora-ca";
import { Notice, Page, PageHeader, SectionHeader, Stat } from "@/components/olora/primitives";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { usd } from "@/lib/olora/pricing";

type EarnState = {
  poolUsd: number;
  totalAccruedUsd: number;
  totalClaimedUsd: number;
  unclaimedUsd: number;
  lastTickAt: string | null;
  walletsTracked: number;
  creditsOutstandingUsd: number;
  feeRevenueUsd: number;
  myAccruedUsd: number;
  myClaimedUsd: number;
  token: string | null;
  tokenExplorerUrl: string | null;
  live: boolean;
  holderFloor: number;
  dripPctPerHour: number;
  ratePerHourUsd: number;
  backingUsd: number | null;
  backingRatio: number | null;
  myWallets: string[];
};

/** Token holder rewards. Same /api/lab/earn mechanism and eligibility; real figures only. */
export default function RewardsPage() {
  const { getAccessToken, authenticated, requireAuth } = useLabAuth();
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;
  const [state, setState] = useState<EarnState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/earn", { headers });
      if (res.ok) setState((await res.json()) as EarnState);
    } catch {
      /* keep last state */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  async function claim() {
    if (!requireAuth("/lab/earn")) return;
    setBusy(true);
    setMsg(null);
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/earn", { method: "POST", headers });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; claimedUsd?: number } | null;
      if (!res.ok || !data?.ok) {
        setMsg({ text: data?.error || "Couldn't claim right now.", tone: "error" });
        return;
      }
      setMsg({ text: `${usd(data.claimedUsd || 0)} in credits added. Use them on any model or sell them on the Market.`, tone: "success" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const live = state?.live ?? false;
  const mine = state?.myAccruedUsd ?? 0;
  const floor = (state?.holderFloor ?? 10000).toLocaleString();

  return (
    <LabChrome active="earn" title="Rewards">
      <Page width="narrow">
        <PageHeader
          eyebrow="Optional"
          title="Rewards for token holders."
          lede="Part of every Market fee buys AI credits for people who hold the $OLORA token. You don't need the token to use Olora."
        />

        <div className="ol-rise rounded-[var(--radius-lg)] bg-[var(--surface)] p-7 text-[var(--ink)] ring-1 ring-[var(--hairline)] md:p-9">
          <p className="m-0 text-[13px] text-[var(--silver)]">Your rewards</p>
          <p className="m-0 mt-2 text-[48px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{usd(mine)}</p>
          <p className="m-0 mt-3 text-[14px] text-[var(--silver)]">
            {!authenticated
              ? "Sign in with your wallet to see what you've earned."
              : state?.myWallets.length
                ? `From ${state.myWallets.length} linked wallet${state.myWallets.length === 1 ? "" : "s"}. ${usd(state.myClaimedUsd)} claimed so far.`
                : "No wallet linked yet. Sign in with the wallet that holds the token."}
          </p>
          <button
            type="button"
            onClick={() => void claim()}
            disabled={busy || (authenticated && (!live || mine <= 0))}
            className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[var(--ink)] px-6 text-[14px] font-medium text-black transition-colors hover:bg-white disabled:opacity-40"
          >
            {busy ? "Claiming…" : !authenticated ? "Sign in" : !live ? "Rewards start at launch" : "Claim as credits"}
          </button>
          {msg ? <div className="mt-5"><Notice tone={msg.tone}>{msg.text}</Notice></div> : null}
        </div>

        <section className="mt-14">
          <SectionHeader title="How it works" />
          <ol className="m-0 list-none space-y-7 p-0">
            {[
              ["Hold the token", `Keep at least ${floor} $OLORA in a wallet linked to your Olora account.`],
              ["Earn continuously", "Rewards build up over time based on how much you hold and for how long. There are no snapshot days."],
              ["Claim credits", "Claimed rewards become ordinary Olora credits. Use them for AI or sell them on the Market."],
            ].map(([t, b], i) => (
              <li key={t} className="flex gap-5">
                <span className="mt-0.5 text-[13px] tabular-nums text-[var(--silver)]">0{i + 1}</span>
                <div>
                  <h3 className="m-0 text-[16px] font-semibold text-[var(--ink)]">{t}</h3>
                  <p className="m-0 mt-1 text-[15px] leading-relaxed text-[var(--muted)]">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <SectionHeader title="Reward pool" description="Live figures from the rewards ledger." />
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <Stat label="Pool remaining" value={state ? usd(state.poolUsd) : "—"} />
            <Stat label="Paid out per hour" value={state ? usd(state.ratePerHourUsd) : "—"} />
            <Stat label="Earned all-time" value={state ? usd(state.totalAccruedUsd) : "—"} />
            <Stat label="Holders earning" value={state ? state.walletsTracked.toLocaleString() : "—"} />
          </div>
          <dl className="m-0 mt-10 space-y-3 border-t border-[var(--hairline)] pt-6 text-[14px]">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Market fees added to the pool</dt>
              <dd className="m-0 tabular-nums text-[var(--ink)]">{state ? usd(state.feeRevenueUsd) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Funds backing spendable credits</dt>
              <dd className="m-0 tabular-nums text-[var(--ink)]">{state?.backingUsd != null ? usd(state.backingUsd) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Credits outstanding</dt>
              <dd className="m-0 tabular-nums text-[var(--ink)]">{state ? usd(state.creditsOutstandingUsd) : "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-14 pb-10">
          <SectionHeader title="The token" />
          <TensoraCa />
          <p className="m-0 mt-4 text-[13px] leading-relaxed text-[var(--muted)]">
            $OLORA trades on Robinhood Chain. Holding it is optional and is not required to use any part of Olora.{" "}
            {state?.tokenExplorerUrl ? (
              <a href={state.tokenExplorerUrl} target="_blank" rel="noreferrer" className="text-[var(--ink)] underline underline-offset-2">View on Blockscout</a>
            ) : null}{" "}
            <Link href="/lab/market" className="text-[var(--ink)] underline underline-offset-2">Go to Market</Link>
          </p>
        </section>
      </Page>
    </LabChrome>
  );
}
