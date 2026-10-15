import { NextResponse } from "next/server";
import { createApiKey, getAccountSnapshot, revokeApiKey } from "@/lib/lab/account-store";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  if (user.method === "api_key") {
    return NextResponse.json({ error: "Use a Privy session to manage keys." }, { status: 403 });
  }
  const snap = await getAccountSnapshot(user.userId);
  return NextResponse.json({ keys: snap.keys });
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  if (user.method === "api_key") {
    return NextResponse.json({ error: "Use a Privy session to create keys." }, { status: 403 });
  }

  let body: { name?: string; projectId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const created = await createApiKey(
    user.userId,
    String(body.name || "Default"),
    String(body.projectId || "default")
  );
  return NextResponse.json({
    secret: created.secret,
    key: created.key,
  });
}

export async function DELETE(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  if (user.method === "api_key") {
    return NextResponse.json({ error: "Use a Privy session to revoke keys." }, { status: 403 });
  }

  const url = new URL(req.url);
  const keyId = url.searchParams.get("id") || "";
  if (!keyId) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  try {
    const snap = await revokeApiKey(user.userId, keyId);
    return NextResponse.json({ keys: snap.keys });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Revoke failed" },
      { status: 404 }
    );
  }
}
