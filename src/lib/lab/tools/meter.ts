import { NextResponse } from "next/server";
import { authenticateRequest, insufficientCredits, unauthorized, type AuthUser } from "@/lib/lab/server-auth";
import { debitCredits, getOrCreateAccount, recordUsage } from "@/lib/lab/account-store";
import { checkAgentSpend, debitAgent, getOwnedAgent } from "@/lib/lab/agents";

export class ToolError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

/**
 * Run a paid tool for the caller. Checks agent pause, allow list, and caps
 * first, runs the tool, and only charges when it succeeds.
 */
export async function runMeteredTool<T>(
  user: AuthUser,
  tool: string,
  priceUsd: number,
  fn: () => Promise<T>
): Promise<NextResponse> {
  const started = Date.now();
  const agent = user.agentId ? await getOwnedAgent(user.userId, user.agentId) : null;
  if (user.agentId && !agent) return unauthorized("Agent not found.");

  if (agent) {
    const gate = checkAgentSpend(agent, { kind: "tool", resource: tool, estimateUsd: priceUsd });
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error, agentId: agent.id, credits: agent.credits }, { status: gate.status });
    }
  } else {
    const account = await getOrCreateAccount(user.userId);
    if (account.credits < priceUsd) return insufficientCredits(account.credits);
  }

  let result: T;
  try {
    result = await fn();
  } catch (e) {
    const status = e instanceof ToolError ? e.status : 502;
    return NextResponse.json({ error: (e as Error).message || "Tool failed." }, { status });
  }

  const debit = agent
    ? await debitAgent(agent.id, { kind: "tool", resource: tool, cost: priceUsd })
    : await debitCredits(user.userId, priceUsd, {
        kind: "tool",
        description: `Tool · ${tool}`,
        resource: tool,
      });
  if (!debit.ok) return insufficientCredits(debit.credits);

  await recordUsage(user.userId, {
    model: `tool/${tool}`,
    cost: priceUsd,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    gatewayMs: Date.now() - started,
    kind: "other",
  });

  return NextResponse.json({ tool, cost: priceUsd, credits: debit.credits, result });
}

export async function toolAuth(req: Request) {
  return authenticateRequest(req, { allowAgent: true });
}
