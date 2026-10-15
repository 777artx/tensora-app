import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/lab/server-auth";
import { TOOL_CATALOG, isToolName } from "@/lib/lab/tools/catalog";
import { runMeteredTool, toolAuth } from "@/lib/lab/tools/meter";
import { TOOL_RUNNERS } from "@/lib/lab/tools/run";

export const runtime = "nodejs";
export const maxDuration = 30;

type Ctx = { params: Promise<{ tool: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { tool } = await ctx.params;
  if (!isToolName(tool)) {
    return NextResponse.json({ error: `Unknown tool. Try: ${Object.keys(TOOL_CATALOG).join(", ")}` }, { status: 404 });
  }
  const user = await toolAuth(req);
  if (!user) return unauthorized("Provide a tsk_ or tsa_ API key.");
  const input = ((await req.json().catch(() => ({}))) || {}) as Record<string, unknown>;
  return runMeteredTool(user, tool, TOOL_CATALOG[tool].priceUsd, () => TOOL_RUNNERS[tool](input));
}

export async function GET(_req: Request, ctx: Ctx) {
  const { tool } = await ctx.params;
  if (!isToolName(tool)) return NextResponse.json({ error: "Unknown tool." }, { status: 404 });
  return NextResponse.json({ tool, ...TOOL_CATALOG[tool], method: "POST" });
}
