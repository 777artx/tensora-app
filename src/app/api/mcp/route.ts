import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/lab/server-auth";
import { getOrCreateAccount } from "@/lib/lab/account-store";
import { getOwnedAgent } from "@/lib/lab/agents";
import { TOOL_CATALOG, isToolName } from "@/lib/lab/tools/catalog";
import { runMeteredTool } from "@/lib/lab/tools/meter";
import { TOOL_RUNNERS } from "@/lib/lab/tools/run";
import { POST as chatPOST } from "@/app/api/inference/chat/route";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROTOCOL = "2025-06-18";

type RpcReq = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const TOOL_SCHEMAS: Record<string, Record<string, unknown>> = {
  search: { query: { type: "string" }, limit: { type: "number" } },
  scrape: { url: { type: "string" }, maxChars: { type: "number" } },
  social: { query: { type: "string" }, limit: { type: "number" } },
  onchain: {
    action: { type: "string", enum: ["balance", "tx", "price"] },
    chain: { type: "string", enum: ["base", "robinhood", "solana"] },
    address: { type: "string" },
    token: { type: "string" },
    hash: { type: "string" },
  },
  post: { webhookUrl: { type: "string" }, text: { type: "string" } },
};
const REQUIRED: Record<string, string[]> = {
  search: ["query"],
  scrape: ["url"],
  social: ["query"],
  onchain: ["action"],
  post: ["webhookUrl", "text"],
};

function toolList() {
  return [
    {
      name: "tensora_chat",
      description: "Run a chat completion on any Olora model. Billed from credits. Use model olora/auto to route automatically.",
      inputSchema: {
        type: "object",
        properties: {
          model: { type: "string", default: "olora/auto" },
          prompt: { type: "string" },
          system: { type: "string" },
        },
        required: ["prompt"],
      },
    },
    {
      name: "tensora_balance",
      description: "Show remaining credits, and caps when called with an agent key.",
      inputSchema: { type: "object", properties: {} },
    },
    ...Object.entries(TOOL_CATALOG).map(([name, t]) => ({
      name: `tensora_${name}`,
      description: `${t.summary} Costs $${t.priceUsd.toFixed(2)} per call.`,
      inputSchema: { type: "object", properties: TOOL_SCHEMAS[name], required: REQUIRED[name] },
    })),
  ];
}

const ok = (id: RpcReq["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: RpcReq["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const text = (value: unknown, isError = false) => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
  isError,
});

async function callTool(req: Request, name: string, args: Record<string, unknown>) {
  const user = await authenticateRequest(req, { allowAgent: true });
  if (!user) return text("Unauthorized. Add a tsk_ or tsa_ key as a Bearer token.", true);

  if (name === "tensora_balance") {
    if (user.agentId) {
      const a = await getOwnedAgent(user.userId, user.agentId);
      if (!a) return text("Agent not found.", true);
      return text({ agent: a.name, credits: a.credits, dailyCapUsd: a.dailyCapUsd, perCallCapUsd: a.perCallCapUsd, paused: a.paused });
    }
    const acct = await getOrCreateAccount(user.userId);
    return text({ credits: acct.credits });
  }

  if (name === "tensora_chat") {
    const messages = [
      ...(args.system ? [{ role: "system", content: String(args.system) }] : []),
      { role: "user", content: String(args.prompt || "") },
    ];
    const inner = new Request(new URL("/api/inference/chat", req.url), {
      method: "POST",
      headers: { authorization: req.headers.get("authorization") || "", "content-type": "application/json" },
      body: JSON.stringify({ model: String(args.model || "olora/auto"), messages }),
    });
    const res = await chatPOST(inner);
    const data = (await res.json().catch(() => ({}))) as { content?: string; error?: string; model?: string; usage?: { cost?: number }; credits?: number };
    if (!res.ok) return text(data.error || `Inference failed (${res.status}).`, true);
    return text(`${data.content || ""}\n\n[model ${data.model} · cost $${(data.usage?.cost ?? 0).toFixed(4)} · credits left $${(data.credits ?? 0).toFixed(2)}]`);
  }

  const short = name.replace(/^tensora_/, "");
  if (!isToolName(short)) return text(`Unknown tool ${name}.`, true);
  const res = await runMeteredTool(user, short, TOOL_CATALOG[short].priceUsd, () => TOOL_RUNNERS[short](args));
  const data = (await res.json()) as { error?: string };
  return text(data, !res.ok || Boolean(data.error));
}

async function handle(req: Request, msg: RpcReq) {
  switch (msg.method) {
    case "initialize":
      return ok(msg.id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "tensora", version: "1.0.0" },
        instructions: "Olora gives agents metered inference and tools paid from credits. Check tensora_balance before long jobs.",
      });
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, { tools: toolList() });
    case "tools/call": {
      const name = String(msg.params?.name || "");
      const args = (msg.params?.arguments || {}) as Record<string, unknown>;
      return ok(msg.id, await callTool(req, name, args));
    }
    default:
      return fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RpcReq | RpcReq[] | null;
  if (!body) return NextResponse.json(fail(null, -32700, "Parse error"), { status: 400 });
  const batch = Array.isArray(body) ? body : [body];
  const replies = [];
  for (const m of batch) {
    // Notifications (no id) get no reply.
    if (m.id === undefined || m.method?.startsWith("notifications/")) continue;
    replies.push(await handle(req, m));
  }
  if (replies.length === 0) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? replies : replies[0]);
}

export async function GET() {
  // No server-initiated stream; clients fall back to plain POST.
  return new NextResponse("Olora MCP. POST JSON-RPC here.", { status: 405, headers: { Allow: "POST" } });
}
