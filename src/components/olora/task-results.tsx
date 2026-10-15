"use client";

import Link from "next/link";
import { LabMark } from "@/components/olora/lab-mark";
import { Icon } from "@/components/olora/nav";
import type { OloraModel } from "@/lib/olora/models";
import { costOf, type Estimate } from "@/lib/olora/task-estimate";
import { usdSmall } from "@/lib/olora/pricing";

export type Row = { m: OloraModel; std: number; ol: number };

export function rank(models: OloraModel[], est: Estimate, creditCost: number): Row[] {
  return models
    .map((m) => {
      const std = costOf(est, m.inputPerM, m.outputPerM) ?? 0;
      return { m, std, ol: std * creditCost };
    })
    .sort((a, b) => a.ol - b.ol);
}

/**
 * Ranked price list for one task. A thin bar shows each model's cost relative to the
 * most expensive, so the spread reads at a glance. The cheapest row carries the
 * single gradient accent on the page.
 */
export function TaskResults({ rows, hasDiscount, task }: { rows: Row[]; hasDiscount: boolean; task: string }) {
  const max = Math.max(...rows.map((r) => r.ol), 1e-9);
  const prompt = task.trim() ? `&prompt=${encodeURIComponent(task.trim())}` : "";

  return (
    <ol className="m-0 list-none p-0">
      {rows.map((r, i) => {
        const best = i === 0;
        return (
          <li key={r.m.id} className="ol-rise relative" style={{ animationDelay: `${i * 35}ms` }}>
            <Link
              href={`/lab/chat?model=${encodeURIComponent(r.m.id)}${prompt}`}
              className="group grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-4 border-t border-white/[0.05] px-5 py-3 transition-colors hover:bg-white/[0.02] md:grid-cols-[28px_minmax(0,220px)_minmax(0,1fr)_auto_auto]"
            >
              {best ? <span aria-hidden className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[var(--ink)]" /> : null}
              <LabMark provider={r.m.provider} size={28} tone={best ? "dark" : "light"} />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium text-[var(--ink)]">{r.m.name}</span>
                <span className="block truncate text-[13px] text-[var(--muted)]">{r.m.bestFor}</span>
              </span>
              <span aria-hidden className="relative hidden h-[2px] overflow-hidden rounded-full bg-white/[0.05] md:block">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-[var(--ease)] ${best ? "bg-[var(--ink)]" : "bg-white/25"}`}
                  style={{ width: `${Math.max(2, (r.ol / max) * 100)}%` }}
                />
              </span>
              <span className="ol-num text-right">
                <span className={`block text-[15px] text-[var(--ink)]`}>{usdSmall(r.ol)}</span>
                {hasDiscount ? <span className="block text-[12px] text-[var(--silver)] line-through">{usdSmall(r.std)}</span> : null}
              </span>
              <span className="hidden items-center gap-1 text-[13px] text-[var(--silver)] transition-colors group-hover:text-[var(--ink)] md:flex">
                Run
                <Icon name="arrow" size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
