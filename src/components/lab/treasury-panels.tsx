"use client";

import { StableLogo, UsdcLogo, UsdgLogo } from "@/components/lab/stable-logos";
import { formatUsd, relativeTime, type NetworkSettlement } from "@/lib/lab/home-proof";

const TREASURY = "0x3e32A1b643A81927802E7Fa2027D9395Ce8D1821";
const RH_EXPLORER = "https://robinhoodchain.blockscout.com";

function shortAddr(a: string) {
  if (!a || a.length < 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function TreasuryPayoutsPanel({
  settlements,
  now,
}: {
  settlements: NetworkSettlement[];
  now: number;
  tick?: number;
}) {
  const rows = settlements.slice(0, 8).map((s) => ({
    id: s.id,
    asset: (s.asset === "USDC" ? "USDC" : "USDG") as "USDC" | "USDG",
    addr: shortAddr(s.from),
    amount: s.amountUsd,
    at: s.at,
    explorerUrl: s.explorerUrl,
  }));
  const windowSum = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[var(--lab-radius)] border border-white/10 bg-[var(--dark-elevated)] p-3 text-[var(--dark-fg)]">
      <div className="mb-2 shrink-0">
        <h3 className="m-0 text-[13px] font-semibold">Onchain deposits</h3>
        <p className="m-0 mt-0.5 text-[11px] text-[var(--dark-muted)]">
          Live deposits into the Olora treasury · {formatUsd(windowSum)}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 py-6 text-center text-[12px] text-[var(--dark-muted)]">
          Loading Base x402 transfers…
        </p>
      ) : (
        <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className="flex items-center gap-2 border-t border-white/[0.06] py-1.5 first:border-t-0"
              style={{ opacity: i > 5 ? 0.55 : 1 }}
            >
              <StableLogo asset={row.asset} size={22} />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[var(--dark-muted)]">
                {row.addr} · {row.asset}
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-[var(--dark-muted-2)]">
                {relativeTime(row.at, now)}
              </span>
              <span className="w-14 shrink-0 text-right text-[13px] font-semibold tabular-nums">
                {formatUsd(row.amount)}
              </span>
              <a
                href={row.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[10px] text-[var(--orange)]"
              >
                Tx
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Chrome-less deposits list for tabbed feeds. */
export function DepositsList({
  settlements,
  now,
}: {
  settlements: NetworkSettlement[];
  now: number;
}) {
  const rows = settlements.slice(0, 10);
  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-grad" aria-hidden />
        <p className="m-0 text-[12px] text-[var(--dark-muted)]">Syncing treasury transfers from Base…</p>
        <a
          href={`https://basescan.org/address/${TREASURY}`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-[var(--dark-muted-2)] hover:text-white"
        >
          View treasury on BaseScan ↗
        </a>
      </div>
    );
  }
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((s) => {
        const asset = (s.asset === "USDC" ? "USDC" : "USDG") as "USDC" | "USDG";
        return (
          <li
            key={s.id}
            className="flex items-center gap-3 border-t border-white/[0.05] py-2 first:border-t-0"
          >
            <StableLogo asset={asset} size={18} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[12px] text-[var(--dark-fg)]">{shortAddr(s.from)}</div>
              <div className="truncate text-[11px] text-[var(--dark-muted-2)]">
                {asset} deposit · {relativeTime(s.at, now)}
              </div>
            </div>
            <a
              href={s.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-right text-[12px] font-semibold tabular-nums text-[var(--dark-fg)] hover:text-[var(--orange)]"
              title="View transaction"
            >
              +{formatUsd(s.amountUsd)} <span className="text-[10px] text-[var(--dark-muted-2)]">↗</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Settlement rails for the Home footer. */
export function RailsStrip() {
  const rails = [
    {
      logo: <UsdcLogo size={32} />,
      name: "USDC",
      chain: "Base",
      note: "x402 settlements",
    },
    {
      logo: <UsdgLogo size={32} />,
      name: "USDG",
      chain: "Robinhood Chain",
      note: "Deposits",
    },
  ] as const;

  return (
    <div className="flex h-full min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[11px] font-medium text-[var(--dark-muted)]">Settlement rails</div>
        <span className="font-mono text-[10px] text-[var(--dark-muted-2)]">{shortAddr(TREASURY)}</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2">
        {rails.map((rail) => (
          <div
            key={rail.name}
            className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"
          >
            {rail.logo}
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold leading-none tracking-tight">{rail.name}</div>
              <div className="mt-1 text-[11px] text-[var(--dark-muted)]">
                {rail.chain}
                <span className="text-[var(--dark-muted-2)]"> · {rail.note}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PayoutRailsPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-[var(--lab-radius)] border border-white/10 bg-[var(--dark-elevated)] p-3 text-[var(--dark-fg)]">
      <div className="mb-2 shrink-0">
        <h3 className="m-0 text-[13px] font-semibold">Settlement rails</h3>
        <p className="m-0 mt-0.5 text-[11px] text-[var(--dark-muted)]">
          Fund Olora with USDC on Base or USDG on Robinhood Chain.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5 rounded-[var(--lab-radius)] border border-white/10 bg-black/30 px-2.5 py-1.5">
          <UsdcLogo size={28} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium">USDC · USD Coin</div>
            <div className="text-[11px] text-[#5b9dff]">on Base · deposits · x402</div>
          </div>
          <span className="font-mono text-[11px] text-[var(--dark-muted-2)]">chain 8453</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-[var(--lab-radius)] border border-white/10 bg-black/30 px-2.5 py-1.5">
          <UsdgLogo size={28} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium">USDG · Global Dollar</div>
            <div className="text-[11px] text-[var(--dark-muted)]">on Robinhood Chain · deposits</div>
          </div>
          <span className="font-mono text-[11px] text-[var(--dark-muted-2)]">chain 4663</span>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <div className="text-[10px] font-medium text-[var(--dark-muted)]">Treasury</div>
        <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--dark-fg)]">{TREASURY}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <a
            href={`https://basescan.org/address/${TREASURY}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-[var(--dark-muted)] hover:text-white"
          >
            View on BaseScan
          </a>
          <a
            href={`${RH_EXPLORER}/address/${TREASURY}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-[var(--dark-muted)] hover:text-white"
          >
            View on Explorer
          </a>
        </div>
      </div>
    </div>
  );
}
