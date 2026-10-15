/**
 * Offline smoke test for the credits/USDC order book engine.
 * Runs against a local temp .data store (never Blob) — run with cwd set
 * to an empty scratch dir, e.g.:
 *   cd .tmp-smoke && npx -y tsx ../scripts/market-smoke.mts
 */
process.env.BLOB_READ_WRITE_TOKEN = "";

const {
  getOrCreateAccount,
  placeMarketOrder,
  cancelMarketOrder,
  getMarketState,
  earnTick,
  getEarnState,
  claimEarn,
  processFeeInbounds,
} = await import("../src/lib/lab/account-store");

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok  ${label}`);
  } else {
    failures++;
    console.error(`FAIL  ${label}`, detail ?? "");
  }
}
function approx(a: number, b: number, eps = 0.02) {
  return Math.abs(a - b) <= eps;
}

// Fund two scratch users in-process (memory store persists via saveDb inside engine calls).
const a = await getOrCreateAccount("smoke-a");
a.usdc = 100;
a.credits = 0;
const b = await getOrCreateAccount("smoke-b");
b.usdc = 100;
b.credits = 0;

console.log("\n1. Market buy $50 (should fill house ask @ 0.92)");
const buy1 = await placeMarketOrder("smoke-a", { side: "buy", sizeUsd: 50, type: "market" });
if (buy1.ok) {
  check("filled $50", approx(buy1.filledUsd, 50));
  check("avg price 0.92", approx(buy1.avgPrice ?? 0, 0.92, 0.001));
  check("fee $0.46 (1%)", approx(buy1.feeUsd, 0.46));
  check("credits = 50", approx(buy1.credits, 50));
  check("usdc = 100 - 46 - 0.46 = 53.54", approx(buy1.usdc, 53.54));
} else check("buy1 ok", false, buy1);

console.log("\n2. A lists sell limit $20 @ 0.91 (inside house 0.92 — becomes best ask)");
const sell1 = await placeMarketOrder("smoke-a", { side: "sell", sizeUsd: 20, price: 0.91 });
if (sell1.ok) {
  check("nothing filled (best bid 0.90 < 0.91)", sell1.filledUsd === 0);
  check("resting order exists", Boolean(sell1.restingOrder));
  check("credits escrowed: 50 - 20 = 30", approx(sell1.credits, 30));
} else check("sell1 ok", false, sell1);

const state1 = await getMarketState("smoke-a");
check("best ask is now 0.91 (user order)", state1.book.bestAsk === 0.91, state1.book.bestAsk);

console.log("\n3. B market buys $10 (should fill A's ask @ 0.91, not house)");
const buy2 = await placeMarketOrder("smoke-b", { side: "buy", sizeUsd: 10, type: "market" });
if (buy2.ok) {
  check("filled $10 @ 0.91", approx(buy2.filledUsd, 10) && approx(buy2.avgPrice ?? 0, 0.91, 0.001));
  check("maker was user", buy2.fills[0]?.maker === "user");
  check("B credits = 10", approx(buy2.credits, 10));
  check("B paid 9.10 + 0.09 fee", approx(buy2.usdc, 100 - 9.1 - 0.09));
} else check("buy2 ok", false, buy2);

const aAfter = await getOrCreateAccount("smoke-a");
check("A (maker) received $9.10 USDC", approx(aAfter.usdc, 53.54 + 9.1), aAfter.usdc);

console.log("\n4. B market sells $5 (should hit house bid @ 0.90, recycle inventory)");
const sell2 = await placeMarketOrder("smoke-b", { side: "sell", sizeUsd: 5, type: "market" });
if (sell2.ok) {
  check("filled $5 @ 0.90", approx(sell2.filledUsd, 5) && approx(sell2.avgPrice ?? 0, 0.9, 0.001));
  check("maker was house", sell2.fills[0]?.maker === "house");
  check("B credits = 5", approx(sell2.credits, 5));
  check("B proceeds 4.50 - 0.05 fee", approx(sell2.usdc, 100 - 9.19 + 4.45));
} else check("sell2 ok", false, sell2);

const state2 = await getMarketState("smoke-a");
check(
  "house bid pool shrank to ~45.50",
  approx(state2.config.houseBidPoolUsd, 45.5),
  state2.config.houseBidPoolUsd
);

console.log("\n5. A cancels remaining ask — escrow refund");
const myOrders = state2.myOrders;
check("A has 1 open order of $10 left", myOrders.length === 1 && approx(myOrders[0].sizeUsd, 10));
if (myOrders.length === 1) {
  const cancel = await cancelMarketOrder("smoke-a", myOrders[0].id);
  if (cancel.ok) {
    check("credits refunded: 30 + 10 = 40", approx(cancel.credits, 40), cancel.credits);
  } else check("cancel ok", false, cancel);
}

console.log("\n6. Guardrails");
const tooBig = await placeMarketOrder("smoke-b", { side: "buy", sizeUsd: 5000, price: 0.9 });
check("rejects size > $1000", !tooBig.ok);
const broke = await placeMarketOrder("smoke-b", { side: "sell", sizeUsd: 500, price: 0.99 });
check("rejects selling more credits than held", !broke.ok);
const state3 = await getMarketState();
check("book still has house asks", state3.book.asks.length > 0);

console.log("\n7. Earn: time-weighted accrual + claim");
const holders = [
  { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", balance: 30_000 },
  { address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", balance: 10_000 },
  { address: "0xcccccccccccccccccccccccccccccccccccccccc", balance: 500 }, // below floor
];
// First tick starts the clock (no distribution).
const t0 = await earnTick(holders, { floorTokens: 1000, dripPctPerHour: 2 });
check("first tick distributes nothing", t0.distributedUsd === 0);

// Simulate one hour passing by backdating the ledger clock.
{
  const { promises: fs } = await import("fs");
  const raw = JSON.parse(await fs.readFile(".data/lab-accounts.json", "utf8"));
  raw.earn.lastTickAt = new Date(Date.now() - 3600_000).toISOString();
  await fs.writeFile(".data/lab-accounts.json", JSON.stringify(raw));
  // Force re-hydration of the in-process store.
  const g = globalThis as { __tensoraAccounts?: { hydrated: boolean } };
  if (g.__tensoraAccounts) g.__tensoraAccounts.hydrated = false;
}

// Pool = $25; 2%/h drip over 1h → ~$0.50 distributed.
const t1 = await earnTick(holders, { floorTokens: 1000, dripPctPerHour: 2 });
check("~$0.50 distributed after 1h (2% of $25 pool)", approx(t1.distributedUsd, 0.5, 0.03), t1.distributedUsd);
check("2 eligible (one under floor)", t1.eligibleHolders === 2);

const es = await getEarnState(["0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"]);
check("wallet A accrued ~$0.38 (30k/40k of drip)", approx(es.myAccruedUsd, 0.375, 0.03), es.myAccruedUsd);
check("pool drained by distribution", approx(es.poolUsd, 25 - t1.distributedUsd, 0.03), es.poolUsd);

const claim = await claimEarn("smoke-a", ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]);
if (claim.ok) {
  check("claim moved accrual to credits", approx(claim.claimedUsd, es.myAccruedUsd, 0.01));
} else check("claim ok", false, claim);
const esAfter = await getEarnState(["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]);
check("accrual zeroed after claim", esAfter.myAccruedUsd === 0, esAfter.myAccruedUsd);
check("claimed total tracked", approx(esAfter.myClaimedUsd, claim.ok ? claim.claimedUsd : -1, 0.01));
const claim2 = await claimEarn("smoke-a", ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]);
check("double-claim rejected", !claim2.ok);

console.log("\n8. Fee watcher: inflows fund the pool exactly once");
const poolBefore = (await getEarnState()).poolUsd;
const inflows = [
  { txHash: "0x" + "1".repeat(64), amountUsd: 10 },
  { txHash: "0x" + "2".repeat(64), amountUsd: 4 },
];
const f1 = await processFeeInbounds(inflows, 5000);
check("counted 2 new txs", f1.newTxs === 2);
check("pool += 50% of $14 = $7", approx(f1.addedToPoolUsd, 7), f1.addedToPoolUsd);
const f2 = await processFeeInbounds(inflows, 5000);
check("re-run adds nothing (idempotent)", f2.newTxs === 0 && f2.addedToPoolUsd === 0);
const poolAfter = (await getEarnState()).poolUsd;
check("pool grew by exactly $7", approx(poolAfter - poolBefore, 7), poolAfter - poolBefore);
check("fee revenue tracked ($14)", approx((await getEarnState()).feeRevenueUsd, 14));

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
