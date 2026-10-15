import { NextResponse } from "next/server";
import { track, type AnalyticsEvent } from "@/lib/analytics/store";

export const runtime = "nodejs";

/** Events a browser may report. Money events are counted server-side only. */
const CLIENT_EVENTS = new Set<AnalyticsEvent>(["pageview", "visit_landing", "wallet_connect", "card_declined"]);

const ALLOWED_ORIGINS = new Set([
  "https://olora.si",
  "https://www.olora.si",
  "https://app.olora.si",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://olora.si",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function POST(req: Request) {
  const headers = cors(req);
  const ua = req.headers.get("user-agent") || "";
  if (/bot|crawl|spider|slurp|preview|headless/i.test(ua)) return new NextResponse(null, { status: 204, headers });

  let body: { event?: string; visitor?: string; project?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400, headers });
  }
  const event = String(body.event || "") as AnalyticsEvent;
  if (!CLIENT_EVENTS.has(event)) return new NextResponse(null, { status: 400, headers });
  const visitor = typeof body.visitor === "string" ? body.visitor.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40) : undefined;
  await track({ event, visitor: visitor || undefined, project: "olora" });
  return new NextResponse(null, { status: 204, headers });
}
