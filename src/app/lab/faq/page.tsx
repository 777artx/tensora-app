import type { Metadata } from "next";
import Link from "next/link";
import { LabChrome } from "@/components/lab/lab-chrome";
import { Page, PageHeader } from "@/components/olora/primitives";

export const metadata: Metadata = {
  title: "FAQ · Olora",
  description: "Answers about Olora: models, subscriptions, pay as you go, Olora Credits, the marketplace, and OLORA.",
};

type QA = { q: string; a: string };

const GROUPS: { title: string; items: QA[] }[] = [
  {
    title: "About Olora",
    items: [
      {
        q: "What is Olora?",
        a: "Olora is a consumer AI app for accessing leading frontier models in one place, with subscriptions, pay as you go, and a marketplace for AI credits.",
      },
      {
        q: "Which AI models can I use?",
        a: "Olora gives you access to leading AI models from multiple providers. We will continue adding new models as they become available.",
      },
      { q: "Is Olora still in beta?", a: "No. Olora has closed its beta and is now live." },
      { q: "What is the goal of Olora?", a: "Make frontier AI easier and cheaper for consumers to access." },
    ],
  },
  {
    title: "Subscriptions & balance",
    items: [
      {
        q: "How do subscriptions work?",
        a: "Olora offers three subscription options based on how much AI you use. Your plan includes monthly usage, and you can continue using your Olora balance if you need more.",
      },
      { q: "Do I need a subscription?", a: "No. You can use Olora entirely on a pay as you go basis." },
      {
        q: "What happens if I run out of subscription usage?",
        a: "You can continue using Olora with your balance rather than waiting for the next billing cycle.",
      },
      {
        q: "Can I use one balance across different models?",
        a: "Yes. Your Olora balance can be used across supported models without maintaining separate balances with each provider.",
      },
    ],
  },
  {
    title: "Credits & marketplace",
    items: [
      { q: "What are Olora Credits?", a: "Olora Credits are AI usage you can spend across supported models inside Olora." },
      { q: "How do I get Olora Credits?", a: "You can buy credits through the marketplace or earn them by holding OLORA." },
      {
        q: "What is the Olora Marketplace?",
        a: "The marketplace lets users buy AI credits at a discount and sell credits they no longer need.",
      },
      {
        q: "Why would I buy credits on the marketplace?",
        a: "Credits can trade below their usable value, giving buyers a cheaper way to access frontier AI.",
      },
      {
        q: "Can I sell unused credits?",
        a: "Yes. Instead of leaving unused credits sitting in your account, you can list them for sale on the marketplace.",
      },
      { q: "How are marketplace prices set?", a: "Prices are set by buyers and sellers through supply and demand." },
    ],
  },
  {
    title: "OLORA",
    items: [{ q: "What do I get for holding OLORA?", a: "OLORA holders earn AI credits that can be used inside the Olora app." }],
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: GROUPS.flatMap((g) => g.items).map((i) => ({
    "@type": "Question",
    name: i.q,
    acceptedAnswer: { "@type": "Answer", text: i.a },
  })),
};

export default function FaqPage() {
  return (
    <LabChrome active="faq" title="FAQ">
      <Page width="narrow">
        <PageHeader eyebrow="Help" title="Olora FAQ" lede="How Olora works: models, plans, credits and the marketplace." />

        <nav aria-label="FAQ sections" className="ol-rise -mt-4 mb-10 flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <a
              key={g.title}
              href={`#${slug(g.title)}`}
              className="inline-flex h-8 items-center rounded-full px-3.5 text-[13px] text-[var(--graphite)] ring-1 ring-[var(--hairline)] hover:bg-[var(--cloud)] hover:text-[var(--ink)]"
            >
              {g.title}
            </a>
          ))}
        </nav>

        {GROUPS.map((g) => (
          <section key={g.title} id={slug(g.title)} className="mb-12 scroll-mt-24">
            <h2 className="m-0 mb-2 text-[13px] font-medium text-[var(--muted)]">{g.title}</h2>
            <div>
              {g.items.map((i) => (
                <details key={i.q} className="group border-t border-[var(--hairline)] last:border-b">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                    <span>{i.q}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      aria-hidden
                      className="shrink-0 text-[var(--silver)] transition-transform duration-200 group-open:rotate-45 group-hover:text-[var(--ink)]"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  <p className="m-0 max-w-[600px] pb-6 pr-10 text-[15px] leading-relaxed text-[var(--muted)]">{i.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div className="mb-16 flex flex-col gap-4 rounded-[var(--radius-lg)] bg-[var(--cloud)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="m-0 text-[15px] text-[var(--ink)]">Still have a question?</p>
            <p className="m-0 mt-1 text-[14px] text-[var(--muted)]">
              Email{" "}
              <a href="mailto:support@olora.si" className="text-[var(--ink)] underline-offset-2 hover:underline">
                support@olora.si
              </a>{" "}
              or message{" "}
              <a href="https://x.com/useOlora" target="_blank" rel="noreferrer" className="text-[var(--ink)] underline-offset-2 hover:underline">
                @useOlora
              </a>
              .
            </p>
          </div>
          <Link
            href="/lab/subscribe"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ink)] px-4 text-[14px] font-medium text-[var(--paper)] hover:opacity-90"
          >
            See plans
          </Link>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Page>
    </LabChrome>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
