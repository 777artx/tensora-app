import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/lab/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("refresh") === "1";
    const data = await getLeaderboard(force);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Leaderboard unavailable" },
      { status: 502 }
    );
  }
}
