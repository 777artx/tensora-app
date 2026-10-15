"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLabAuth } from "@/lib/lab/auth";
import { useBalance } from "@/lib/olora/hooks";
import { usd } from "@/lib/olora/pricing";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { Icon, SECONDARY_NAV, type NavId } from "@/components/olora/nav";

/**
 * Balance + account in one control. The balance is the button label because it is
 * the number people check most; everything secondary lives behind it.
 */
export function AccountMenu({ nav, onDark = false }: { nav: NavId; onDark?: boolean }) {
  const { ready, authenticated, userLabel, initials, login, logout, getAccessToken } = useLabAuth();
  const { credits } = useBalance();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState("Pay as you go");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!authenticated) return;
    let alive = true;
    void (async () => {
      try {
        const headers = await labAuthHeaders(getAccessToken);
        const res = await fetch("/api/lab/subscription", { headers });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { state?: { plan?: string; tier?: string | null } | null };
        if (data.state?.plan === "plus") {
          const t = data.state.tier || "plus";
          setPlan(`Olora ${t.charAt(0).toUpperCase()}${t.slice(1)}`);
        }
      } catch {
        /* keep the default */
      }
    })();
    return () => {
      alive = false;
    };
  }, [authenticated, getAccessToken]);

  if (!ready) return <div className="ol-skeleton h-9 w-28 rounded-full" />;

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={() => login()}
        className={
          onDark
            ? "ol-on-dark h-9 rounded-lg bg-white px-4 text-[13px] font-medium text-black transition-colors hover:bg-[#e9e9e9]"
            : "h-9 rounded-[10px] bg-[var(--brand)] px-4 text-[14px] font-medium text-[var(--brand-ice)] transition-colors hover:bg-[var(--brand-hover)]"
        }
      >
        Sign in
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 items-center gap-2.5 rounded-lg py-1 pl-3 pr-1 text-[13px] font-medium transition-colors ${
          onDark
            ? open
              ? "ol-on-dark bg-[#e9e9e9] text-black"
              : "ol-on-dark bg-white text-black hover:bg-[#e9e9e9]"
            : open
              ? "bg-[var(--cloud)]"
              : "hover:bg-[var(--cloud)]"
        }`}
      >
        <span className={`font-mono text-[13px] tabular-nums tracking-[-0.02em] ${onDark ? "text-black" : "text-[var(--ink)]"}`}>
          {credits == null ? "—" : usd(credits)}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[11px] font-medium text-white">{initials}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="ol-pop ol-panel !absolute right-0 top-[calc(100%+8px)] z-50 max-h-[calc(100dvh-80px)] w-[300px] max-w-[calc(100vw-24px)] overflow-y-auto overflow-x-hidden shadow-[0_24px_60px_-20px_rgba(0,0,0,0.95)] [scrollbar-width:thin]"
        >
          <div className="px-5 pb-4 pt-5">
            <Link href="/lab/subscribe" onClick={() => setOpen(false)} className="m-0 text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">
              {plan}
            </Link>
            <p className="m-0 mt-2 font-mono text-[28px] leading-none tabular-nums tracking-[-0.03em] text-[var(--ink)]">
              {credits == null ? "—" : usd(credits)}
            </p>
            <Link
              href="/lab/billing#add-funds"
              onClick={() => setOpen(false)}
              className="mt-4 flex h-9 items-center justify-center rounded-[10px] bg-[var(--ink)] text-[13px] font-medium text-[var(--paper)] hover:opacity-90"
            >
              Add funds
            </Link>
          </div>
          <div className="border-t border-[var(--hairline)] p-1.5">
            {SECONDARY_NAV.map((l) => (
              <Link
                key={l.id}
                role="menuitem"
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={nav === l.id ? "page" : undefined}
                className="flex h-10 items-center gap-3 rounded-[12px] px-3.5 text-[14px] text-[var(--graphite)] hover:bg-[var(--cloud)] hover:text-[var(--ink)] aria-[current=page]:text-[var(--ink)]"
              >
                <Icon name={l.icon} size={17} className="text-[var(--silver)]" />
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--hairline)] py-3 pl-5 pr-4">
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--muted)]">{userLabel}</span>
            <button type="button" onClick={() => void logout()} className="shrink-0 rounded-[8px] px-2 py-1 text-[13px] text-[var(--graphite)] hover:bg-[var(--cloud)] hover:text-[var(--ink)]">
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
