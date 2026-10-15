import { NextResponse } from "next/server";
import { listTraining } from "@/lib/lab/store";

export const runtime = "nodejs";

export async function GET() {
  const runs = await listTraining();
  return NextResponse.json({ runs });
}

export async function POST() {
  return NextResponse.json(
    { error: "Training is not available yet. This API will not start a simulated run." },
    { status: 503 }
  );
}
