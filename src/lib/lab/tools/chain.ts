import { baseRpcUrl, robinhoodRpcUrl } from "@/lib/lab/deposit-verify";
import { ToolError } from "@/lib/lab/tools/meter";
import { safeFetch } from "@/lib/lab/tools/safe-fetch";

const EVM_ADDR = /^0x[a-fA-F0-9]{40}$/;
const EVM_TX = /^0x[a-fA-F0-9]{64}$/;
const SOL_ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function solanaRpcUrl() {
  return process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = (await res.json().catch(() => null)) as { result?: T; error?: { message?: string } } | null;
  if (!data || data.error) throw new ToolError(data?.error?.message || `RPC ${method} failed.`, 502);
  return data.result as T;
}

function evmRpc(chain: string) {
  if (chain === "base") return baseRpcUrl();
  if (chain === "robinhood") return robinhoodRpcUrl();
  throw new ToolError("chain must be base, robinhood, or solana.");
}

function units(raw: bigint, decimals: number) {
  const s = raw.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals) || "0";
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** Read-only chain data. action: balance | tx | price */
export async function toolOnchain(input: Record<string, unknown>) {
  const action = String(input.action || "balance");
  const chain = String(input.chain || "base").toLowerCase();

  if (action === "price") {
    const token = String(input.token || "").trim();
    if (!token) throw new ToolError("token (contract or mint address) is required.");
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(token)}`);
    const data = (await res.json().catch(() => null)) as {
      pairs?: { chainId: string; dexId: string; priceUsd?: string; liquidity?: { usd?: number }; baseToken: { symbol: string } }[];
    } | null;
    const pairs = (data?.pairs || []).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    if (!pairs[0]) throw new ToolError("No trading pair found for that token.", 404);
    const p = pairs[0];
    return { token, symbol: p.baseToken.symbol, priceUsd: Number(p.priceUsd || 0), chain: p.chainId, dex: p.dexId, liquidityUsd: p.liquidity?.usd || 0 };
  }

  if (action === "tx") {
    const hash = String(input.hash || "").trim();
    if (chain === "solana") {
      if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(hash)) throw new ToolError("Invalid Solana signature.");
      const st = await rpc<{ value: ({ confirmationStatus?: string; err: unknown } | null)[] }>(
        solanaRpcUrl(), "getSignatureStatuses", [[hash], { searchTransactionHistory: true }]
      );
      const s = st.value[0];
      return { chain, hash, found: Boolean(s), status: s ? (s.err ? "failed" : s.confirmationStatus || "processed") : "not_found" };
    }
    if (!EVM_TX.test(hash)) throw new ToolError("Invalid transaction hash.");
    const r = await rpc<{ status?: string; blockNumber?: string; from?: string; to?: string } | null>(
      evmRpc(chain), "eth_getTransactionReceipt", [hash]
    );
    return {
      chain,
      hash,
      found: Boolean(r),
      status: r ? (r.status === "0x1" ? "success" : "failed") : "pending_or_not_found",
      block: r?.blockNumber ? Number(BigInt(r.blockNumber)) : null,
      from: r?.from || null,
      to: r?.to || null,
    };
  }

  if (action === "balance") {
    const address = String(input.address || "").trim();
    const token = String(input.token || "").trim();
    if (chain === "solana") {
      if (!SOL_ADDR.test(address)) throw new ToolError("Invalid Solana address.");
      if (token) {
        if (!SOL_ADDR.test(token)) throw new ToolError("Invalid token mint.");
        const r = await rpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { uiAmountString: string } } } } } }[] }>(
          solanaRpcUrl(), "getTokenAccountsByOwner", [address, { mint: token }, { encoding: "jsonParsed" }]
        );
        const total = r.value.reduce((s, a) => s + Number(a.account.data.parsed.info.tokenAmount.uiAmountString || 0), 0);
        return { chain, address, token, balance: String(total) };
      }
      const r = await rpc<{ value: number }>(solanaRpcUrl(), "getBalance", [address]);
      return { chain, address, token: "SOL", balance: units(BigInt(r.value), 9) };
    }
    if (!EVM_ADDR.test(address)) throw new ToolError("Invalid address.");
    const url = evmRpc(chain);
    if (token) {
      if (!EVM_ADDR.test(token)) throw new ToolError("Invalid token address.");
      const data = `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}`;
      const [bal, dec] = await Promise.all([
        rpc<string>(url, "eth_call", [{ to: token, data }, "latest"]),
        rpc<string>(url, "eth_call", [{ to: token, data: "0x313ce567" }, "latest"]).catch(() => "0x12"),
      ]);
      return { chain, address, token, balance: units(BigInt(bal || "0x0"), Number(BigInt(dec || "0x12"))) };
    }
    const bal = await rpc<string>(url, "eth_getBalance", [address, "latest"]);
    return { chain, address, token: "ETH", balance: units(BigInt(bal), 18) };
  }

  throw new ToolError("action must be balance, tx, or price.");
}

/** Post a message to a webhook the caller controls. HTTPS and public hosts only. */
export async function toolPost(input: Record<string, unknown>) {
  const webhook = String(input.webhookUrl || input.url || "").trim();
  const text = String(input.text || input.message || "").slice(0, 4000);
  if (!webhook) throw new ToolError("webhookUrl is required.");
  if (!webhook.startsWith("https://")) throw new ToolError("webhookUrl must be https.");
  if (!text) throw new ToolError("text is required.");
  const body = /discord(app)?\.com\/api\/webhooks/.test(webhook) ? { content: text } : { text };
  let res;
  try {
    res = await safeFetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      maxBytes: 20_000,
    });
  } catch (e) {
    throw new ToolError((e as Error).message, 400);
  }
  if (res.status >= 400) throw new ToolError(`Webhook returned ${res.status}.`, 502);
  return { delivered: true, status: res.status };
}
