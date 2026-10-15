"use client";

import Link from "next/link";
import { LabChrome } from "@/components/lab/lab-chrome";
import { LabCard, LabDarkModule } from "@/components/lab/ui";

const TOC = [
  { id: "credits", label: "Credits" },
  { id: "market", label: "The market" },
  { id: "key", label: "Get an API key" },
  { id: "auth-fund", label: "Auth and funding" },
  { id: "models", label: "Call models" },
  { id: "activity-billing", label: "Activity and billing" },
  { id: "networks", label: "Networks" },
] as const;

export default function DocsPage() {
  return (
    <LabChrome
      active="docs"
      title="Docs"
    >
      <div className="mx-auto flex max-w-5xl gap-8">
        <nav className="sticky top-8 hidden w-44 shrink-0 self-start lg:block">
          <p className="m-0 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-3)]">
            On this page
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {TOC.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="block rounded-full px-3 py-1.5 text-[12px] text-[var(--muted)] hover:bg-white hover:text-[var(--foreground)]"
                >
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          <div id="credits" className="scroll-mt-8">
            <LabDarkModule className="p-6 md:p-8">
              <p className="m-0 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--orange)]">
                Docs
              </p>
              <h2 className="m-0 mt-2 text-[1.55rem] font-semibold tracking-tight">
                The best AI, for less.
              </h2>
              <p className="m-0 mt-3 max-w-xl text-[15px] leading-relaxed text-white">
                Olora is a live marketplace for discounted AI credits. Spend them on the world&rsquo;s
                leading models through one API, or sell what you don&rsquo;t use.
              </p>
            </LabDarkModule>
          </div>

          <div id="market" className="scroll-mt-8">
            <LabCard className="space-y-5 p-5 md:p-6">
              <div>
                <h3 className="m-0 text-[17px] font-semibold">$1 of credit spends like $1</h3>
                <p className="m-0 mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                  Prices on the market are dollars per $1 of credit. A best ask of $0.92 means you
                  pay $0.92, before the taker fee, for credit that spends like $1 at each model&rsquo;s
                  list rate. The ticket shows the fee and the total before you confirm.
                </p>
              </div>
              <div>
                <h3 className="m-0 text-[17px] font-semibold">Buy under $1, or sell what you don&rsquo;t use</h3>
                <p className="m-0 mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                  The order book is live. Olora keeps a standing bid so you can sell unused credit
                  for USDC. Takers pay the fee. Makers pay nothing. Limit orders hold funds until
                  they fill, and cancel returns the remainder in full.
                </p>
                <p className="m-0 mt-3">
                  <Link href="/lab/market" className="text-[13px] font-medium underline-offset-2 hover:underline">
                    Open the market
                  </Link>
                </p>
              </div>
            </LabCard>
          </div>

          <div id="key" className="scroll-mt-8">
            <LabCard className="p-5 md:p-6">
              <h2 className="m-0 text-[17px] font-semibold">Get an API key</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-[var(--muted)]">
                <li>Sign in with Google or a wallet.</li>
                <li>
                  Open{" "}
                  <Link
                    href="/lab/keys"
                    className="text-[var(--foreground)] underline-offset-2 hover:underline"
                  >
                    API Access
                  </Link>
                  .
                </li>
                <li>Create a key for your project and copy the secret once.</li>
                <li>
                  Send it as{" "}
                  <code className="font-mono text-[12px]">Authorization Bearer tsk_…</code> on API
                  requests.
                </li>
              </ol>
              <p className="m-0 mt-3 text-[13px] text-[var(--muted)]">
                The key unlocks the API. Your balance on Billing pays for usage.
              </p>
            </LabCard>
          </div>

          <div id="auth-fund" className="scroll-mt-8">
            <LabCard className="p-5 md:p-6">
              <h2 className="m-0 text-[17px] font-semibold">Auth and funding</h2>
              <p className="m-0 mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                Home, Market, Models, and Docs stay open without an account. API Access, Activity,
                Billing, and Dashboard need a signed-in session.
              </p>
              <p className="m-0 mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                Buy credits on the market, or fund the balance with USDC on Base or USDG on
                Robinhood Chain. Pay as you go. No monthly plan.{" "}
                <Link
                  href="/lab/billing"
                  className="text-[var(--foreground)] underline-offset-2 hover:underline"
                >
                  Open Billing
                </Link>{" "}
                to deposit.
              </p>
            </LabCard>
          </div>

          <div id="models" className="scroll-mt-8">
            <LabCard className="p-5 md:p-6">
              <h2 className="m-0 text-[17px] font-semibold">Call models</h2>
              <p className="m-0 mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                Use <code className="font-mono text-[12px]">olora/auto</code> to let the router
                choose, or pin a model from the catalog. Requests follow an OpenAI-compatible chat
                shape.
              </p>
              <pre className="mt-3 overflow-auto rounded-[var(--lab-radius)] border border-[var(--border)] bg-[var(--panel-2)] p-4 font-mono text-[11px] leading-relaxed text-[var(--muted)]">{`curl https://app.olora.si/api/v1/chat/completions \\
  -H "Authorization: Bearer $OLORA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "olora/auto",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`}</pre>
              <Link
                href="/lab/models"
                className="mt-3 inline-block text-[13px] font-medium underline-offset-2 hover:underline"
              >
                Open Models
              </Link>
            </LabCard>
          </div>

          <div id="activity-billing" className="scroll-mt-8">
            <LabCard className="p-5 md:p-6">
              <h2 className="m-0 text-[17px] font-semibold">Activity and billing</h2>
              <p className="m-0 mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                <Link href="/lab/activity" className="underline-offset-2 hover:underline">
                  Activity
                </Link>{" "}
                is your personal ledger.{" "}
                <Link href="/lab/billing" className="underline-offset-2 hover:underline">
                  Billing
                </Link>{" "}
                shows balances, deposits, and usage cost. Dashboard summarizes spend and recent
                events for your account only.
              </p>
            </LabCard>
          </div>

          <div id="networks" className="scroll-mt-8">
            <LabCard className="p-5 md:p-6">
              <h2 className="m-0 text-[17px] font-semibold">Networks</h2>
              <p className="m-0 mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                Both rails are accepted: USDC on Base and USDG on Robinhood Chain. Credits are 1:1
                either way. Explorer links (Basescan / Robinhood) show up on payment activity.
              </p>
            </LabCard>
          </div>
        </div>
      </div>
    </LabChrome>
  );
}
