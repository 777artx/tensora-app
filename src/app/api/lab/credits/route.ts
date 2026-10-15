import { NextResponse } from "next/server";
import { claimOnChainDeposit, getAccountSnapshot } from "@/lib/lab/account-store";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";
import {
  depositConfigPublic,
  verifyDeposit,
  type DepositRailMethod,
} from "@/lib/lab/deposit-verify";

export const runtime = "nodejs";

const ALLOWED: DepositRailMethod[] = ["usdc", "usdg", "crypto", "tensora"];

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  const snap = await getAccountSnapshot(user.userId);
  return NextResponse.json({
    ...snap,
    deposit: depositConfigPublic(),
  });
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();

  let body: { method?: string; txHash?: string; amountUsd?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const method = String(body.method || "").toLowerCase() as DepositRailMethod;
  if (!ALLOWED.includes(method)) {
    return NextResponse.json(
      {
        error:
          "Deposits accept USDC on Base, USDG on Robinhood Chain, crypto (auto-detect), or Olora coin.",
      },
      { status: 400 }
    );
  }

  const txHash = String(body.txHash || "").trim();
  if (!txHash) {
    return NextResponse.json(
      {
        error:
          "Paste the transaction hash after sending USDC (Base) or USDG (Robinhood Chain) to the treasury.",
      },
      { status: 400 }
    );
  }

  try {
    const verified = await verifyDeposit({ txHash, method });
    const snap = await claimOnChainDeposit(user.userId, {
      method: verified.method,
      amountUsd: verified.amountUsd,
      txHash: verified.txHash,
      token: verified.token,
      from: verified.from,
      chain: verified.chain,
    });
    return NextResponse.json({ ...snap, deposit: depositConfigPublic(), verified });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Deposit failed" },
      { status: 400 }
    );
  }
}
