/**
 * Olora pricing math. Every number shown to customers comes from here.
 *
 * Facts this relies on (see /api/inference/chat):
 *  - Chat usage is debited from the credit balance at the provider's own list rate.
 *    $1.00 of credits buys exactly what $1.00 buys at the provider.
 *  - Savings come only from buying credits below face value on the marketplace.
 *    So the real discount = 1 − (best ask × (1 + taker fee)).
 *
 * If there is no live ask, savings are zero, and that's what we show.
 */

/** Token mix used to translate per-million rates into "per message". Shown in the UI. */
export const TYPICAL_MESSAGE = { input: 1_000, output: 500 } as const;

export function costPerMessage(inputPerM: number | null, outputPerM: number | null): number | null {
  if (inputPerM == null || outputPerM == null) return null;
  return (TYPICAL_MESSAGE.input * inputPerM + TYPICAL_MESSAGE.output * outputPerM) / 1e6;
}

/** Effective dollars paid per $1 of credit when buying at the best ask, fee included. */
export function effectiveCreditCost(bestAsk: number | null | undefined, feeBps: number): number {
  if (bestAsk == null || !Number.isFinite(bestAsk) || bestAsk <= 0) return 1;
  const eff = bestAsk * (1 + Math.max(0, feeBps) / 10000);
  return Math.min(1, Math.round(eff * 10000) / 10000);
}

/** Fractional discount vs. paying the provider directly (0.06 = 6%). */
export function marketDiscount(bestAsk: number | null | undefined, feeBps: number): number {
  return Math.max(0, Math.round((1 - effectiveCreditCost(bestAsk, feeBps)) * 10000) / 10000);
}

export function oloraRate(listRate: number | null, creditCost: number): number | null {
  if (listRate == null) return null;
  return listRate * creditCost;
}

/**
 * Actual savings from the server ledger: on every credit purchase, credits received
 * minus dollars paid (fees included). Only counts fills that really happened.
 */
export function savingsFromHistory(
  rows: { kind?: string; amount?: string; resource?: string; description?: string }[],
): number {
  const money = (s: string) => {
    const n = Number(s.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  let saved = 0;
  for (const r of rows) {
    const kind = (r.kind || "").toLowerCase();
    const amount = r.amount || "";
    if (kind === "marketplace") {
      // amount "+$50.00", resource "Paid $46.46 (fee …)"
      const paid = /Paid \$([\d.]+)/.exec(r.resource || "");
      if (paid) saved += money(amount) - Number(paid[1]);
    } else if (kind === "market" && /^Buy /.test(r.description || "")) {
      // amount "-$46.46 → +$50.00"
      const parts = amount.split("→");
      if (parts.length === 2) saved += money(parts[1]) - Math.abs(money(parts[0]));
    }
  }
  return Math.max(0, Math.round(saved * 100) / 100);
}

/* ── Formatting ─────────────────────────────────────────── */

export function usd(n: number | null | undefined, opts: { min?: number; max?: number } = {}): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const max = opts.max ?? Math.max(2, opts.min ?? 2);
  const min = Math.min(opts.min ?? 2, max);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

/** Small amounts like per-message costs: keeps two significant digits. */
export function usdSmall(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "Free";
  if (n >= 0.1) return usd(n);
  if (n >= 0.01) return usd(n, { min: 3, max: 3 });
  if (n >= 0.001) return usd(n, { min: 4, max: 4 });
  return "< $0.001";
}

export function pct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function perM(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${usd(n, { min: 2, max: n < 1 ? 3 : 2 })} / 1M tokens`;
}
