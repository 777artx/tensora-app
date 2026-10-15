import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { allowDemoAuth, isLiveMode } from "@/lib/lab/app-mode";
import { resolveUserIdFromApiKey } from "@/lib/lab/account-store";
import { resolveAgentFromKey } from "@/lib/lab/agents";

export type AuthUser = {
  userId: string;
  method: "privy" | "api_key" | "agent_key" | "demo";
  wallet?: string;
  /** Set when the caller is an agent (tsa_ key). userId is then the owner. */
  agentId?: string;
};

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || "").trim();
  const secret = (process.env.PRIVY_APP_SECRET || "").trim();
  if (!appId || !secret) return null;
  if (!privyClient) {
    privyClient = new PrivyClient(appId, secret);
  }
  return privyClient;
}

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * Resolve the caller from Privy access token, Lab API key (tsk_…), or demo header.
 * Fail closed in live mode when nothing verifies.
 */
export async function authenticateRequest(
  req: Request,
  opts: { allowAgent?: boolean } = {}
): Promise<AuthUser | null> {
  const token = bearerToken(req);

  if (token?.startsWith("tsa_")) {
    // Agent keys only work on routes that opt in (inference, tools, top-up, MCP).
    if (!opts.allowAgent) return null;
    const agent = await resolveAgentFromKey(token);
    if (agent) return { userId: agent.ownerUserId, method: "agent_key", agentId: agent.id };
    return null;
  }

  if (token?.startsWith("tsk_")) {
    const userId = await resolveUserIdFromApiKey(token);
    if (userId) return { userId, method: "api_key" };
    return null;
  }

  if (token) {
    const client = getPrivyClient();
    if (client) {
      try {
        const claims = await client.verifyAuthToken(token);
        if (claims?.userId) {
          return { userId: claims.userId, method: "privy" };
        }
      } catch {
        /* fall through */
      }
    }
  }

  // Demo-only escape hatch for local UI without Privy.
  if (allowDemoAuth() || (!isLiveMode() && process.env.NODE_ENV !== "production")) {
    const demoUser = (req.headers.get("x-tensora-user-id") || "").trim();
    if (demoUser) {
      return { userId: demoUser, method: "demo" };
    }
    // Unsigned demo session from mirrored privyId
    const demoPrivy = (req.headers.get("x-tensora-demo") || "").trim();
    if (demoPrivy === "1" || demoPrivy === "true") {
      return { userId: "demo", method: "demo" };
    }
  }

  return null;
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function insufficientCredits(credits: number) {
  return NextResponse.json(
    { error: "Insufficient credits.", credits },
    { status: 402 }
  );
}
