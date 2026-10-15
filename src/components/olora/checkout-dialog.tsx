"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SubTier } from "@/lib/olora/plans";
import { usd } from "@/lib/olora/pricing";

type Method = "crypto" | "card";

export function CheckoutDialog({
  tier,
  cashUsd,
  busy,
  error,
  onClose,
  onPay,
}: {
  tier: SubTier;
  cashUsd: number | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPay: (method: Method) => void;
}) {
  const [method, setMethod] = useState<Method>("crypto");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const short = cashUsd != null && cashUsd < tier.priceUsd;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="checkout-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[var(--radius-lg)] bg-[var(--paper)] p-0 text-[var(--ink)] ring-1 ring-[var(--hairline)] backdrop:bg-black/50"
    >
      <form
        method="dialog"
        className="p-6 md:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          onPay(method);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="ol-label m-0">Checkout</p>
            <h2 id="checkout-title" className="m-0 mt-2 text-[22px] font-medium tracking-[-0.02em]">
              Olora {tier.name}
            </h2>
          </div>
          <p className="m-0 text-right">
            <span className="block text-[22px] font-medium tracking-[-0.02em]">{usd(tier.priceUsd, { min: 0, max: 0 })}</span>
            <span className="text-[12px] text-[var(--muted)]">for 30 days</span>
          </p>
        </div>

        <fieldset className="m-0 mt-6 border-0 p-0">
          <legend className="mb-2 text-[13px] text-[var(--gray)]">Pay with</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["crypto", "card"] as const).map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer flex-col rounded-[10px] p-3 ring-1 transition ${
                  method === m ? "ring-2 ring-[var(--ink)]" : "ring-[var(--hairline)] hover:ring-[var(--silver)]"
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={m}
                  checked={method === m}
                  onChange={() => setMethod(m)}
                  className="sr-only"
                />
                <span className="text-[14px] font-medium">{m === "crypto" ? "Crypto" : "Card"}</span>
                <span className="mt-1 text-[12px] text-[var(--muted)]">
                  {m === "crypto" ? "USDC or USDG balance" : "Visa, Mastercard, Amex"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {method === "crypto" ? (
          <p className="m-0 mt-4 text-[13px] leading-relaxed text-[var(--gray)]">
            {cashUsd == null
              ? "Paid from your cash balance."
              : short
                ? `Your cash balance is ${usd(cashUsd)}. Deposit ${usd(tier.priceUsd - cashUsd)} more in USDC on Base or USDG on Robinhood Chain.`
                : `Paid from your cash balance of ${usd(cashUsd)}.`}
          </p>
        ) : (
          <div className="mt-4 grid gap-2">
            <input
              required
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="Card number"
              aria-label="Card number"
              className="h-11 rounded-[10px] bg-[var(--surface)] px-3 text-[14px] ring-1 ring-[var(--hairline)] outline-none focus:ring-[var(--ink)]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                autoComplete="cc-exp"
                placeholder="MM / YY"
                aria-label="Expiry"
                className="h-11 rounded-[10px] bg-[var(--surface)] px-3 text-[14px] ring-1 ring-[var(--hairline)] outline-none focus:ring-[var(--ink)]"
              />
              <input
                required
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="CVC"
                aria-label="CVC"
                className="h-11 rounded-[10px] bg-[var(--surface)] px-3 text-[14px] ring-1 ring-[var(--hairline)] outline-none focus:ring-[var(--ink)]"
              />
            </div>
          </div>
        )}

        {error ? (
          <p role="alert" className="m-0 mt-4 rounded-[10px] bg-[var(--surface)] p-3 text-[13px] leading-relaxed text-[var(--ink)] ring-1 ring-[var(--hairline)]">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="h-11 flex-1 rounded-[10px] text-[14px] font-medium ring-1 ring-[var(--hairline)] hover:bg-[var(--surface)]"
          >
            Cancel
          </button>
          {method === "crypto" && short ? (
            <Link
              href="/lab/billing"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[10px] bg-[var(--brand)] text-[14px] font-medium text-[var(--brand-ice)] hover:bg-[var(--brand-hover)]"
            >
              Add funds
            </Link>
          ) : (
            <button
              type="submit"
              disabled={busy}
              className="h-11 flex-1 rounded-[10px] bg-[var(--brand)] text-[14px] font-medium text-[var(--brand-ice)] hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              {busy ? "Processing…" : `Pay ${usd(tier.priceUsd, { min: 0, max: 0 })}`}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
