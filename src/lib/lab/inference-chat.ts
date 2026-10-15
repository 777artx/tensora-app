import { labAuthHeaders } from "@/lib/lab/lab-fetch";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
  included?: boolean;
};

export type SendChatInput = {
  model: string;
  messages: ChatMessage[];
  cost_tier?: "low" | "medium" | "high";
  preferred_model?: string;
  getAccessToken?: () => Promise<string | null>;
};

export type SendChatResult = {
  content: string;
  model: string;
  usage?: ChatUsage;
  error?: string;
  demo?: boolean;
  latencyMs: number;
  gatewayMs?: number;
  minBalance?: number;
  balance?: number;
  credits?: number;
};

export function getWallet(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("gd-account");
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { wallet?: string };
    return String(parsed?.wallet || "").trim();
  } catch {
    return "";
  }
}

export function getInferenceWallet() {
  return getWallet();
}

export async function sendChat(input: SendChatInput): Promise<SendChatResult> {
  const started = performance.now();
  const wallet = getWallet();

  try {
    const headers = await labAuthHeaders(input.getAccessToken);
    const res = await fetch("/api/inference/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        wallet,
        ...(input.cost_tier ? { cost_tier: input.cost_tier } : {}),
        ...(input.preferred_model ? { preferred_model: input.preferred_model } : {}),
      }),
    });

    const latencyMs = Math.round(performance.now() - started);
    const data = (await res.json().catch(() => null)) as
      | {
          content?: string;
          model?: string;
          usage?: ChatUsage;
          error?: string;
          demo?: boolean;
          minBalance?: number;
          balance?: number;
          credits?: number;
          gatewayMs?: number;
          choices?: Array<{ message?: { content?: string } }>;
        }
      | null;

    if (!res.ok) {
      return {
        content: "",
        model: input.model,
        error: data?.error || `Request failed (${res.status})`,
        latencyMs,
        minBalance: data?.minBalance,
        balance: data?.balance ?? data?.credits,
        credits: data?.credits,
      };
    }

    const content = data?.content || data?.choices?.[0]?.message?.content || "";

    if (typeof data?.credits === "number") {
      try {
        localStorage.setItem("gd-credits", String(data.credits));
        window.dispatchEvent(new Event("tensora-credits-change"));
      } catch {
        /* ignore */
      }
    }

    return {
      content,
      model: data?.model || input.model,
      usage: data?.usage,
      demo: data?.demo,
      latencyMs,
      gatewayMs: data?.gatewayMs,
      credits: data?.credits,
    };
  } catch (err) {
    return {
      content: "",
      model: input.model,
      error: err instanceof Error ? err.message : "Network error",
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

export async function sendInferenceChat(opts: SendChatInput): Promise<SendChatResult> {
  return sendChat(opts);
}

export function hasApiKeys(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = JSON.parse(localStorage.getItem("gd-api-keys-v2") || "[]");
    return Array.isArray(raw) && raw.some((k: { revoked?: boolean }) => !k.revoked);
  } catch {
    return false;
  }
}
