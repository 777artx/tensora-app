# Pulse fleet handoff

Beta custody for Tensora treasury **activity** (not the Robinhood hot-send key).

## What this is

- **22** Base EOAs under `.ops/pulse/wallets.json` (gitignored).
- ~**$50 USDC** total mixed wallet↔wallet, then swept into Robinhood treasury `0x77b8…2b94`.
- Creates real Basescan USDC transfers into the treasury. Robinhood only **receives**.

## Files

| Path | Purpose |
|------|---------|
| `.ops/pulse/wallets.json` | Addresses + private keys (secret) |
| `.ops/pulse/addresses.txt` | Addresses only |
| `.ops/pulse/pulse-log.jsonl` | Tx hashes / errors |
| `scripts/pulse/generate-wallets.mjs` | Create fleet |
| `scripts/pulse/fund-plan.mjs` | Print funding steps |
| `scripts/pulse/run-pulse.mjs` | Mix + sweep |

## Commands

```bash
cd tensora-app
node scripts/pulse/generate-wallets.mjs
node scripts/pulse/fund-plan.mjs
# after funding distributor:
node scripts/pulse/distribute.mjs

# One-shot mix then full sweep (drains fleet → treasury):
node scripts/pulse/run-pulse.mjs

# Continuous live recycle (keeps float in fleet, random drips to treasury):
npm run pulse:loop
```

Loop knobs: `PULSE_MIN_GAP_MS` `PULSE_MAX_GAP_MS` `PULSE_DRIP_CHANCE` `PULSE_KEEP_USD`  
Continuous mode needs USDC left in the wallets — treasury is receive-only.

## Trading the credit book from the fleet

`scripts/pulse/trade-fleet.mts` puts the same wallets on the credits/USDC order
book so book activity and trading volume come from distinct, real addresses.

```bash
# Rehearse against an isolated local ledger — no chain, no gas, no money
npm run fleet:local

# See what the on-chain run would do, without submitting anything
npm run fleet:plan

# Real run: moves USDC on Base and funds accounts from verified transfers
npm run fleet:trade
```

| Mode | Funds | Ledger |
|------|-------|--------|
| `--local` (default) | synthetic tx hashes, no chain | isolated `.tmp/` ledger |
| `--onchain` | real USDC transfer on Base per wallet | production ledger |

`--onchain` is gated: it needs `--yes` or `FLEET_LIVE=1`, and the production
ledger is only reached through `.env.local` credentials.

Each on-chain run:

1. Reads USDC + ETH per wallet and skips any that cannot trade.
2. Sends USDC from the wallet to the treasury, waits for the receipt.
3. Verifies the receipt really is a USDC `Transfer` **from that wallet** of at
   least the order floor — a hash alone is not treated as proof of payment.
4. Funds the matching ledger account (`pulse-<wallet>`) with that verified hash.
5. Buys each wallet a small credit position, then trades both sides for N rounds.

Knobs: `FLEET_WALLETS` `FLEET_ROUNDS` `FLEET_MIN_USD` `FLEET_MAX_USD` `FLEET_SPACING_MS`

> **Volume caveat.** On-chain, every wallet-to-treasury transfer is a real
> transfer, but the buyer and the treasury are the same party. Fees and volume
> booked this way are self-generated, not organic demand — worth being explicit
> about anywhere that number is reported publicly.


## Running the book 24/7

`scripts/pulse/loop-fleet.mts` keeps the tape printing continuously from the
fleet while recycling the float instead of spending it.

```bash
# Rehearse free against an isolated ledger
npm run fleet:loop:local

# See what the on-chain run would do
npm run fleet:loop:plan

# One bounded run (safe for cron / CI)
npm run fleet:loop

# Run until stopped (a VPS or always-on machine)
npm run fleet:loop:forever
```

### Why it can run forever

1. **The book is the ledger.** Filled orders never broadcast a tx — only the
   optional on-chain hop does. So continuous trading costs nothing; gas is the
   only real spend (~$0.001 per Base tx).
2. **The float is recycled, not spent.** A funding hop sends USDC to a *peer*
   wallet (`FLEET_FUND=peer`, the default), and the counterparty wallet sends it
   back later. Only `FLEET_FUND=treasury` drains one-way — avoid it, since the
   treasury is receive-only.
3. **Escrow is reclaimed.** Each cycle cancels the previous quotes, because a
   resting limit order escrows cash (buy) or credits (sell) indefinitely and
   those escrows drain a wallet without ever printing a fill.
4. **Activity is sampled.** `FLEET_PER_CYCLE` wallets trade per cycle (default
   6) so the tape stays steady instead of bursting all 22 at once.
5. **Wallets are rebalanced.** In on-chain mode a rebalancer moves USDC from the
   richest wallets to the poorest each cycle, so none is stranded below
   `FLEET_FLOOR_USD` and unable to hop. In peer mode this conserves the float —
   it repositions it rather than spending it.

### Sizing the float

Each wallet needs enough to cover a hop plus the ledger floor. With `N` wallets
trading and a `$F` floor, keep at least `N × (F + hop)` in circulation. For all
22 wallets above `$5` with `$3` hops that is about **$176**; trading a subset
needs proportionally less. Below that, wallets simply take turns rather than all
holding the floor at once.

### Knobs

| Env | Meaning |
|-----|---------|
| `FLEET_CYCLES` | cycles per run; `0` or `--forever` = run until stopped |
| `FLEET_CADENCE_MS` | pause between cycles (default 60s) |
| `FLEET_PER_CYCLE` | wallets trading each cycle (default 6) |
| `FLEET_ROUNDS` | rounds per wallet per cycle |
| `FLEET_HOP_CHANCE` | odds a cycle moves real USDC on-chain |
| `FLEET_FUND` | `peer` (recycling) or `treasury` (draining) |
| `FLEET_HOP_MIN_USD` | smallest on-chain hop (default 0.25 — **not** the $1 book minimum) |
| `FLEET_HOP_MAX_USD` | largest on-chain hop (default 3; sizes are drawn randomly) |
| `FLEET_HOP_MAX_PCT` | most of a wallet's balance one hop may move (default 90) |
| `FLEET_FLOOR_USD` | rebalance so no wallet sits below this (default 5; `0` disables) |
| `FLEET_LEDGER_FLOOR_USD` | top a ledger account up below this |
| `FLEET_TOPUP_MAX_USD` | most USDC a single hop may move |
| `FLEET_GAS_FLOOR_ETH` | skip on-chain work below this ETH balance (default 0.00005 — see note) |
| `FLEET_DRY=1` | log actions, submit nothing |

### 24/7 runtime

`.github/workflows/fleet-loop.yml` runs it on a schedule. Because a scheduled
run is one-shot, the job runs a bounded loop and exits; the schedule decides how
often.

**Minutes budget.** GitHub bills each run rounded up to a minute and a private
repo gets 2,000 free minutes/month. Near-continuous coverage needs ~30,000
minutes (~15x), so a **private** repo cannot run this 24/7 on the free tier — it
would exhaust the allowance in about two days and then stop for the rest of the
month. To get real 24/7: make the repo public (unlimited free Actions minutes),
pay for minutes, or run `fleet:loop:forever` on a VPS. The committed schedule
assumes ample minutes; on a private free tier, widen the cron to `0 * * * *` and
lower `cycles` to stay under 2,000 minutes.

Required repository secrets: `FLEET_WALLETS_JSON`, `KV_REST_API_URL`,
`KV_REST_API_TOKEN`, optionally `BASE_RPC_URL`.

### Budget

Gas, measured on Base mainnet rather than estimated: one USDC transfer (≈52k
gas at ~0.006 gwei) costs **~$0.00094**. So:

- **$5 of Base ETH** funds roughly **5,000 transfers** — far more than this loop
  needs. A couple of dollars is plenty to start.
- The gas floor is `FLEET_GAS_FLOOR_ETH` (default `0.00005`), which covers
  ~160 transfers. It is deliberately low: at real Base gas prices even a
  ~$0.30 ETH balance is ~1,000 transfers, and a floor set too high silently
  skips wallets that could in fact trade.

- **$95 USDC** recycled across the fleet (≈$4.30 each over 22 wallets) as the
  float. This is not consumed by trading; it circulates.
- Ledger accounts need no new money. The 1% taker fee slowly shaves the fleet's
  aggregate float, so a re-seed is eventually required — that is a ledger
  top-up, not a new deposit on-chain.

### Read this before funding the loop

The loop's activity is **cosmetic, not commercial**. The 5% platform fee and the
traded volume are **self-generated** by the fleet trading with itself — the
buyer and the counterparty are both operator-controlled wallets, so no third
party pays that fee. Booking it as revenue or volume inflates real numbers.

Two specific risks:

1. **Wash trading.** Trading with yourself to create the appearance of an active
   market is wash trading. That can breach exchange rules for the token and
   securities law, and it is exactly the kind of activity that gets flagged. If
   these numbers ever appear in investor or marketing material, that is the
   exposure.
2. **Unbacked liability.** Credits are a redeemable liability to be served via
   OpenRouter. Fleet credits inflate `creditsOutstandingUsd` without any revenue
   behind them. Production is currently healthy (~2089% backed), but the fleet
   should **not** be the thing that grows that number — keep an eye on the
   backing ratio (`npm run ops:backing`).

Also worth knowing: the fleet wallets on Base have **history**. Any deposit only
ever *funds* the ledger account; nothing withdraws credits back to USDC. So
money sent to these wallets makes real on-chain transfers but does not return,
and the retail-purchase fee routing is one-way: **the treasury never sends USDC
back to the fleet**. Sweeping to the treasury is a permanent drain.

`FLEET_FUND=treasury` exists for completeness but is one-way by design. The
default (`peer`) is the only setting that can run indefinitely.

### Deploy

Shipping new code to the site and funding the wallets are independent. If you
want the BaseScan links live, that is a normal frontend deploy
(`vercel deploy --prod --yes --scope agenticlives` from `tensora-app`).

## Takeover checklist

1. Copy `.ops/pulse/` to a password manager / encrypted drive.
2. Confirm `.ops/` stays in `.gitignore`.
3. Re-fund gas/USDC when balances run low.
4. Rotate: delete wallets.json, regenerate, fund new set.
5. Agent no longer runs pulse after you confirm takeover.

## Safety

- Never commit `.ops/` or paste keys into chat/git.
- Dry-run before live broadcasts.
- Sweep destination is treasury only — do not point at random addresses.
