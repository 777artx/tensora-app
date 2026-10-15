import { NextResponse } from "next/server";
import {
  listLiquidity,
  listMarketTape,
  purchaseCredits,
  usageAnalytics,
  quotePurchase,
} from "@/lib/lab/account-store";
import { marketplacePlatformFeeBps } from "@/lib/lab/app-mode";
import { INFERENCE_CATALOG } from "@/lib/lab/inference-catalog";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";
import { buildOrderBook } from "@/lib/lab/order-book";

export const runtime = "nodejs";

function discountedPrice(list: number | null, discountBps: number) {
  if (list == null) return null;
  return Math.round(list * (1 - discountBps / 10000) * 1e6) / 1e6;
}

export async function GET(req: Request) {
  const { bands, totalAvailable, displayBands, bookDepthUsd, sellableCapUsd, gpuSubsidyUsd } =
    await listLiquidity();
  const tape = await listMarketTape();
  const orderBook = buildOrderBook(displayBands, { tape });
  const bestDiscount = bands.reduce((m, b) => Math.max(m, b.discountBps), 0);
  const models = INFERENCE_CATALOG.filter((m) => m.outputPerM != null)
    .slice(0, 24)
    .map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      listOutputPerM: m.outputPerM,
      tensoraOutputPerM: discountedPrice(m.outputPerM, bestDiscount),
      discountBps: bestDiscount,
    }));

  const user = await authenticateRequest(req);
  let analytics = null;
  if (user) {
    analytics = await usageAnalytics(user.userId);
  }

  const feeBps = marketplacePlatformFeeBps();
  const sampleFace = 50;
  const sampleBand = bands.find((b) => b.discountBps === bestDiscount) || bands[0];
  const sampleQuote = sampleBand
    ? quotePurchase(sampleFace, sampleBand.discountBps, feeBps, sampleBand.id)
    : null;

  return NextResponse.json({
    liquidity: {
      bands,
      totalAvailable,
      bookDepthUsd,
      sellableCapUsd,
      gpuSubsidyUsd,
    },
    orderBook,
    catalog: models,
    analytics,
    feeBps,
    sampleQuote,
    trust: [
      {
        title: "Straight relay",
        body: "Your request goes to the model you named. Nothing is swapped or downgraded.",
      },
      {
        title: "Provider’s own answer",
        body: "Responses carry the provider’s model name and id, so you can check.",
      },
      {
        title: "Prompts never stored",
        body: "Only model, tokens, cost and timing are kept. Never the text.",
      },
    ],
  });
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  if (user.method === "api_key") {
    return NextResponse.json(
      { error: "Use a signed-in session to purchase credits." },
      { status: 403 }
    );
  }

  let body: { faceValue?: number; bandId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const faceValue = Number(body.faceValue);
  if (!Number.isFinite(faceValue) || faceValue < 5) {
    return NextResponse.json(
      { error: "Minimum purchase is $5 in credits." },
      { status: 400 }
    );
  }
  if (faceValue > 10000) {
    return NextResponse.json({ error: "Maximum purchase is $10,000." }, { status: 400 });
  }

  const result = await purchaseCredits(user.userId, faceValue, body.bandId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, credits: result.credits, usdc: result.usdc },
      { status: 402 }
    );
  }

  return NextResponse.json({
    ok: true,
    quote: result.quote,
    credits: result.credits,
    usdc: result.usdc,
  });
}
