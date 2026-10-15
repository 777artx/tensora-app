/** Verify on-chain deposits: Base USDC + Robinhood Chain USDG (+ optional Olora). */

import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER_URL,
  ROBINHOOD_RPC_URL,
} from "@/lib/lab/token-access";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
/** Global Dollar (USDG) on Robinhood Chain mainnet — Paxos / RH docs. */
const RH_USDG_DEFAULT = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
/** Operator treasury (same EOA receives on Base + Robinhood Chain). */
const DEFAULT_TREASURY = "0x77b8f55317a2f74092102af4188627beae772b94";
/** keccak256("Transfer(address,address,uint256)") */
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type DepositRailMethod = "usdc" | "usdg" | "crypto" | "tensora";

export function treasuryAddress() {
  return String(
    process.env.TENSORA_TREASURY_ADDRESS ||
      process.env.NEXT_PUBLIC_TENSORA_TREASURY_ADDRESS ||
      DEFAULT_TREASURY
  )
    .trim()
    .toLowerCase();
}

/** $OLORA on Robinhood Chain (ERC-20, 18 decimals, 1B supply). */
export const TENSORA_TOKEN_CA = "0xd3c5a67c686323236f892a21391faa0616733d91";

export function tensoraTokenAddress() {
  return String(
    process.env.TENSORA_TOKEN_ADDRESS ||
      process.env.FRONTIER_TOKEN_ADDRESS ||
      process.env.GRADIENT_TOKEN_ADDRESS ||
      TENSORA_TOKEN_CA
  )
    .trim()
    .toLowerCase();
}

export function usdgTokenAddress() {
  return String(process.env.USDG_TOKEN_ADDRESS || RH_USDG_DEFAULT)
    .trim()
    .toLowerCase();
}

export function baseRpcUrl() {
  return (
    process.env.BASE_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    "https://mainnet.base.org"
  );
}

export function robinhoodRpcUrl() {
  return (
    process.env.ROBINHOOD_RPC_URL ||
    process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ||
    ROBINHOOD_RPC_URL
  );
}

function isTxHash(v: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(v.trim());
}

function isAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v.trim());
}

async function rpcAt<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const upstream = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = (await upstream.json()) as { result?: T; error?: { message?: string } };
  if (payload.error?.message) throw new Error(payload.error.message);
  return payload.result as T;
}

type ReceiptLog = {
  address?: string;
  topics?: string[];
  data?: string;
};

type Receipt = {
  status?: string;
  logs?: ReceiptLog[];
} | null;

function topicAddress(topic: string) {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

function decodeUint256(data: string) {
  return BigInt(data);
}

export type VerifiedDeposit = {
  method: DepositRailMethod;
  amountUsd: number;
  txHash: string;
  token: string;
  from: string;
  chain: "base" | "robinhood";
  chainId: number;
  explorerUrl: string;
};

async function readReceipt(rpcUrl: string, txHash: string, chainLabel: string): Promise<NonNullable<Receipt>> {
  const receipt = await rpcAt<Receipt>(rpcUrl, "eth_getTransactionReceipt", [txHash]);
  if (!receipt) throw new Error(`Transaction not found on ${chainLabel} yet. Wait and retry.`);
  if (receipt.status && receipt.status !== "0x1") {
    throw new Error(`Transaction failed on ${chainLabel}.`);
  }
  return receipt;
}

function matchTransfer(opts: {
  logs: ReceiptLog[];
  treasury: string;
  tokenAddress: string;
  decimals: number;
}): { from: string; amountUsd: number } | null {
  for (const log of opts.logs) {
    const addr = String(log.address || "").toLowerCase();
    const topics = log.topics || [];
    if (addr !== opts.tokenAddress) continue;
    if (topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    if (topics.length < 3) continue;
    const to = topicAddress(topics[2]);
    if (to !== opts.treasury) continue;
    const raw = decodeUint256(String(log.data || "0x0"));
    const from = topicAddress(topics[1]);
    const unit = 10n ** BigInt(opts.decimals);
    const amountUsd = Number(raw) / Number(unit);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) continue;
    return { from, amountUsd: Math.round(amountUsd * 100) / 100 };
  }
  return null;
}

/**
 * Confirm a Transfer to the treasury.
 * - usdc → Base USDC
 * - usdg → Robinhood Chain USDG
 * - crypto → try Base USDC then Robinhood USDG
 * - tensora → Base Olora token (when configured)
 */
export async function verifyDeposit(opts: {
  txHash: string;
  method: DepositRailMethod;
}): Promise<VerifiedDeposit> {
  const treasury = treasuryAddress();
  if (!isAddress(treasury)) {
    throw new Error("Treasury address is not configured (TENSORA_TREASURY_ADDRESS).");
  }
  const txHash = opts.txHash.trim();
  if (!isTxHash(txHash)) throw new Error("Invalid transaction hash.");

  const usdc = BASE_USDC.toLowerCase();
  const usdg = usdgTokenAddress();
  const tensora = tensoraTokenAddress();

  if (opts.method === "usdc" || opts.method === "crypto" || opts.method === "tensora") {
    try {
      const receipt = await readReceipt(baseRpcUrl(), txHash, "Base");
      const logs = receipt.logs || [];

      if (opts.method === "usdc" || opts.method === "crypto") {
        const hit = matchTransfer({
          logs,
          treasury,
          tokenAddress: usdc,
          decimals: 6,
        });
        if (hit) {
          return {
            method: "usdc",
            amountUsd: hit.amountUsd,
            txHash: txHash.toLowerCase(),
            token: "USDC",
            from: hit.from,
            chain: "base",
            chainId: 8453,
            explorerUrl: `https://basescan.org/tx/${txHash}`,
          };
        }
      }

      if ((opts.method === "tensora" || opts.method === "crypto") && tensora) {
        const decimals = Number(process.env.TENSORA_TOKEN_DECIMALS || 18);
        const hit = matchTransfer({
          logs,
          treasury,
          tokenAddress: tensora,
          decimals: Number.isFinite(decimals) ? decimals : 18,
        });
        if (hit) {
          return {
            method: "tensora",
            amountUsd: hit.amountUsd,
            txHash: txHash.toLowerCase(),
            token: "TENSORA",
            from: hit.from,
            chain: "base",
            chainId: 8453,
            explorerUrl: `https://basescan.org/tx/${txHash}`,
          };
        }
      }

      if (opts.method === "usdc") {
        throw new Error(
          `No USDC transfer to treasury ${treasury.slice(0, 6)}…${treasury.slice(-4)} in that Base tx.`
        );
      }
      if (opts.method === "tensora") {
        if (!tensora) throw new Error("TENSORA_TOKEN_ADDRESS is not configured yet.");
        throw new Error(
          `No Olora transfer to treasury ${treasury.slice(0, 6)}…${treasury.slice(-4)} in that Base tx.`
        );
      }
      // crypto: fall through to Robinhood USDG
    } catch (err) {
      if (opts.method !== "crypto") throw err;
      // Base miss / not found — try Robinhood USDG below
    }
  }

  if (opts.method === "usdg" || opts.method === "crypto") {
    const receipt = await readReceipt(robinhoodRpcUrl(), txHash, "Robinhood Chain");
    const hit = matchTransfer({
      logs: receipt.logs || [],
      treasury,
      tokenAddress: usdg,
      decimals: 6,
    });
    if (hit) {
      return {
        method: "usdg",
        amountUsd: hit.amountUsd,
        txHash: txHash.toLowerCase(),
        token: "USDG",
        from: hit.from,
        chain: "robinhood",
        chainId: ROBINHOOD_CHAIN_ID,
        explorerUrl: `${ROBINHOOD_EXPLORER_URL}/tx/${txHash}`,
      };
    }
    throw new Error(
      `No USDG transfer to treasury ${treasury.slice(0, 6)}…${treasury.slice(-4)} on Robinhood Chain.`
    );
  }

  throw new Error("Unsupported deposit method.");
}

/** @deprecated use verifyDeposit */
export async function verifyBaseDeposit(opts: {
  txHash: string;
  method: "usdc" | "tensora" | "crypto";
}): Promise<VerifiedDeposit> {
  return verifyDeposit(opts);
}

export function depositConfigPublic() {
  const treasury = treasuryAddress() || null;
  return {
    treasury,
    methods: ["usdc", "usdg", "crypto", "tensora"] as const,
    note: "Send USDC on Base or USDG on Robinhood Chain to the treasury, then paste the tx hash.",
    rails: {
      usdc: {
        chain: "base",
        chainId: 8453,
        label: "USDC · Base",
        token: BASE_USDC,
        tokenSymbol: "USDC",
        explorer: "https://basescan.org",
        explorerAddress: treasury ? `https://basescan.org/address/${treasury}` : null,
        rpcNote: "Base mainnet",
      },
      usdg: {
        chain: "robinhood",
        chainId: ROBINHOOD_CHAIN_ID,
        label: "USDG · Robinhood Chain",
        token: usdgTokenAddress(),
        tokenSymbol: "USDG",
        explorer: ROBINHOOD_EXPLORER_URL,
        explorerAddress: treasury ? `${ROBINHOOD_EXPLORER_URL}/address/${treasury}` : null,
        rpcNote: "Robinhood Chain",
      },
    },
    // Back-compat fields used by older clients
    chain: "base",
    chainId: 8453,
    usdc: BASE_USDC,
    usdg: usdgTokenAddress(),
    tensoraToken: tensoraTokenAddress() || null,
  };
}
