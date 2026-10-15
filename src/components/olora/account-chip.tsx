"use client";

import Link from "next/link";
import { useLabAuth } from "@/lib/lab/auth";
import { useBalance } from "@/lib/olora/hooks";
import { usd } from "@/lib/olora/pricing";

/** Sidebar footer: balance + identity, or a single sign-in action. */
export function AccountChip() {
  const { ready, authenticated, userLabel, initials, login, logout } = useLabAuth();
  const { credits } = useBalance();

  if (!ready) {
    return <div className="ol-skeleton h-12 w-full" />;
  }

  if (!authenticated) {
    return (
      <div className="rounded-[var(--radius)] bg-[var(--surface)] p-3.5 ring-1 ring-[var(--hairline)]">
        <p className="m-0 text-[13px] font-medium text-[var(--ink)]">Save on every model</p>
        <p className="m-0 mt-0.5 text-[12px] leading-snug text-[var(--muted)]">
          Create a free account to start chatting.
        </p>
        <button
          type="button"
          onClick={() => login()}
          className="mt-3 h-8 w-full rounded-full bg-[var(--ink)] text-[13px] font-medium text-[var(--paper)] transition-colors hover:opacity-90"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/lab/billing"
        className="flex items-center justify-between rounded-[var(--radius)] bg-[var(--surface)] px-3.5 py-3 ring-1 ring-[var(--hairline)] transition-shadow hover:shadow-[var(--shadow-1)]"
      >
        <span className="text-[12px] text-[var(--muted)]">Balance</span>
        <span className="text-[14px] font-semibold tabular-nums text-[var(--ink)]">
          {credits == null ? "—" : usd(credits)}
        </span>
      </Link>
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[11px] font-semibold text-[var(--paper)]">
          {initials}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink)]">{userLabel}</span>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md px-1.5 py-1 text-[12px] text-[var(--muted)] hover:bg-[var(--cloud)] hover:text-[var(--ink)]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
