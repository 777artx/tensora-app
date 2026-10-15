import { NextResponse } from "next/server";
import {
  cancelMarketOrder,
  getAccountSnapshot,
  getMarketState,
  placeMarketOrder,
  type MarketOrderSide,
} from "@/lib/lab/account-store";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";
import { takerFeeMultiplierForUser } from "@/lib/lab/earn";

export const runtime = "nodejs";

/** Live credits/USDC order book. Public read; auth adds your orders + balances. */
export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  const state = await getMarketState(user?.userId);
  let balances: { credits: number; usdc: number } | null = null;
  let yourFeeBps = state.config.feeBps;
  let feeTierLabel: string | null = null;
  if (user) {
    const [snap, tier] = await Promise.all([
      getAccountSnapshot(user.userId),
      takerFeeMultiplierForUser(user.userId),
    ]);
    balances = { credits: snap.credits, usdc: snap.usdc };
    yourFeeBps = Math.round(state.config.feeBps * tier.multiplier);
    feeTierLabel = tier.tier?.label ?? null;
  }
  return NextResponse.json({ ...state, balances, yourFeeBps, feeTierLabel });
}

type PlaceBody = {
  action: "place";
  side: MarketOrderSide;
  sizeUsd: number;
  price?: number;
  type?: "limit" | "market";
};
type CancelBody = { action: "cancel"; orderId: string };

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();

  let body: PlaceBody | CancelBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action === "cancel") {
    if (!body.orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }
    const result = await cancelMarketOrder(user.userId, body.orderId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    const state = await getMarketState(user.userId);
    return NextResponse.json({ ok: true, credits: result.credits, usdc: result.usdc, ...state });
  }

  if (body.action === "place") {
    if (body.side !== "buy" && body.side !== "sell") {
      return NextResponse.json({ error: "side must be buy or sell." }, { status: 400 });
    }
    const tier = await takerFeeMultiplierForUser(user.userId);
    const baseFeeBps = Number(process.env.MARKET_TAKER_FEE_BPS || "100");
    const result = await placeMarketOrder(user.userId, {
      side: body.side,
      sizeUsd: Number(body.sizeUsd),
      price: body.price != null ? Number(body.price) : undefined,
      type: body.type,
      feeBpsOverride: Math.round(baseFeeBps * tier.multiplier),
    });
    if (!result.ok) {
      const insufficient = /need \$|deposit|you have/i.test(result.error);
      return NextResponse.json(
        { error: result.error, credits: result.credits, usdc: result.usdc },
        { status: insufficient ? 402 : 400 }
      );
    }
    const state = await getMarketState(user.userId);
    return NextResponse.json({ ok: true, result, ...state });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
