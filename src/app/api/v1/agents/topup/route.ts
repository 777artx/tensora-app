import { NextResponse } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";
import { placeMarketOrder } from "@/lib/lab/account-store";
import { getOwnedAgent, ownerTopUpsToday, toPublic, transferAgentCredits } from "@/lib/lab/agents";

export const runtime = "nodejs";

/**
 * One call for an agent to refill itself: market-buy credits on the order book
 * with the owner's balance (at the book discount) and move them to the agent.
 * Only works when the owner set a top-up cap (topUpCapUsd) on the agent.
 *
 * POST { amountUsd: 5 }  with Authorization: Bearer tsa_…
 */
export async function POST(req: Request) {
  const user = await authenticateRequest(req, { allowAgent: true });
  if (!user?.agentId) return unauthorized("Use an agent key (tsa_). For wallet payments use /api/v1/topup/x402.");
  const agent = await getOwnedAgent(user.userId, user.agentId);
  if (!agent) return unauthorized("Agent not found.");
  if (agent.paused) return NextResponse.json({ error: "This agent is paused by its owner." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { amountUsd?: number };
  const amount = Math.round(Math.max(0, Number(body.amountUsd) || 0) * 100) / 100;
  if (amount <= 0) return NextResponse.json({ error: "amountUsd is required." }, { status: 400 });

  const cap = agent.topUpCapUsd ?? 0;
  if (cap <= 0) {
    return NextResponse.json(
      { error: "Self top-up is off. The owner can set a daily top-up cap on the agent page, or pay with x402.", x402: "/api/v1/topup/x402" },
      { status: 403 }
    );
  }
  const used = ownerTopUpsToday(agent);
  if (used + amount > cap) {
    return NextResponse.json(
      { error: `Top-up cap is $${cap.toFixed(2)}/day and $${used.toFixed(2)} is used.`, remainingUsd: Math.max(0, cap - used) },
      { status: 402 }
    );
  }

  const order = await placeMarketOrder(user.userId, { side: "buy", sizeUsd: amount, type: "market" });
  if (!order.ok) return NextResponse.json({ error: `Owner balance could not cover it: ${order.error}` }, { status: 402 });
  if (order.filledUsd <= 0) return NextResponse.json({ error: "No liquidity on the book right now." }, { status: 409 });

  const moved = await transferAgentCredits(user.userId, agent.id, order.filledUsd, {
    label: `order book @ ${order.avgPrice?.toFixed(4) ?? "?"}`,
  });
  return NextResponse.json({
    filledUsd: order.filledUsd,
    paidUsd: Math.round((order.notionalUsd + order.feeUsd) * 100) / 100,
    avgPrice: order.avgPrice,
    agent: toPublic((await getOwnedAgent(user.userId, agent.id)) || agent),
    credits: moved.agent.credits,
  });
}
