import { NextResponse } from "next/server";
import { TOOL_CATALOG } from "@/lib/lab/tools/catalog";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    tools: Object.entries(TOOL_CATALOG).map(([name, t]) => ({
      name,
      priceUsd: t.priceUsd,
      summary: t.summary,
      endpoint: `/api/v1/tools/${name}`,
    })),
  });
}
