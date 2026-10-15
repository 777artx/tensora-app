"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLabAuth } from "@/lib/lab/auth";
import { loadBillingHistory, type BillingHistoryRow } from "@/lib/lab/credits";
import { useBalance, useConversations } from "@/lib/olora/hooks";
import { savingsFromHistory, usd } from "@/lib/olora/pricing";
import { currentPlanName } from "@/lib/olora/plans";
import { ButtonLink, Stat } from "@/components/olora/primitives";

function relTime(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STEPS = [
  { n: "1", title: "Create your free account", body: "Sign in with Google or a wallet. No card needed." },
  { n: "2", title: "Add credits", body: "Top up once and use any model from one balance." },
  { n: "3", title: "Start chatting", body: "Pick a model, or let us suggest one." },
];

/** Section 3. Returning customers: plan, balance, savings, recent chats. New: onboarding. */
export function HomeStatus() {
  const { ready, authenticated, login } = useLabAuth();
  const { credits } = useBalance();
  const conversations = useConversations();
  const [history, setHistory] = useState<BillingHistoryRow[]>([]);

  useEffect(() => {
    setHistory(loadBillingHistory());
    const on = () => setHistory(loadBillingHistory());
    window.addEventListener("tensora-credits-change", on);
    return () => window.removeEventListener("tensora-credits-change", on);
  }, []);

  if (!ready) return <div className="ol-skeleton h-40 w-full" />;

  if (!authenticated) {
    return (
      <section aria-label="Get started" className="rounded-[var(--radius-lg)] bg-[var(--cloud)] p-7 md:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[420px]">
            <h2 className="m-0 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-[var(--ink)]">
              Start in under a minute.
            </h2>
            <p className="m-0 mt-2 text-[15px] leading-relaxed text-[var(--muted)]">
              One account gives you every leading model. You only pay for what you use.
            </p>
          </div>
          <button
            type="button"
            onClick={() => login()}
            className="h-11 shrink-0 self-start rounded-full bg-[var(--ink)] px-6 text-[15px] font-medium text-black hover:bg-white md:self-auto"
          >
            Create free account
          </button>
        </div>
        <ol className="m-0 mt-10 grid list-none gap-6 p-0 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[13px] font-semibold tabular-nums text-[var(--ink)] ring-1 ring-[var(--hairline)]">
                {s.n}
              </span>
              <span>
                <span className="block text-[15px] font-medium text-[var(--ink)]">{s.title}</span>
                <span className="mt-0.5 block text-[14px] text-[var(--muted)]">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const saved = savingsFromHistory(history);
  const recent = conversations.slice(0, 4);
  const empty = (credits ?? 0) <= 0;

  return (
    <section aria-label="Your account" className="grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 self-start">
        <Stat label="Plan" value={currentPlanName()} note={<Link href="/lab/billing" className="hover:text-[var(--ink)]">Manage →</Link>} />
        <Stat label="Balance" value={credits == null ? "—" : usd(credits)} />
        <Stat
          label="Saved with Olora"
          value={saved > 0 ? usd(saved) : "—"}
          note={saved > 0 ? "From discounted credits" : "Buy discounted credits to start saving"}
        />
        <div className="flex items-end">
          {empty ? (
            <ButtonLink href="/lab/billing" size="sm">Add credits</ButtonLink>
          ) : (
            <ButtonLink href="/lab/market" variant="secondary" size="sm">Buy for less</ButtonLink>
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="m-0 text-[15px] font-semibold text-[var(--ink)]">Recent chats</h2>
          <Link href="/lab/chat" className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">
            New chat →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="m-0 rounded-[var(--radius)] bg-[var(--cloud)] px-4 py-5 text-[14px] text-[var(--muted)]">
            No chats yet. Ask something above to get started.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-[var(--hairline)] p-0">
            {recent.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/lab/chat?model=${encodeURIComponent(c.model)}`}
                  className="flex items-center justify-between gap-4 py-3 text-[14px] text-[var(--ink)] hover:text-[var(--graphite)]"
                >
                  <span className="truncate">{c.title}</span>
                  <span className="shrink-0 text-[12px] text-[var(--silver)]">{relTime(c.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
