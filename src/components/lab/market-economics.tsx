import Link from "next/link";
import { Panel } from "@/components/lab/market-panels";
import { SHOWCASE } from "@/lib/lab/dashboard-showcase";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const STEPS = [
  { n: "01", label: "Provider sells", value: "$1.00", note: "of AI credit or GPU time" },
  { n: "02", label: "Market clears at", value: "$0.92", note: "priced by the order book" },
  { n: "03", label: "Buyer saves", value: "8%", note: "versus paying retail", accent: true },
  { n: "04", label: "Olora earns", value: "fee", note: "spread + trading fee" },
] as const;

export function HowItWorks() {
  return (
    <Panel title="How the market works" action={{ href: "/lab/market", label: "Order book" }}>
      <ol className="m-0 flex list-none flex-col p-0">
        {STEPS.map((s, i) => (
          <li key={s.n} className="relative flex gap-3 pb-3 last:pb-0">
            {i < STEPS.length - 1 ? (
              <span className="absolute bottom-0 left-[9px] top-5 w-px bg-white/10" aria-hidden />
            ) : null}
            <span
              className={`relative z-[1] flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border font-mono text-[9px] ${
                "accent" in s ? "border-[var(--orange)] text-[var(--orange)]" : "border-white/15 text-[var(--dark-muted)]"
              } bg-[var(--dark)]`}
            >
              {s.n}
            </span>
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12px] font-medium">{s.label}</div>
                <div className="text-[10px] text-[var(--dark-muted-2)]">{s.note}</div>
              </div>
              <span
                className={`font-mono text-[15px] font-semibold tabular-nums ${"accent" in s ? "text-[var(--orange)]" : ""}`}
              >
                {s.value}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function EconomicsBreakdown({ volumeUsd, revenueUsd }: { volumeUsd: number; revenueUsd: number }) {
  const proceeds = Math.max(0, volumeUsd - revenueUsd);
  const take = volumeUsd > 0 ? (revenueUsd / volumeUsd) * 100 : 0;
  const rows = [
    { label: "Gross volume", value: usd(volumeUsd), pct: 100 },
    { label: "Provider proceeds", value: usd(proceeds), pct: (proceeds / Math.max(1, volumeUsd)) * 100 },
    { label: "Olora revenue", value: usd(revenueUsd), pct: take, accent: true },
  ];
  return (
    <Panel title="Market economics · 30D">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="mb-1 flex items-baseline justify-between text-[12px]">
              <span className={r.accent ? "text-[var(--orange)]" : "text-[var(--dark-muted)]"}>{r.label}</span>
              <span className="font-mono font-semibold tabular-nums">{r.value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${r.accent ? "bg-grad" : "bg-white/30"}`}
                style={{ width: `${Math.max(2, r.pct)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.06] pt-3">
        <span className="text-[11px] text-[var(--dark-muted)]">Take rate</span>
        <span className="font-mono text-[17px] font-semibold tabular-nums">{take.toFixed(1)}%</span>
      </div>
    </Panel>
  );
}

export function TensoraLoop({ revenueUsd }: { revenueUsd: number }) {
  const toPool = revenueUsd * (SHOWCASE.feesToPoolPct / 100);
  const holders = 1_248;
  return (
    <Panel title="$OLORA loop" action={{ href: "/lab/earn", label: "Earn" }}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <div>
          <div className="text-[11px] text-[var(--dark-muted)]">Fees generated</div>
          <div className="mt-1 font-mono text-[17px] font-semibold tabular-nums">{usd(revenueUsd)}</div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--dark-muted)]">AI credits funded</div>
          <div className="mt-1 font-mono text-[17px] font-semibold tabular-nums text-[var(--orange)]">{usd(toPool)}</div>
          <div className="mt-1 text-[10px] text-[var(--dark-muted-2)]">{SHOWCASE.feesToPoolPct}% of fees</div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--dark-muted)]">Eligible holders</div>
          <div className="mt-1 font-mono text-[17px] font-semibold tabular-nums">{holders.toLocaleString("en-US")}</div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--dark-muted)]">Avg credit / holder</div>
          <div className="mt-1 font-mono text-[17px] font-semibold tabular-nums">${(toPool / holders).toFixed(2)}</div>
        </div>
      </div>
      <p className="m-0 mt-4 border-t border-white/[0.06] pt-3 text-[11px] leading-snug text-[var(--dark-muted)]">
        Market fees buy AI credits, distributed to holders. Holders also pay up to 50% lower trading fees.{" "}
        <Link href="/lab/earn" className="text-[var(--orange)] hover:underline">
          Treasury →
        </Link>
      </p>
    </Panel>
  );
}
