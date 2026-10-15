import { NextResponse } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";
import {
  deleteAgent,
  getOwnedAgent,
  rotateAgentKey,
  toPublic,
  transferAgentCredits,
  updateAgent,
} from "@/lib/lab/agents";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const agent = await getOwnedAgent(user.userId, id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  return NextResponse.json({ agent: toPublic(agent) });
}

/**
 * Owner actions. Body `action`:
 *  - "update": name, dailyCapUsd, perCallCapUsd, allowedModels, allowedTools, paused
 *  - "fund" / "drain": amountUsd
 *  - "rotate-key"
 */
export async function POST(req: Request, ctx: Ctx) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  if (user.method === "api_key") {
    return NextResponse.json({ error: "Manage agents from the Lab." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "update");
  try {
    if (action === "fund" || action === "drain") {
      const amt = Math.abs(Number(body.amountUsd) || 0);
      const res = await transferAgentCredits(user.userId, id, action === "fund" ? amt : -amt);
      return NextResponse.json(res);
    }
    if (action === "rotate-key") {
      return NextResponse.json(await rotateAgentKey(user.userId, id));
    }
    const agent = await updateAgent(user.userId, id, body as Parameters<typeof updateAgent>[2]);
    return NextResponse.json({ agent });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  if (user.method === "api_key") {
    return NextResponse.json({ error: "Manage agents from the Lab." }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await deleteAgent(user.userId, id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
