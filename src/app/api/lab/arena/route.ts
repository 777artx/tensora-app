import { NextResponse } from "next/server";
import { debitCredits, getOrCreateAccount, recordUsage } from "@/lib/lab/account-store";
import { authenticateRequest, insufficientCredits, unauthorized } from "@/lib/lab/server-auth";

export const runtime = "nodejs";

type Body = {
  prompt?: string;
  modelA?: string;
  modelB?: string;
};

const ARENA_MODELS: Record<string, string> = {
  "gpt-4.1": "openai/gpt-4.1",
  "claude-opus-5": "anthropic/claude-opus-5",
  "gemini-3.6-flash": "google/gemini-3.6-flash",
  "deepseek-r1": "deepseek/deepseek-r1",
  qwen3: "qwen/qwen3.8-2.4t-a95b",
  "llama-4": "meta-llama/llama-4-maverick",
};

async function openRouterComplete(model: string, prompt: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false as const, error: "OPENROUTER_API_KEY is not configured." };
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Olora Arena",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: "You are competing in a blind model arena. Be helpful, correct, and concise.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const data = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
    usage?: { cost?: number; prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    model?: string;
  } | null;
  if (!res.ok) {
    return { ok: false as const, error: data?.error?.message || `Model request failed (${res.status}).` };
  }
  const content = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!content) return { ok: false as const, error: "The model returned an empty answer." };
  return { ok: true as const, content, model: data?.model || model, usage: data?.usage };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const prompt = String(body.prompt || "").trim();
    const modelA = ARENA_MODELS[String(body.modelA || "")] || String(body.modelA || "");
    const modelB = ARENA_MODELS[String(body.modelB || "")] || String(body.modelB || "");
    if (!prompt) {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }
    if (!modelA || !modelB || modelA === modelB) {
      return NextResponse.json({ error: "Pick two different models." }, { status: 400 });
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Arena inference is not configured." }, { status: 503 });
    }

    const user = await authenticateRequest(req);
    if (!user) return unauthorized("Sign in to run the arena. Each round is billed to your credits.");
    const account = await getOrCreateAccount(user.userId);
    if (account.credits < 0.02) return insufficientCredits(account.credits);

    const [a, b] = await Promise.all([openRouterComplete(modelA, prompt), openRouterComplete(modelB, prompt)]);
    if (!a.ok || !b.ok) {
      return NextResponse.json(
        { error: (!a.ok && a.error) || (!b.ok && b.error) || "Arena failed" },
        { status: 502 }
      );
    }

    const cost = Math.max(0.001, Math.round(((a.usage?.cost || 0) + (b.usage?.cost || 0)) * 1e6) / 1e6);
    const debit = await debitCredits(user.userId, cost, {
      kind: "inference",
      description: `Arena · ${a.model} vs ${b.model}`,
      resource: "arena",
    });
    if (!debit.ok) return insufficientCredits(debit.credits);

    await recordUsage(user.userId, {
      model: `${a.model} vs ${b.model}`,
      cost,
      promptTokens: (a.usage?.prompt_tokens || 0) + (b.usage?.prompt_tokens || 0),
      completionTokens: (a.usage?.completion_tokens || 0) + (b.usage?.completion_tokens || 0),
      totalTokens: (a.usage?.total_tokens || 0) + (b.usage?.total_tokens || 0),
      gatewayMs: 0,
      kind: "inference",
    });

    return NextResponse.json({
      prompt,
      modelA: a.model,
      modelB: b.model,
      responseA: a.content,
      responseB: b.content,
      live: true,
      cost,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Arena failed" },
      { status: 500 }
    );
  }
}
