import { NextResponse } from "next/server";
import {
  checkWalletTokenAccess,
  isEthAddress,
  minGradientBalance,
  ROBINHOOD_CHAIN_ID,
  tokenContractAddress,
  tokenDecimals,
  tokenRpcUrl,
} from "@/lib/lab/token-access";

export const runtime = "nodejs";

export async function GET() {
  const address = tokenContractAddress();
  const configured = isEthAddress(address);
  return NextResponse.json({
    configured,
    minBalance: minGradientBalance(),
    chain: "robinhood",
    chainId: ROBINHOOD_CHAIN_ID,
    rpc: tokenRpcUrl(),
    decimals: tokenDecimals(),
    address: configured ? address : null,
  });
}

export async function POST(req: Request) {
  let wallet = "";
  try {
    const body = await req.json();
    wallet = String(body?.wallet || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await checkWalletTokenAccess(wallet);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status });
  }
  return NextResponse.json(result);
}
