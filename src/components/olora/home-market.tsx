import { ButtonLink } from "@/components/olora/primitives";
import { pct, usd } from "@/lib/olora/pricing";
import type { MarketQuote } from "@/lib/olora/hooks";

/** Section 5: today's real credit price from the order book, and one action. */
export function HomeMarket({ quote }: { quote: MarketQuote }) {
  const has = quote.loaded && quote.bestAsk != null && quote.discount > 0;
  const example = 50;
  return (
    <section
      aria-label="Credit marketplace"
      className="lab-dark overflow-hidden rounded-[var(--radius-lg)] bg-[var(--ink)] px-7 py-10 text-[var(--dark-fg)] md:px-12 md:py-14"
    >
      <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[460px]">
          <p className="m-0 text-[13px] font-medium text-[var(--dark-muted)]">Credit marketplace</p>
          <h2 className="m-0 mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[38px]">
            {has ? (
              <>
                $1 of AI credit for{" "}
                <span className="tabular-nums">{usd(quote.creditCost)}</span>.
              </>
            ) : (
              <>Buy and sell AI credits.</>
            )}
          </h2>
          <p className="m-0 mt-4 text-[15px] leading-relaxed text-[var(--dark-muted)]">
            {has
              ? `Today's best price is ${pct(quote.discount, 1)} below face value, fees included. Credits spend exactly like credits you top up.`
              : quote.loaded
                ? "No discounted credits are listed right now. You can still list your unused credits for sale."
                : "Loading today's price…"}
          </p>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          {has ? (
            <dl className="m-0 grid grid-cols-2 gap-x-8 text-[14px] md:text-right">
              <dt className="text-[var(--dark-muted)]">You get</dt>
              <dd className="m-0 font-semibold tabular-nums">{usd(example)}</dd>
              <dt className="text-[var(--dark-muted)]">You pay</dt>
              <dd className="m-0 font-semibold tabular-nums">{usd(example * quote.creditCost)}</dd>
            </dl>
          ) : null}
          <ButtonLink href="/lab/market" variant="inverse" size="lg">
            {has ? "Buy discounted credits" : "Open the Market"}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
