"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type ModelsTab = "explore" | "playground";

export function ModelsShell({
  tab,
  onTabChange,
  children,
}: {
  tab: ModelsTab;
  onTabChange: (tab: ModelsTab) => void;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[var(--lab-content-max)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-full border border-[var(--border)] bg-[var(--panel)] p-1"
          role="tablist"
          aria-label="Models sections"
        >
          {(
            [
              { id: "explore", label: "Explore" },
              { id: "playground", label: "Playground" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => onTabChange(t.id)}
              className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                tab === t.id
                  ? "bg-[var(--hero)] font-medium text-[var(--hero-fg)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link
          href="/lab/keys"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--hero)] px-4 py-2 text-[13px] font-medium text-[var(--hero-fg)] hover:bg-[#1a1a1c]"
        >
          Create API Key
        </Link>
      </div>
      <div>{children}</div>
    </div>
  );
}
