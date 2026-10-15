import { NextResponse } from "next/server";
import { listInstances, patchInstance, type ServerGpuInstance } from "@/lib/lab/account-store";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";

export const runtime = "nodejs";

const PRIME = "https://api.primeintellect.ai/api/v1/pods";

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized("Sign in to see your instances.");
  const rows = await listInstances(user.userId);
  const apiKey = process.env.PRIME_INTELLECT_API_KEY;
  const refreshed = apiKey
    ? await Promise.all(rows.slice(0, 20).map((row) => refreshStatus(apiKey, user.userId, row)))
    : rows;
  return NextResponse.json({ instances: refreshed });
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized("Sign in to manage instances.");

  let body: { action?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = String(body.id || "").trim();
  if (!id || body.action !== "stop") {
    return NextResponse.json({ error: "action must be stop, with an instance id." }, { status: 400 });
  }

  const rows = await listInstances(user.userId);
  const row = rows.find((i) => i.id === id);
  if (!row) return NextResponse.json({ error: "Instance not found." }, { status: 404 });

  if (!row.sandbox && row.primePodId) {
    const apiKey = process.env.PRIME_INTELLECT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GPU provider is not configured." }, { status: 503 });
    }
    const res = await fetch(`${PRIME}/${encodeURIComponent(row.primePodId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!res.ok && res.status !== 404) {
      const data = await res.json().catch(() => null);
      const message =
        data && typeof data === "object"
          ? String((data as { detail?: string; error?: string }).detail || (data as { error?: string }).error || "")
          : "";
      return NextResponse.json(
        { error: message || `Could not stop the instance (${res.status}).` },
        { status: 502 }
      );
    }
  }

  const updated = await patchInstance(user.userId, id, { status: "STOPPED" });
  return NextResponse.json({ ok: true, instance: updated });
}

async function refreshStatus(apiKey: string, userId: string, row: ServerGpuInstance) {
  if (row.sandbox || !row.primePodId) return row;
  if (row.status === "STOPPED" || row.status === "TERMINATED") return row;
  try {
    const res = await fetch(`${PRIME}/${encodeURIComponent(row.primePodId)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return row;
    const data = (await res.json()) as { status?: string };
    const status = String(data.status || "").toUpperCase();
    if (!status || status === row.status) return row;
    return (await patchInstance(userId, row.id, { status })) || { ...row, status };
  } catch {
    return row;
  }
}
