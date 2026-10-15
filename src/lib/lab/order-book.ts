/** Build a secondary-market order book view from live liquidity bands. */

export type LiquidityBand = {
  id: string;
  discountBps: number;
  availableUsd: number;
};

export type OrderBookLevel = {
  id: string;
  /** Dollars paid per $1 face credit (before platform fee). */
  price: number;
  discountBps: number;
  sizeUsd: number;
  totalUsd: number;
  bandId: string;
  side: "ask" | "bid";
};

export type OrderBookTape = {
  id: string;
  at: string;
  price: number;
  sizeUsd: number;
  side: "buy" | "sell";
};

export type OrderBookSnapshot = {
  pair: string;
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  mid: number | null;
  spread: number | null;
  bestAsk: number | null;
  bestBid: number | null;
  depthAsk: number;
  depthBid: number;
  tape: OrderBookTape[];
  updatedAt: string;
};

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Near-mid heavy weights with light jitter so sizes aren't round-number-only. */
function nearMidWeights(n: number): number[] {
  const raw = Array.from({ length: n }, (_, i) => {
    const decay = Math.exp(-i * 0.26);
    const jitter = 0.78 + ((i * 37 + 11) % 19) / 40;
    return decay * jitter;
  });
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map((w) => w / sum);
}

function splitUsdLadder(total: number, weights: number[]): number[] {
  const sizes: number[] = [];
  let rem = round2(total);
  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      sizes.push(Math.max(0, rem));
      break;
    }
    const raw = total * weights[i];
    let cents = Math.round(raw * 100);
    const mod = cents % 10;
    if (mod === 0 || mod === 5) cents += i % 2 === 0 ? 3 : -2;
    const size = round2(Math.min(rem, Math.max(0.01, cents / 100)));
    sizes.push(size);
    rem = round2(rem - size);
  }
  return sizes;
}

/** Deterministic split of a band into ask ladder levels. */
function splitAskBand(band: LiquidityBand): OrderBookLevel[] {
  const basePrice = 1 - band.discountBps / 10000;
  // Dense rung count scales with band size; tick steps widen away from mid.
  const ticks =
    band.discountBps >= 700 ? 5 : band.discountBps >= 400 ? 4 : 3;
  const step = band.discountBps >= 700 ? 0.0025 : 0.005;
  const weights = nearMidWeights(ticks);
  const sizes = splitUsdLadder(band.availableUsd, weights);
  const levels: OrderBookLevel[] = [];

  sizes.forEach((size, i) => {
    if (size <= 0) return;
    const price = round4(Math.min(1, Math.max(0.8, basePrice + step * i)));
    const discountBps = Math.max(0, Math.round((1 - price) * 10000));
    levels.push({
      id: `ask-${band.id}-${i}`,
      price,
      discountBps,
      sizeUsd: size,
      totalUsd: 0,
      bandId: band.id,
      side: "ask",
    });
  });

  return levels;
}

/**
 * Resting bids always sit under the best ask (positive spread ~1¢).
 * Display-only interest — does not change inventory.
 */
function buildBidsUnderAsk(
  bestAsk: number,
  askDepth: number,
  nearestBandId: string
): OrderBookLevel[] {
  const bidDepth = round2(askDepth * 0.55);
  const offsets = [0.01, 0.0125, 0.015, 0.0175, 0.02, 0.025, 0.0325, 0.04, 0.05, 0.065, 0.08];
  const weights = nearMidWeights(offsets.length);
  const sizes = splitUsdLadder(bidDepth, weights);
  const levels: OrderBookLevel[] = [];

  offsets.forEach((off, i) => {
    const size = sizes[i] ?? 0;
    if (size <= 0) return;
    const price = round4(bestAsk - off);
    if (price <= 0.75) return;
    levels.push({
      id: `bid-${i}`,
      price,
      discountBps: Math.max(0, Math.round((1 - price) * 10000)),
      sizeUsd: size,
      totalUsd: 0,
      bandId: nearestBandId,
      side: "bid",
    });
  });

  return levels;
}

function withCumulative(levels: OrderBookLevel[]): OrderBookLevel[] {
  let run = 0;
  return levels.map((l) => {
    run = round2(run + l.sizeUsd);
    return { ...l, totalUsd: run };
  });
}

/**
 * Asks = inventory for sale (real band depth).
 * Bids = resting buy interest under the best ask.
 */
export function buildOrderBook(
  bands: LiquidityBand[],
  opts?: { tape?: OrderBookTape[] }
): OrderBookSnapshot {
  const live = bands.filter((b) => b.availableUsd > 0);
  const askRaw = live
    .flatMap((b) => splitAskBand(b))
    .sort((a, b) => a.price - b.price);

  // Collapse identical prices (overlapping band ticks).
  const mergedAsks = new Map<number, OrderBookLevel>();
  for (const l of askRaw) {
    const cur = mergedAsks.get(l.price);
    if (cur) {
      cur.sizeUsd = round2(cur.sizeUsd + l.sizeUsd);
    } else {
      mergedAsks.set(l.price, { ...l });
    }
  }
  const asksAsc = withCumulative(
    [...mergedAsks.values()].sort((a, b) => a.price - b.price)
  );
  const bestAsk = asksAsc[0]?.price ?? null;
  const nearestBandId = asksAsc[0]?.bandId || live[0]?.id || "band-8";
  const askDepth = round2(asksAsc.reduce((s, l) => s + l.sizeUsd, 0));

  const bidRaw =
    bestAsk != null
      ? buildBidsUnderAsk(bestAsk, askDepth, nearestBandId).sort((a, b) => b.price - a.price)
      : [];
  const bidsDesc = withCumulative(bidRaw);

  const bestBid = bidsDesc[0]?.price ?? null;
  const mid =
    bestAsk != null && bestBid != null
      ? round4((bestAsk + bestBid) / 2)
      : bestAsk ?? bestBid;
  const spread =
    bestAsk != null && bestBid != null ? round4(Math.max(0, bestAsk - bestBid)) : null;

  return {
    pair: "Credits · USDC",
    asks: asksAsc,
    bids: bidsDesc,
    mid,
    spread,
    bestAsk,
    bestBid,
    depthAsk: askDepth,
    depthBid: round2(bidsDesc.reduce((s, l) => s + l.sizeUsd, 0)),
    tape: opts?.tape || [],
    updatedAt: new Date().toISOString(),
  };
}

/** Recent marketplace fills for the trade tape (newest first). */
export function tapeFromHistory(
  rows: { id: string; date: string; kind: string; amount: string; description?: string }[],
  limit = 12
): OrderBookTape[] {
  const out: OrderBookTape[] = [];
  for (const row of rows) {
    if (out.length >= limit) break;
    const k = (row.kind || "").toLowerCase();
    if (!k.includes("marketplace") && !k.includes("purchase")) continue;
    const raw = Number(String(row.amount || "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(raw) || raw === 0) continue;
    out.push({
      id: row.id,
      at: row.date,
      price: 0.91,
      sizeUsd: Math.abs(raw),
      side: "buy",
    });
  }
  return out;
}
