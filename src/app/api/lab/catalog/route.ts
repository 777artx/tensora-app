import { NextResponse } from "next/server";
import { ENVIRONMENTS, MODELS } from "@/lib/lab/store";
import { getLeaderboard } from "@/lib/lab/leaderboard";

export const runtime = "nodejs";

export async function GET() {
  let leaderboard: unknown[] = [];
  try {
    const board = await getLeaderboard();
    leaderboard = board.rows;
  } catch {
    leaderboard = [];
  }
  return NextResponse.json({
    environments: ENVIRONMENTS,
    models: MODELS,
    leaderboard,
  });
}
