# Order-book stress harness

Drives real transactions through the production matching engine
(`src/lib/lab/account-store.ts`) and measures whether those fills land on the
dashboard feed:

```
placeMarketOrder → recordTradeStats → networkStats
                 → computeLabNetworkStats → GET /api/lab/market
                 → useMarketSnap / LiveOnTensora → KPI cards
```

## Run it

```bash
# 1. Safe pass: isolated ledger under .tmp/, prod credentials blanked out
npm run stress:dry

# 2. Cross-process contention probe (spawns concurrent writers)
npm run stress:contend

# 3. Real pass against the production ledger
npm run stress:live                 # snapshots first, restores at the end
npm run stress:live -- --keep       # leave the stress activity visible on the dashboard

# 4. Roll a --keep run back afterwards (production writes require --yes)
npx -y tsx scripts/stress/order-book-stress.mts --live --yes --restore .tmp/stress/ledger-<run>.json.bak
```

`--live` refuses to run without `--yes`. It snapshots the ledger up front, writes a
backup to `.tmp/stress/ledger-<run>.json.bak`, and restores the original bytes
afterwards unless `--keep` is passed. Every `--keep` run prints its backup path so
the activity can be rolled back later with `--restore`.

## Flags

| Flag | Meaning |
|------|---------|
| `--dry` | Isolated ledger under `.tmp/` (default) |
| `--live` | Production ledger (Upstash Redis, else Vercel Blob) |
| `--yes` | Confirm live writes |
| `--keep` | Keep stress mutations so the dashboard shows them |
| `--restore FILE` | Roll the ledger back from a backup and exit (no new activity) |
| `--multiproc N` | Spawn N concurrent load-only writers to expose lost updates |
| `--load-only` | Worker mode: place orders only, no suite/restore |
| `--json` | Emit a machine-readable summary |
| `--env FILE` | Env file for live mode (default `.env.local`) |

## Sizing (env vars)

`STRESS_ACCOUNTS` (8) · `STRESS_ORDERS_PER_ACCT` (20) · `STRESS_CONCURRENCY` (5)
`STRESS_MIN_USD` (2) · `STRESS_MAX_USD` (25) · `STRESS_LIMIT_RATIO` (0.35)
`STRESS_SEED` (20261014)

## What it checks

1. **Matching semantics** — fill at the touch, 1% taker fee, maker pays nothing,
   user orders beat house liquidity, escrow refunds are exact, guardrails hold.
   All assertions are *relative*, so they work against a live ledger that already
   has activity in it.
2. **Concurrent load** — N traders firing buys, sells, resting and crossing limit
   orders. Reports throughput, p50/p95 latency and the maker/taker routing split
   (user↔user vs house).
3. **Cross-process contention** — the important one. The ledger is a single JSON
   document that every writer reads, mutates and writes back, so without
   serialization multiple processes overwrite each other's counters and balances.
   This phase now verifies that `withLedger()` keeps every concurrent write.
4. **Feed integrity** — compares dollars actually filled against the movement in
   the persisted counters, i.e. whether the dashboard's numbers can be trusted.
5. **Dashboard render** — prints the exact values the KPI cards will show, using
   the same baseline-plus-live-delta formula as `LiveOnTensora`.
6. **Restore** — verifies the ledger is byte-for-byte identical to the pre-run
   snapshot.

## Known findings

- **Lost updates under concurrency — fixed.** Before `withLedger()`, 3–4 concurrent
  writers lost roughly a quarter to a half of filled volume: trades executed, but
  the accounting and the dashboard under-reported. `placeMarketOrder` and every
  other money mutator now run inside a serialized transaction (in-process queue +
  distributed `SET NX PX` Redis lock / atomic `mkdir` file lock) that re-reads the
  ledger inside the critical section. Verified on 4 concurrent writer processes:
  **$2,628.71 filled concurrently, $0.00 (0%) absent from the counter.**
- **Non-refilling house bid pool.** `houseBidPoolUsd` only drains. Once it reaches
  zero, sellers have no house bid and trades against it stop. `--keep` runs will
  visibly deplete it.
- **Blob propagation lag.** With the Blob backend, running web processes can hold
  stale in-memory state for up to `BLOB_READ_TTL` (5 min) after a restore.
