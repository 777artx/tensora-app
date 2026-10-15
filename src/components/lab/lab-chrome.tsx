"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { OloraMark } from "@/components/lab/tensora-brand";
import { AccountMenu } from "@/components/olora/account-menu";
import { CommandPalette } from "@/components/olora/command-palette";
import { Icon, PRIMARY_NAV, toNavId, type NavId } from "@/components/olora/nav";
import { ThemeSwitch } from "@/components/olora/theme-switch";

/** Kept for back-compat with every existing route. */
export type LabNavActive = string;

/** Primary destinations inside the dark bar. The current one is the white control. */
function Tabs({ nav }: { nav: NavId }) {
  return (
    <nav aria-label="Primary" className="flex h-full items-center gap-1">
      {PRIMARY_NAV.map((l) => {
        const on = nav === l.id;
        return (
          <Link
            key={l.id}
            data-id={l.id}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className="ol-tab flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-colors duration-200"
          >
            <Icon name={l.icon} size={15} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LabChrome({
  children,
  active,
  title,
  fit = false,
  bare = false,
}: {
  children: ReactNode;
  active: LabNavActive;
  title?: string;
  subtitle?: string;
  status?: { label: string; tone?: "muted" | "live" | "offline" | "danger" };
  /** Lock this page to the viewport, no page scroll (Home, Chat, Compare). */
  fit?: boolean;
  bare?: boolean;
}) {
  const nav = toNavId(String(active));
  const [palette, setPalette] = useState(false);
  const [away, setAway] = useState(false);

  useEffect(() => {
    if (title) document.title = `${title} · Olora`;
  }, [title]);

  useEffect(() => {
    if (fit) return;
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        if (y < 12) setAway(false);
        else if (delta > 8) setAway(true);
        else if (delta < -8) setAway(false);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [fit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const main = fit ? "flex min-h-0 flex-1 flex-col pb-14 md:pb-0" : bare ? "flex-1 pb-24 md:pb-12" : "flex-1 px-5 pb-28 md:px-8 md:pb-16";

  return (
    <div className={`flex flex-col bg-[var(--paper)] text-[var(--foreground)] ${fit ? "h-dvh overflow-hidden" : "min-h-dvh"}`}>
      <header
        className={`sticky top-0 z-40 shrink-0 px-4 pt-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none md:px-5 ${
          away ? "pointer-events-none -translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="ol-chrome mx-auto flex h-[52px] max-w-[1240px] items-center gap-3 rounded-xl pr-1.5 pl-[22px]">
          <Link href="/lab/home" aria-label="Olora home" className="inline-flex items-center">
            <span className="ol-mark-on-dark">
              <OloraMark size={22} tone="sky" />
            </span>
            <span className="ol-mark-on-light">
              <OloraMark size={22} tone="dark" />
            </span>
          </Link>
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <Tabs nav={nav} />
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <ThemeSwitch />
            <AccountMenu nav={nav} onDark />
          </div>
        </div>
      </header>

      <main key={nav} className={`lab-page-enter min-w-0 ${main}`}>
        {children}
      </main>

      {/* Mobile: the same four destinations at the thumb. */}
      <nav
        aria-label="Primary"
        className="ol-dock fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[var(--hairline)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PRIMARY_NAV.map((l) => {
          const on = nav === l.id;
          return (
            <Link
              key={l.id}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] ${on ? "text-[var(--ink)]" : "text-[var(--gray)]"}`}
            >
              <Icon name={l.icon} size={20} className="" />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
