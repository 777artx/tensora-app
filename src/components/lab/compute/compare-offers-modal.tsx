"use client";

import {
  canTrySandbox,
  formatPrice,
  providerLabel,
  providerLogo,
  providerUrl,
  regionLabel,
  stockLabel,
  type GpuOffer,
} from "@/lib/lab/compute";

type Props = {
  offers: GpuOffer[];
  onClose: () => void;
  onRent: (offer: GpuOffer, mode: "prime" | "sandbox") => void;
  marketplace?: string;
  demoMode?: boolean;
  configured?: boolean;
};

export function CompareOffersModal({
  offers,
  onClose,
  onRent,
  marketplace,
  demoMode = false,
  configured = false,
}: Props) {
  if (offers.length < 2) return null;

  const rows: { label: string; value: (o: GpuOffer) => string }[] = [
    { label: "Provider", value: (o) => providerLabel(o.provider) },
    {
      label: "Price",
      value: (o) =>
        o.pricePerHour > 0 ? `${formatPrice(o.pricePerHour)}/hr` : "Quote",
    },
    {
      label: "Est. daily",
      value: (o) =>
        o.pricePerHour > 0 ? formatPrice(o.pricePerHour * 24) : "-",
    },
    { label: "Region", value: (o) => regionLabel(o.region) },
    { label: "Availability", value: (o) => stockLabel(o) },
    {
      label: "Billing type",
      value: (o) => (o.offerType || "on-demand").replace("-", " "),
    },
    {
      label: "Checkout",
      value: (o) =>
        o.integration === "integrated" ? "Olora checkout" : "External checkout",
    },
    {
      label: "GPU count",
      value: (o) => `${o.gpuCount}×`,
    },
    {
      label: "vCPU / RAM",
      value: (o) =>
        `${o.vcpu || "-"} / ${o.memoryGb ? `${o.memoryGb} GB` : "-"}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 sm:items-center sm:p-4">
      <div className="max-h-[100dvh] w-full max-w-4xl overflow-auto rounded-t-2xl border border-[var(--gd-border)] bg-[var(--gd-bg)] shadow-2xl sm:max-h-[90vh] sm:rounded-lg">
        <header className="sticky top-0 flex items-center justify-between border-b border-[var(--gd-border)] bg-[var(--gd-panel)] px-5 py-3">
          <h2 className="m-0 text-[15px] text-[var(--gd-text)]">Compare offers</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[18px] text-[var(--gd-muted)] hover:text-[var(--gd-text)]"
          >
            ×
          </button>
        </header>

        <div className="grid gap-3 p-4 md:hidden">
          {offers.map((o) => (
            <article key={o.id} className="rounded-xl border border-[var(--gd-border)] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={providerLogo(o.provider)} alt="" className="h-5 w-5 rounded-sm bg-white" />
                  <span className="truncate text-[14px] font-medium text-[var(--gd-text)]">{providerLabel(o.provider)}</span>
                </div>
                <span className="font-mono text-[15px] font-semibold tabular-nums text-[var(--gd-text)]">
                  {o.pricePerHour > 0 ? `${formatPrice(o.pricePerHour)}/hr` : "Quote"}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                {rows.slice(2).map((row) => (
                  <div key={row.label}>
                    <dt className="text-[var(--gd-muted)]">{row.label}</dt>
                    <dd className="m-0 capitalize text-[var(--gd-soft)]">{row.value(o)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3">
                {o.integration === "integrated" ? (
                  <button
                    type="button"
                    onClick={() => onRent(o, "prime")}
                    className="min-h-11 w-full rounded-full bg-[var(--hero)] text-[13px] font-medium text-[var(--hero-fg)]"
                  >
                    Rent on Olora →
                  </button>
                ) : (
                  <a
                    href={providerUrl(o.provider, marketplace)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center justify-center rounded-lg border border-[var(--gd-border)] text-[13px] text-[var(--gd-soft)]"
                  >
                    View provider →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto p-4 md:block">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
            <thead>
              <tr>
                <th className="border-b border-[var(--gd-border)] p-2 text-[10px] uppercase tracking-wide text-[var(--gd-muted)]">
                  Spec
                </th>
                {offers.map((o) => (
                  <th
                    key={o.id}
                    className="border-b border-[var(--gd-border)] p-2 text-[var(--gd-text)]"
                  >
                    <div className="flex items-center gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={providerLogo(o.provider)} alt="" className="h-4 w-4" />
                      {providerLabel(o.provider)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="border-b border-[var(--gd-border)]/60 p-2 text-[var(--gd-muted)]">
                    {row.label}
                  </td>
                  {offers.map((o) => (
                    <td
                      key={o.id}
                      className="border-b border-[var(--gd-border)]/60 p-2 capitalize text-[var(--gd-soft)]"
                    >
                      {row.value(o)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-2" />
                {offers.map((o) => (
                  <td key={o.id} className="p-2">
                    <div className="flex flex-col gap-1">
                      {o.integration === "integrated" ? (
                        <button
                          type="button"
                          onClick={() => onRent(o, "prime")}
                          className="rounded-full bg-[var(--hero)] px-2.5 py-1 text-[11px] font-medium text-[var(--hero-fg)]"
                        >
                          Rent on Olora →
                        </button>
                      ) : (
                        <a
                          href={providerUrl(o.provider, marketplace)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-[var(--gd-border)] px-2.5 py-1 text-center text-[11px] text-[var(--gd-soft)]"
                        >
                          View provider →
                        </a>
                      )}
                      {canTrySandbox(o, { demoMode, configured }) ? (
                        <button
                          type="button"
                          onClick={() => onRent(o, "sandbox")}
                          className="text-[10px] text-[var(--gd-muted)] hover:underline"
                        >
                          Try sandbox
                        </button>
                      ) : null}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
