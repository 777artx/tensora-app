import { NextResponse } from "next/server";
import { claimEarn, earnTick, getEarnState, processFeeInbounds } from "@/lib/lab/account-store";
import {
  earnDripPctPerHour,
  earnFeeShareBps,
  earnFeeWallet,
  earnHolderFloor,
  fetchFeeWalletInbounds,
  fetchOpenRouterBackingUsd,
  fetchTokenHolders,
  getUserWallets,
} from "@/lib/lab/earn";
import { tensoraTokenAddress } from "@/lib/lab/deposit-verify";
import { ROBINHOOD_EXPLORER_URL } from "@/lib/lab/token-access";
import { authenticateRequest, unauthorized } from "@/lib/lab/server-auth";

export const runtime = "nodejs";

/** Lazy accrual: at most one holder snapshot per interval per instance. */
const TICK_INTERVAL_MS = 5 * 60_000;
const g = globalThis as typeof globalThis & { __tensoraEarnTickAt?: number };

async function maybeTick() {
  const hasToken = Boolean(tensoraTokenAddress());
  const hasFeeWallet = Boolean(earnFeeWallet());
  if (!hasToken && !hasFeeWallet) return;
  const now = Date.now();
  if (g.__tensoraEarnTickAt && now - g.__tensoraEarnTickAt < TICK_INTERVAL_MS) return;
  g.__tensoraEarnTickAt = now;

  // Count new fee revenue first so this tick distributes from a topped-up pool.
  if (hasFeeWallet) {
    try {
      const inbounds = await fetchFeeWalletInbounds(50);
      if (inbounds.length > 0) {
        await processFeeInbounds(inbounds, earnFeeShareBps());
      }
    } catch {
      /* watcher failures never break the page */
    }
  }

  if (hasToken) {
    try {
      const holders = await fetchTokenHolders(200);
      if (holders.length > 0) {
        await earnTick(holders, {
          floorTokens: earnHolderFloor(),
          dripPctPerHour: earnDripPctPerHour(),
        });
      }
    } catch {
      /* snapshot failures never break the page */
    }
  }
}

export async function GET(req: Request) {
  await maybeTick();
  const user = await authenticateRequest(req);
  const wallets = user ? await getUserWallets(user.userId) : [];
  const floor = earnHolderFloor();
  const [state, backingUsd] = await Promise.all([
    getEarnState(wallets, floor),
    fetchOpenRouterBackingUsd(),
  ]);
  const token = tensoraTokenAddress();
  // What the pool releases over the next 24h at today's drip (compounding hourly).
  const drip = earnDripPctPerHour() / 100;
  const dailyPoolUsd = Math.round(state.poolUsd * (1 - Math.pow(1 - drip, 24)) * 100) / 100;
  const myShare =
    state.eligibleSupply > 0 && state.myBalanceTokens >= floor ? state.myBalanceTokens / state.eligibleSupply : 0;
  return NextResponse.json({
    ...state,
    token: token || null,
    tokenExplorerUrl: token ? `${ROBINHOOD_EXPLORER_URL}/token/${token}` : null,
    live: Boolean(token),
    holderFloor: floor,
    dailyPoolUsd,
    myShare,
    myDailyUsd: Math.round(dailyPoolUsd * myShare * 10000) / 10000,
    dripPctPerHour: earnDripPctPerHour(),
    /** Current effective stream rate given today's pool. */
    ratePerHourUsd: Math.round(state.poolUsd * earnDripPctPerHour()) / 100,
    backingUsd,
    backingRatio:
      backingUsd != null && state.creditsOutstandingUsd > 0
        ? Math.round((backingUsd / state.creditsOutstandingUsd) * 100) / 100
        : null,
    myWallets: wallets,
  });
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized();
  if (!tensoraTokenAddress()) {
    return NextResponse.json(
      { error: "$OLORA has not launched yet. Rewards start accruing at launch." },
      { status: 400 }
    );
  }
  const wallets = await getUserWallets(user.userId);
  if (wallets.length === 0) {
    return NextResponse.json(
      { error: "Link a wallet to your account first (sign in with your wallet on Privy)." },
      { status: 400 }
    );
  }
  const result = await claimEarn(user.userId, wallets);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, credits: result.credits }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    claimedUsd: result.claimedUsd,
    credits: result.credits,
  });
}
