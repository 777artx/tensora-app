import Link from "next/link";
import { curatedModels } from "@/lib/olora/models";
import { costPerMessage, usdSmall } from "@/lib/olora/pricing";
import { ProviderLogo, SectionHeader } from "@/components/olora/primitives";

/** Section 4: six leading models, plain-English strengths and a real per-message price. */
export function HomeModels({ creditCost }: { creditCost: number }) {
  const models = curatedModels().slice(0, 6);
  return (
    <section aria-labelledby="featured-models">
      <SectionHeader
        title={<span id="featured-models">Leading models, one app</span>}
        description="Switch any time. You pay per message, from one balance."
        action={
          <Link href="/lab/compare" className="text-[14px] text-[var(--muted)] hover:text-[var(--ink)]">
            Compare all →
          </Link>
        }
      />
      <ul className="m-0 grid list-none gap-x-10 p-0 md:grid-cols-2">
        {models.map((m) => {
          const per = costPerMessage(m.inputPerM, m.outputPerM);
          return (
            <li key={m.id} className="border-t border-[var(--hairline)]">
              <Link
                href={`/lab/chat?model=${encodeURIComponent(m.id)}`}
                className="group flex items-center gap-4 py-5"
              >
                <ProviderLogo provider={m.provider} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[15px] font-semibold text-[var(--ink)]">{m.name}</span>
                    <span className="shrink-0 text-[12px] text-[var(--silver)]">{m.providerName}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[14px] text-[var(--muted)]">{m.strength}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[14px] font-medium tabular-nums text-[var(--ink)]">
                    {per != null ? `~${usdSmall(per * creditCost)}` : "—"}
                  </span>
                  <span className="block text-[12px] text-[var(--silver)]">per message</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
