import { NextResponse } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";
import { createAgent, listAgents } from "@/lib/lab/agents";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  return NextResponse.json({ agents: await listAgents(user.userId) });
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  if (user.method === "api_key") {
    return NextResponse.json({ error: "Create agents from the Lab, not with an API key." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const { agent, secret } = await createAgent(user.userId, body || {});
    return NextResponse.json({ agent, secret });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
