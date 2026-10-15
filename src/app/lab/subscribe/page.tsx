"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { CheckoutDialog } from "@/components/olora/checkout-dialog";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { SUB_TIERS, tierById, type SubTier } from "@/lib/olora/plans";
import { usd } from "@/lib/olora/pricing";

type SubState = {
  plan: "payg" | "plus";
  tier: SubTier["id"] | null;
  messageLimit: number;
  messagesUsed: number;
  messagesLeft: number;
  renewsAt: string | null;
  status: "none" | "active" | "canceled";
  cashUsd: number;
};

function through(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export default function SubscribePage() {
  const { ready, authenticated, login, getAccessToken } = useLabAuth();
  const [state, setState] = useState<SubState | null>(null);
  const [checkout, setCheckout] = useState<SubTier | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const headers = await labAuthHeaders(getAccessToken);
      const res = await fetch("/api/lab/subscription", { headers });
      if (!res.ok) return;
      const data = (await res.json()) as { state?: SubState | null };
      setState(data.state ?? null);
    } catch {
      /* plans stay visible */
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function post(payload: Record<string, string>) {
    const headers = await labAuthHeaders(getAccessToken);
    const res = await fetch("/api/lab/subscription", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; state?: SubState } | null;
    if (data?.state) setState(data.state);
    return { ok: res.ok, error: data?.error };
  }

  async function pay(method: "crypto" | "card") {
    if (!checkout) return;
    setBusy(true);
    setPayError(null);
    try {
      const r = await post({ action: "subscribe", tier: checkout.id, method });
      if (!r.ok) {
        setPayError(r.error || "Payment failed. You were not charged.");
        return;
      }
      setNotice(`You're on Olora ${checkout.name}.`);
      setCheckout(null);
    } catch {
      setPayError("Payment failed. You were not charged.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const when = through(state?.renewsAt ?? null);
    if (!window.confirm(when ? `Cancel your plan? Included messages stay available through ${when}.` : "Cancel your plan?")) return;
    setBusy(true);
    try {
      const r = await post({ action: "cancel" });
      setNotice(r.ok ? "Canceled. It won't renew." : r.error || "Could not cancel.");
    } finally {
      setBusy(false);
    }
  }

  function choose(t: SubTier) {
    if (!authenticated) return login();
    setPayError(null);
    setCheckout(t);
  }

  const active = state?.plan === "plus" ? tierById(state.tier) : null;

  return (
    <LabChrome active="subscribe" title="Subscription">
      <div className="mx-auto w-full max-w-[1080px] px-5 pb-20 pt-12 md:px-8">
        <p className="ol-label m-0">Monthly packages</p>
        <h1 className="m-0 mt-4 text-[clamp(36px,4.6vw,56px)] font-medium leading-[1] tracking-[-0.035em] text-[var(--ink)]">
          Pick a package.
          <span className="mt-2 block text-[var(--silver)]">Pay with crypto or card.</span>
        </h1>
        <p className="m-0 mt-5 max-w-[38rem] text-[16px] leading-relaxed text-[var(--gray)]">
          Each package covers 30 days of everyday models. Flagship models use credits. Packages don&apos;t renew on their own,
          and you can cancel anytime.
        </p>

        {active && state ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--surface)] p-5 ring-1 ring-[var(--hairline)]" role="status">
            <p className="m-0 text-[15px]">
              <span className="font-medium">Olora {active.name}</span>
              <span className="text-[var(--gray)]">
                {" "}· {state.messagesLeft.toLocaleString()} of {state.messageLimit.toLocaleString()} messages left
                {state.renewsAt ? ` · through ${through(state.renewsAt)}` : ""}
                {state.status === "canceled" ? " · canceled" : ""}
              </span>
            </p>
            {state.status !== "canceled" ? (
              <button type="button" onClick={() => void cancel()} disabled={busy} className="text-[14px] underline underline-offset-2 disabled:opacity-50">
                Cancel plan
              </button>
            ) : null}
          </div>
        ) : null}

        {notice ? (
          <p className="m-0 mt-4 text-[14px] text-[var(--ink)]" role="status">
            {notice}
          </p>
        ) : null}

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {SUB_TIERS.map((t) => {
            const dark = !!t.featured;
            const current = active?.id === t.id;
            return (
              <section
                key={t.id}
                className={`flex flex-col p-7 ${dark ? "ol-panel" : "rounded-[var(--radius-lg)] bg-[var(--surface)] ring-1 ring-[var(--hairline)]"}`}
              >
                <div className="flex items-center justify-between">
                  <h2 className={`m-0 text-[17px] font-medium ${dark ? "text-white" : ""}`}>{t.name}</h2>
                  {dark ? <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80">Most popular</span> : null}
                </div>
                <p className={`m-0 mt-6 flex items-baseline gap-2 ${dark ? "text-white" : ""}`}>
                  <span className="text-[44px] font-medium leading-none tracking-[-0.04em]">{usd(t.priceUsd, { min: 0, max: 0 })}</span>
                  <span className={`text-[14px] ${dark ? "text-white/55" : "text-[var(--muted)]"}`}>/ month</span>
                </p>
                <p className={`m-0 mt-4 text-[15px] leading-relaxed ${dark ? "text-white/80" : "text-[var(--graphite)]"}`}>{t.blurb}</p>
                <ul className="m-0 mt-6 flex-1 list-none space-y-3 p-0">
                  {t.perks.map((line) => (
                    <li key={line} className={`flex gap-2 text-[14px] leading-snug ${dark ? "text-white/80" : "text-[var(--graphite)]"}`}>
                      <span aria-hidden className={dark ? "text-white/40" : "text-[var(--silver)]"}>—</span>
                      {line}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => choose(t)}
                  disabled={!ready || !!active}
                  className={`mt-7 inline-flex h-11 items-center justify-center rounded-[10px] text-[14px] font-medium disabled:opacity-50 ${
                    dark
                      ? "bg-[var(--brand)] text-[var(--brand-ice)] hover:bg-[var(--brand-hover)]"
                      : "bg-[var(--ink)] text-[var(--paper)] hover:opacity-90"
                  }`}
                >
                  {current ? "Current plan" : active ? "Plan active" : authenticated ? `Get ${t.name}` : "Sign in to subscribe"}
                </button>
              </section>
            );
          })}
        </div>

        <p className="m-0 mt-8 text-[14px] text-[var(--gray)]">
          Don&apos;t need a package?{" "}
          <Link href="/lab/market" className="text-[var(--ink)] underline underline-offset-2">
            Pay as you go with credits
          </Link>
          .
        </p>
      </div>

      {checkout ? (
        <CheckoutDialog
          tier={checkout}
          cashUsd={state?.cashUsd ?? null}
          busy={busy}
          error={payError}
          onClose={() => setCheckout(null)}
          onPay={(m) => void pay(m)}
        />
      ) : null}
    </LabChrome>
  );
}
