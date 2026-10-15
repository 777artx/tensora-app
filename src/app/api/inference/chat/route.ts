import { NextResponse } from "next/server";
import { checkWalletTokenAccess } from "@/lib/lab/token-access";
import { authenticateRequest, unauthorized, insufficientCredits } from "@/lib/lab/server-auth";
import { consumePlusMessage, debitCredits, recordUsage, getOrCreateAccount } from "@/lib/lab/account-store";
import { estimateCostFromUsage, getModelById } from "@/lib/lab/inference-catalog";
import { isDemoMode } from "@/lib/lab/app-mode";
import { checkAgentSpend, debitAgent, getOwnedAgent } from "@/lib/lab/agents";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENROUTER_API_KEY),
  });
}

export async function POST(req: Request) {
  const gatewayStarted = Date.now();

  const user = await authenticateRequest(req, { allowAgent: true });
  if (!user) return unauthorized("Sign in or provide a valid API key.");
  const agent = user.agentId ? await getOwnedAgent(user.userId, user.agentId) : null;
  if (user.agentId && !agent) return unauthorized("Agent not found.");

  let body: {
    model?: string;
    messages?: ChatMessage[];
    cost_tier?: string;
    preferred_model?: string;
    wallet?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const access = await checkWalletTokenAccess(String(body.wallet || "").trim());
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, minBalance: access.minBalance, balance: access.balance },
      { status: access.status }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const demo = isDemoMode();

  if (!apiKey) {
    if (demo) {
      const lastUser = [...(Array.isArray(body.messages) ? body.messages : [])]
        .reverse()
        .find((m) => m.role === "user");
      const prompt = String(lastUser?.content || "").slice(0, 280);
      const gatewayMs = Date.now() - gatewayStarted;
      await recordUsage(user.userId, {
        model: String(body.model || "demo"),
        cost: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        gatewayMs,
        kind: "inference",
      });
      return NextResponse.json({
        id: `chatcmpl_demo_${Date.now().toString(36)}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: body.model || "demo",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content:
                "Olora demo inference. OpenRouter is not configured.\n\n" +
                (prompt ? `You asked: “${prompt}”\n\n` : "") +
                "In production this routes across the Olora network and settles in USDC.",
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        demo: true,
        content:
          "Olora demo inference. OpenRouter is not configured.\n\n" +
          (prompt ? `You asked: “${prompt}”\n\n` : "") +
          "In production this routes across the Olora network and settles in USDC.",
        gatewayMs,
      });
    }
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  let model = String(body.model || "").trim();
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const costTier = String(body.cost_tier || "medium").trim().toLowerCase();
  const preferred = String(body.preferred_model || "").trim();

  if (!model) {
    return NextResponse.json({ error: "model is required." }, { status: 400 });
  }
  if (!messages.length) {
    return NextResponse.json({ error: "messages is required." }, { status: 400 });
  }

  // Soft preflight so we don't burn OpenRouter if the wallet is empty
  if (agent) {
    const promptChars = messages.reduce((s, m) => s + String(m?.content || "").length, 0);
    const estimate =
      estimateCostFromUsage(getModelById(preferred || model), {
        prompt_tokens: Math.ceil(promptChars / 4),
        completion_tokens: 1024,
      }) ?? 0.002;
    const gate = checkAgentSpend(agent, {
      kind: "inference",
      resource: preferred || model,
      estimateUsd: estimate,
    });
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.error, agentId: agent.id, credits: agent.credits },
        { status: gate.status }
      );
    }
  } else {
    const account = await getOrCreateAccount(user.userId);
    if (account.credits < 0.001 && !demo) {
      return insufficientCredits(account.credits);
    }
  }

  const referer = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const useAuto =
    model === "openrouter/auto" ||
    model === "gradient/auto" ||
    model === "olora/auto" ||
    model === "tensora/auto";
  if (useAuto) model = "openrouter/auto";

  const payloadBody: Record<string, unknown> = {
    model: useAuto && preferred ? preferred : model,
    messages,
    stream: false,
  };

  if (useAuto && !preferred) {
    payloadBody.model = "openrouter/auto";
    payloadBody.plugins = [{ id: "auto-router", cost_tier: costTier || "medium" }];
  } else if (useAuto && preferred) {
    payloadBody.model = preferred;
  }

  async function call(modelId: string, extra?: Record<string, unknown>) {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": referer,
        "X-Title": "Olora Lab",
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: false,
        ...extra,
      }),
    });
    const payload = await upstream.json().catch(() => null);
    return { upstream, payload };
  }

  let { upstream, payload } = await call(String(payloadBody.model), {
    ...(payloadBody.plugins ? { plugins: payloadBody.plugins } : {}),
  });

  if (!upstream.ok && useAuto && preferred) {
    const retry = await call("openrouter/auto", {
      plugins: [{ id: "auto-router", cost_tier: costTier || "medium" }],
    });
    upstream = retry.upstream;
    payload = retry.payload;
  }

  const gatewayMs = Date.now() - gatewayStarted;

  if (!upstream.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(
            (payload as { error?: { message?: string } }).error?.message ||
              "OpenRouter request failed."
          )
        : "OpenRouter request failed.";
    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  const content =
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { choices?: Array<{ message?: { content?: string } }> }).choices)
      ? (payload as { choices: Array<{ message?: { content?: string } }> }).choices[0]?.message
          ?.content || ""
      : "";

  const usedModel =
    payload && typeof payload === "object" && "model" in payload
      ? String((payload as { model?: string }).model || payloadBody.model)
      : String(payloadBody.model);

  const usageRaw =
    payload && typeof payload === "object" && "usage" in payload
      ? (
          payload as {
            usage?: {
              prompt_tokens?: number;
              completion_tokens?: number;
              total_tokens?: number;
              cost?: number;
            };
          }
        ).usage
      : undefined;

  const promptTokens = typeof usageRaw?.prompt_tokens === "number" ? usageRaw.prompt_tokens : 0;
  const completionTokens =
    typeof usageRaw?.completion_tokens === "number" ? usageRaw.completion_tokens : 0;
  const totalTokens =
    typeof usageRaw?.total_tokens === "number"
      ? usageRaw.total_tokens
      : promptTokens + completionTokens;

  let cost =
    typeof usageRaw?.cost === "number"
      ? usageRaw.cost
      : estimateCostFromUsage(getModelById(usedModel) || getModelById(model), {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
        }) || 0.002;

  // Apply a small floor so free/unknown models still debit something in live mode
  if (!Number.isFinite(cost) || cost < 0) cost = 0.001;
  cost = Math.round(cost * 1e6) / 1e6;

  const included = agent ? { included: false as const } : await consumePlusMessage(user.userId, usedModel);
  const debit = included.included
    ? { ok: true as const, credits: included.credits }
    : agent
      ? await debitAgent(agent.id, { kind: "inference", resource: usedModel, cost })
      : await debitCredits(user.userId, cost, {
          kind: "inference",
          description: `Inference · ${usedModel}`,
          resource: usedModel,
        });
  if (!debit.ok) {
    return insufficientCredits(debit.credits);
  }
  if (included.included) cost = 0;

  await recordUsage(user.userId, {
    model: usedModel,
    cost,
    promptTokens,
    completionTokens,
    totalTokens,
    gatewayMs,
    kind: "inference",
  });

  const usage = {
    prompt_tokens: promptTokens || undefined,
    completion_tokens: completionTokens || undefined,
    total_tokens: totalTokens || undefined,
    cost,
  };

  // OpenAI-compatible body (SDK / curl) + flat `content` for Lab UI
  return NextResponse.json({
    id: `chatcmpl_${Date.now().toString(36)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: usedModel,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost,
      included: included.included,
    },
    content,
    gatewayMs,
    credits: debit.credits,
  });
}
