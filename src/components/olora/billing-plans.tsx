import { PLANS, currentPlanName } from "@/lib/olora/plans";

/** Two plans side by side. The current plan is marked; unavailable plans say so plainly. */
export function BillingPlans() {
  const current = currentPlanName();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PLANS.map((p) => {
        const isCurrent = p.name === current;
        const dark = p.id === "plus";
        return (
          <section
            key={p.id}
            aria-label={p.name}
            className={`flex flex-col rounded-[var(--radius-lg)] p-7 md:p-8 ${
              dark ? "bg-white text-black" : "bg-[var(--surface)] shadow-[var(--shadow-1)] ring-1 ring-[var(--hairline)]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">{p.name}</h3>
              {isCurrent ? (
                <span className={`text-[12px] ${dark ? "text-black/55" : "text-[var(--muted)]"}`}>Your plan</span>
              ) : !p.available ? (
                <span className={`text-[12px] ${dark ? "text-black/55" : "text-[var(--muted)]"}`}>Coming soon</span>
              ) : null}
            </div>
            <p className="m-0 mt-6 flex items-baseline gap-2">
              <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{p.priceLabel}</span>
              <span className={`text-[14px] ${dark ? "text-black/55" : "text-[var(--muted)]"}`}>{p.cadence}</span>
            </p>
            <p className={`m-0 mt-4 text-[15px] leading-relaxed ${dark ? "text-black/80" : "text-[var(--graphite)]"}`}>{p.summary}</p>
            <ul className="m-0 mt-6 flex-1 list-none space-y-3 p-0">
              {p.includes.map((line) => (
                <li key={line} className="flex gap-3 text-[14px] leading-snug">
                  <svg viewBox="0 0 16 16" className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? "text-black" : "text-[var(--ink)]"}`} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className={dark ? "text-black/80" : "text-[var(--graphite)]"}>{line}</span>
                </li>
              ))}
            </ul>
            <p className={`m-0 mt-6 text-[12px] leading-relaxed ${dark ? "text-black/50" : "text-[var(--silver)]"}`}>{p.limitNote}</p>
            <div className="mt-6">
              {isCurrent ? (
                <a href="#add-funds" className={`inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium ${dark ? "bg-[var(--surface)] text-[var(--ink)]" : "bg-[var(--ink)] text-black hover:bg-white"}`}>
                  Add funds
                </a>
              ) : (
                <button
                  type="button"
                  disabled={!p.available}
                  className={`inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium disabled:opacity-50 ${dark ? "bg-[var(--surface)] text-[var(--ink)]" : "bg-[var(--ink)] text-black"}`}
                >
                  {p.available ? `Switch to ${p.name}` : "Not available yet"}
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
