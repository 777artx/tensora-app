import type { BookLevel, BookSnapshot, BookTape } from "@/components/lab/credit-order-book";

/**
 * Local visual preview of a busy book. Dev only, and switchable off with
 * `NEXT_PUBLIC_LAB_MARKET_SIM=off` so the real ledger book can be inspected.
 * Never writes to the market ledger.
 */
export const SIM_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_LAB_MARKET_SIM !== "off";

/**
 * Trade-tape provenance. The public feed presents real ledger trades and the
 * launch print floor; local dev simulations and the legacy seed are never
 * presented as live.
 */
export type TapeKind = "real" | "floor" | "sim";

export function tapeKind(id: string): TapeKind {
  if (id.startsWith("live-")) return "sim";
  if (id.startsWith("tape_seed_")) return "floor";
  return "real";
}

const TICK = 0.0005;
const LEVELS = 16;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Skewed size: mostly small resting orders, a few large walls. */
function restingSize(depthIndex: number) {
  const base = Math.exp(rand(Math.log(6), Math.log(160)));
  const wall = Math.random() < 0.08 ? rand(250, 900) : 0;
  return round2(base * (1 + depthIndex * 0.06) + wall);
}

/** Trades: mostly $2–$5. */
function tradeSize() {
  return round2(rand(2, 5));
}

/** Trade gaps follow an exponential draw (bursty, like real flow), clamped to 3s–45s. */
export function waitForTrade() {
  const mean = 13_000;
  const draw = -Math.log(1 - Math.random()) * mean;
  return Math.round(Math.min(45_000, Math.max(3_000, draw)));
}

/** Order adds / cancels happen far more often than trades. */
export function waitForQuote() {
  return Math.round(rand(600, 2400));
}

export function sampleAddress(n: number) {
  const alphabet = "0123456789abcdef";
  let x = (n * 1103515245 + 12345) >>> 0;
  let body = "";
  for (let i = 0; i < 40; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const c = alphabet[x % alphabet.length];
    body += i % 3 === 0 ? c.toUpperCase() : c;
  }
  return `0x${body}`;
}

function level(side: "ask" | "bid", price: number, sizeUsd: number): BookLevel {
  return {
    id: `${side}-${price.toFixed(4)}`,
    price,
    discountBps: Math.max(0, Math.round((1 - price) * 10000)),
    sizeUsd,
    totalUsd: 0,
    bandId: "open",
    side,
  };
}

function finish(book: BookSnapshot, asksIn: BookLevel[], bidsIn: BookLevel[], tape = book.tape): BookSnapshot {
  const tidy = (levels: BookLevel[], side: "ask" | "bid") => {
    let run = 0;
    return levels
      .filter((l) => l.sizeUsd >= 0.5)
      .sort((a, b) => (side === "ask" ? a.price - b.price : b.price - a.price))
      .slice(0, LEVELS + 4)
      .map((l) => {
        const sizeUsd = round2(l.sizeUsd);
        run = round2(run + sizeUsd);
        return { ...l, sizeUsd, totalUsd: run };
      });
  };
  const asks = tidy(asksIn, "ask");
  const bids = tidy(bidsIn, "bid");
  const bestAsk = asks[0]?.price ?? null;
  const bestBid = bids[0]?.price ?? null;
  return {
    ...book,
    asks,
    bids,
    bestAsk,
    bestBid,
    mid: bestAsk != null && bestBid != null ? round4((bestAsk + bestBid) / 2) : bestAsk ?? bestBid,
    spread: bestAsk != null && bestBid != null ? round4(Math.max(0, bestAsk - bestBid)) : null,
    depthAsk: round2(asks.reduce((s, l) => s + l.sizeUsd, 0)),
    depthBid: round2(bids.reduce((s, l) => s + l.sizeUsd, 0)),
    tape: tape.slice(0, 30),
    updatedAt: new Date().toISOString(),
  };
}

/** Rebuild the visible book around the live top of book with dense, uneven levels. */
export function seedBook(book: BookSnapshot): BookSnapshot {
  const anchorAsk = book.bestAsk ?? 0.92;
  // A busy book has a tight spread: 2–4 ticks, not the house's wide default.
  const anchorBid = round4(anchorAsk - TICK * (2 + Math.floor(Math.random() * 3)));
  const asks: BookLevel[] = [];
  const bids: BookLevel[] = [];
  let pa = anchorAsk;
  let pb = anchorBid;
  for (let i = 0; i < LEVELS; i++) {
    asks.push(level("ask", round4(pa), restingSize(i)));
    bids.push(level("bid", round4(pb), restingSize(i)));
    pa += TICK * (Math.random() < 0.7 ? 1 : 2);
    pb -= TICK * (Math.random() < 0.7 ? 1 : 2);
  }
  const tape: BookTape[] = [];
  let age = 0;
  for (let i = 0; i < 14; i++) {
    age += waitForTrade();
    const buy = Math.random() < 0.55;
    tape.push({
      id: `live-${i + 1}`,
      at: new Date(Date.now() - age).toISOString(),
      price: round4(buy ? anchorAsk + (Math.random() < 0.2 ? TICK : 0) : anchorBid - (Math.random() < 0.2 ? TICK : 0)),
      sizeUsd: tradeSize(),
      side: buy ? "buy" : "sell",
    });
  }
  return finish(book, asks, bids, tape);
}

/** A maker adds, trims, or pulls an order. Most activity sits near the top. */
export function applyQuote(book: BookSnapshot): BookSnapshot {
  const side: "ask" | "bid" = Math.random() < 0.5 ? "ask" : "bid";
  const levels = (side === "ask" ? book.asks : book.bids).map((l) => ({ ...l }));
  if (!levels.length) return book;
  const reach = Math.min(levels.length - 1, Math.floor(Math.pow(Math.random(), 1.8) * levels.length));
  const r = Math.random();
  if (r < 0.45) {
    levels[reach].sizeUsd = round2(levels[reach].sizeUsd + restingSize(reach) * rand(0.1, 0.5));
  } else if (r < 0.8) {
    levels[reach].sizeUsd = round2(levels[reach].sizeUsd * rand(0.45, 0.9));
  } else if (r < 0.9 && levels.length > 6) {
    levels.splice(reach, 1);
  } else {
    // Fill a gap or improve the top by one tick (never cross the spread).
    const best = levels[0].price;
    const other = side === "ask" ? book.bestBid : book.bestAsk;
    const improve = side === "ask" ? round4(best - TICK) : round4(best + TICK);
    const crosses = other != null && (side === "ask" ? improve <= other : improve >= other);
    if (!crosses && Math.random() < 0.4) {
      levels.push(level(side, improve, restingSize(0)));
    } else {
      const far = levels[levels.length - 1].price;
      const p = side === "ask" ? round4(far + TICK) : round4(far - TICK);
      levels.push(level(side, p, restingSize(LEVELS)));
    }
  }
  return side === "ask" ? finish(book, levels, book.bids) : finish(book, book.asks, levels);
}

/** A $2–$5 market order hits the top level. If it empties, the next price becomes best. */
export function applyTrade(book: BookSnapshot, n: number): BookSnapshot {
  const buy = Math.random() < 0.55;
  const levels = (buy ? book.asks : book.bids).map((l) => ({ ...l }));
  if (!levels.length) return book;
  const top = levels[0];
  const size = Math.min(tradeSize(), top.sizeUsd);
  top.sizeUsd = round2(top.sizeUsd - size);
  const print: BookTape = {
    id: `live-${n}`,
    at: new Date().toISOString(),
    price: top.price,
    sizeUsd: size,
    side: buy ? "buy" : "sell",
  };
  const tape = [print, ...book.tape];
  return buy ? finish(book, levels, book.bids, tape) : finish(book, book.asks, levels, tape);
}
