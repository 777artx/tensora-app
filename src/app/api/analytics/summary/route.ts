import { NextResponse } from "next/server";
import { readDays, readMinutes } from "@/lib/analytics/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Agency-only read. Requires the x-olora-admin header to match ANALYTICS_ADMIN_KEY.
 * With no key configured it only answers in local dev.
 */
function allowed(req: Request) {
  const key = (process.env.ANALYTICS_ADMIN_KEY || "").trim();
  if (!key) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-olora-admin") === key;
}

export async function GET(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: "Admin key required." }, { status: 401 });
  const url = new URL(req.url);
  const project = url.searchParams.get("project") || "olora";
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const launchAt = Number(url.searchParams.get("launchAt") || 0);

  const [daily, firstWindow] = await Promise.all([
    readDays(project, days),
    launchAt > 0 && Date.now() - launchAt < 3 * 86400000 ? readMinutes(project, launchAt, 15) : Promise.resolve(null),
  ]);
  return NextResponse.json({ project, daily, firstWindow }, { headers: { "Cache-Control": "no-store" } });
}
