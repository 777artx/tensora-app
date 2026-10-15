import { NextResponse } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";
import { claimOnChainDeposit, getOrCreateAccount } from "@/lib/lab/account-store";
import { claimPaymentTx, creditAgent, getOwnedAgent } from "@/lib/lab/agents";
import { treasuryAddress, verifyDeposit } from "@/lib/lab/deposit-verify";
import { SOLANA_USDC_MINT, solanaTreasury, verifySolanaUsdc } from "@/lib/lab/solana-verify";

export const runtime = "nodejs";
export const maxDuration = 30;

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const MIN_USD = 1;
const MAX_USD = 1000;

type Payment = {
  x402Version?: number;
  scheme?: string;
  network?: string;
  payload?: Record<string, unknown>;
  /** Olora extension: prove a transfer you already sent. */
  txHash?: string;
  signature?: string;
};

function amountFrom(req: Request) {
  const n = Number(new URL(req.url).searchParams.get("amountUsd") || 5);
  return Math.min(MAX_USD, Math.max(MIN_USD, Math.round((Number.isFinite(n) ? n : 5) * 100) / 100));
}

function challenge(req: Request, error?: string) {
  const amountUsd = amountFrom(req);
  const resource = new URL(req.url).toString();
  const atomic = String(Math.round(amountUsd * 1e6));
  const accepts: Record<string, unknown>[] = [
    {
      scheme: "exact",
      network: "base",
      maxAmountRequired: atomic,
      resource,
      description: `Olora credits: $${amountUsd.toFixed(2)}`,
      mimeType: "application/json",
      payTo: treasuryAddress(),
      maxTimeoutSeconds: 300,
      asset: BASE_USDC,
      extra: { name: "USD Coin", version: "2" },
    },
  ];
  if (solanaTreasury()) {
    accepts.push({
      scheme: "exact",
      network: "solana",
      maxAmountRequired: atomic,
      resource,
      description: `Olora credits: $${amountUsd.toFixed(2)}`,
      mimeType: "application/json",
      payTo: solanaTreasury(),
      maxTimeoutSeconds: 300,
      asset: SOLANA_USDC_MINT,
    });
  }
  return NextResponse.json(
    {
      x402Version: 1,
      error: error || "Payment required",
      accepts,
      tensora: {
        howTo:
          "Send an X-PAYMENT header. Either a standard x402 exact payload (base64 JSON), or base64 JSON {\"network\":\"base\",\"txHash\":\"0x…\"} / {\"network\":\"solana\",\"signature\":\"…\"} for a USDC transfer you already sent to payTo. Credits land on the calling key.",
      },
    },
    { status: 402 }
  );
}

function decodePayment(header: string): Payment | null {
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8")) as Payment;
  } catch {
    try {
      return JSON.parse(header) as Payment;
    } catch {
      return null;
    }
  }
}

/** Settle a signed x402 payload through a facilitator. Returns the onchain tx hash. */
async function settleWithFacilitator(req: Request, header: string, payment: Payment) {
  const url = process.env.X402_FACILITATOR_URL;
  if (!url) throw new Error("Signed x402 payloads need X402_FACILITATOR_URL. Send a txHash proof instead.");
  const reqs = ((await challenge(req).json()) as { accepts: Record<string, unknown>[] }).accepts.find(
    (a) => a.network === payment.network
  );
  if (!reqs) throw new Error("Unsupported network.");
  const body = JSON.stringify({ x402Version: 1, paymentHeader: header, paymentPayload: payment, paymentRequirements: reqs });
  const headers = { "Content-Type": "application/json" };
  const v = await fetch(`${url.replace(/\/$/, "")}/verify`, { method: "POST", headers, body });
  const vj = (await v.json().catch(() => ({}))) as { isValid?: boolean; invalidReason?: string };
  if (!v.ok || !vj.isValid) throw new Error(`Payment invalid: ${vj.invalidReason || v.status}`);
  const s = await fetch(`${url.replace(/\/$/, "")}/settle`, { method: "POST", headers, body });
  const sj = (await s.json().catch(() => ({}))) as { success?: boolean; transaction?: string; txHash?: string; errorReason?: string };
  const tx = sj.transaction || sj.txHash;
  if (!s.ok || !sj.success || !tx) throw new Error(`Settlement failed: ${sj.errorReason || s.status}`);
  return { txHash: tx, amountUsd: Number(reqs.maxAmountRequired) / 1e6, network: String(payment.network) };
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req, { allowAgent: true });
  if (!user) return unauthorized("Provide a tsa_ or tsk_ key so we know where to put the credits.");

  const header = req.headers.get("x-payment");
  if (!header) return challenge(req);
  const payment = decodePayment(header);
  if (!payment) return challenge(req, "Could not read X-PAYMENT.");

  let paid: { txHash: string; amountUsd: number; network: string; from?: string };
  try {
    if (payment.txHash) {
      const v = await verifyDeposit({ txHash: payment.txHash, method: "usdc" });
      paid = { txHash: v.txHash, amountUsd: v.amountUsd, network: "base", from: v.from };
    } else if (payment.signature) {
      const v = await verifySolanaUsdc(payment.signature);
      paid = { txHash: `sol:${v.signature}`, amountUsd: v.amountUsd, network: "solana" };
    } else {
      paid = await settleWithFacilitator(req, header, payment);
    }
  } catch (e) {
    return challenge(req, (e as Error).message);
  }
  if (paid.amountUsd < MIN_USD) return challenge(req, `Minimum top-up is $${MIN_USD}.`);

  try {
    if (user.agentId) {
      const agent = await getOwnedAgent(user.userId, user.agentId);
      if (!agent) return unauthorized("Agent not found.");
      if (!(await claimPaymentTx(paid.txHash, user.userId, paid.amountUsd))) {
        return challenge(req, "This payment was already used.");
      }
      const updated = await creditAgent(agent.id, paid.amountUsd, `x402 ${paid.network}`);
      return x402Ok({ credited: paid.amountUsd, credits: updated.credits, agentId: agent.id, tx: paid.txHash }, paid);
    }
    await claimOnChainDeposit(user.userId, {
      method: "usdc",
      amountUsd: paid.amountUsd,
      txHash: paid.txHash,
      token: "USDC",
      from: paid.from || "x402",
      chain: "base",
    });
    const acct = await getOrCreateAccount(user.userId);
    return x402Ok({ credited: paid.amountUsd, credits: acct.credits, tx: paid.txHash }, paid);
  } catch (e) {
    return challenge(req, (e as Error).message);
  }
}

function x402Ok(body: Record<string, unknown>, paid: { txHash: string; network: string }) {
  const res = NextResponse.json(body);
  res.headers.set(
    "X-PAYMENT-RESPONSE",
    Buffer.from(JSON.stringify({ success: true, transaction: paid.txHash, network: paid.network })).toString("base64")
  );
  return res;
}

/** GET returns the 402 challenge so agents can discover how to pay. */
export async function GET(req: Request) {
  return challenge(req);
}
