import { NextResponse } from "next/server";
import { listEvaluations } from "@/lib/lab/store";

export const runtime = "nodejs";

export async function GET() {
  const evaluations = await listEvaluations();
  return NextResponse.json({ evaluations });
}

export async function POST() {
  return NextResponse.json(
    { error: "Evaluations are not available yet. This API will not invent scores." },
    { status: 503 }
  );
}
