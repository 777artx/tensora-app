import { NextResponse } from "next/server";
import { cancelPlus, getSubscription, subscribePlus } from "@/lib/lab/account-store";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";
import { PLUS_MESSAGE_LIMIT, PLUS_PRICE_USD, PLANS, SUB_TIERS, tierById } from "@/lib/olora/plans";
import { trackSoon } from "@/lib/analytics/store";

export const runtime = "nodejs";

const CARD_DECLINED =
  "Card payments aren't available yet. Your card was not charged. Pay with crypto (USDC on Base or USDG on Robinhood Chain) instead.";

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  const base = { plans: PLANS, tiers: SUB_TIERS, priceUsd: PLUS_PRICE_USD, messageLimit: PLUS_MESSAGE_LIMIT };
  if (!user) return NextResponse.json({ ...base, state: null });
  const state = await getSubscription(user.userId);
  return NextResponse.json({ ...base, state });
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();

  let body: { action?: string; tier?: string; method?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body.action || "");
  if (action === "cancel") {
    const result = await cancelPlus(user.userId);
    if (!result.ok) return NextResponse.json({ error: result.error, state: result.state }, { status: 400 });
    return NextResponse.json({ state: result.state });
  }
  if (action !== "subscribe") return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const tier = tierById(body.tier || "plus");
  if (!tier) return NextResponse.json({ error: "Unknown package." }, { status: 400 });

  if (body.method === "card") {
    trackSoon("card_declined", tier.priceUsd);
    return NextResponse.json(
      { error: CARD_DECLINED, code: "card_declined", state: await getSubscription(user.userId) },
      { status: 402 }
    );
  }

  const result = await subscribePlus(user.userId, tier.id);
  if (!result.ok) return NextResponse.json({ error: result.error, state: result.state }, { status: 400 });
  return NextResponse.json({ state: result.state });
}
