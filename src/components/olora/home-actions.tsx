import Link from "next/link";
import { Icon, type IconName } from "@/components/olora/nav";

const ACTIONS: { href: string; icon: IconName; title: string; body: string }[] = [
  {
    href: "/lab/chat",
    icon: "chat",
    title: "Use AI",
    body: "Claude, GPT, Gemini and more in one place. No juggling subscriptions.",
  },
  {
    href: "/lab/compare",
    icon: "compare",
    title: "Compare prices",
    body: "See what each model costs and pick the best value for the job.",
  },
  {
    href: "/lab/market",
    icon: "market",
    title: "Trade credits",
    body: "Buy credits below face value, or sell the ones you won't use.",
  },
];

/** Section 2: three things you can do. One line each, benefit first. */
export function HomeActions() {
  return (
    <section aria-label="What you can do" className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] bg-[var(--hairline)] ring-1 ring-[var(--hairline)] md:grid-cols-3">
      {ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group flex flex-col bg-[var(--surface)] p-6 transition-colors hover:bg-[var(--cloud)] md:p-7"
        >
          <Icon name={a.icon} size={22} className="text-[var(--ink)]" />
          <span className="mt-6 flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
            {a.title}
            <span aria-hidden className="text-[var(--silver)] transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </span>
          <span className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{a.body}</span>
        </Link>
      ))}
    </section>
  );
}
