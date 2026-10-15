/** Verify a Solana USDC transfer into the treasury by reading token balance deltas. */

export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const MEMO_PROGRAMS = new Set([
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
]);

export function solanaTreasury() {
  return String(process.env.TENSORA_SOLANA_TREASURY || "").trim();
}

function rpcUrl() {
  return process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
}

type TokenBal = { owner?: string; mint: string; uiTokenAmount: { amount: string; decimals: number } };
type ParsedTx = {
  meta: { err: unknown; preTokenBalances?: TokenBal[]; postTokenBalances?: TokenBal[]; logMessages?: string[] } | null;
  transaction: { message: { instructions: { programId: string; parsed?: unknown }[] } };
  blockTime?: number | null;
};

export async function verifySolanaUsdc(signature: string, opts: { memo?: string } = {}) {
  const treasury = solanaTreasury();
  if (!treasury) throw new Error("Solana payments are not configured (TENSORA_SOLANA_TREASURY).");
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) throw new Error("Invalid Solana signature.");

  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [signature, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 }],
    }),
  });
  const data = (await res.json().catch(() => null)) as { result?: ParsedTx | null; error?: { message?: string } } | null;
  if (data?.error) throw new Error(data.error.message || "Solana RPC error.");
  const tx = data?.result;
  if (!tx) throw new Error("Transaction not found on Solana yet. Wait and retry.");
  if (!tx.meta || tx.meta.err) throw new Error("Transaction failed on Solana.");

  const pick = (list?: TokenBal[]) =>
    (list || [])
      .filter((b) => b.owner === treasury && b.mint === SOLANA_USDC_MINT)
      .reduce((s, b) => s + BigInt(b.uiTokenAmount.amount), 0n);
  const delta = pick(tx.meta.postTokenBalances) - pick(tx.meta.preTokenBalances);
  if (delta <= 0n) throw new Error("No USDC transfer to the Olora Solana treasury in that transaction.");

  if (opts.memo) {
    const memos = tx.transaction.message.instructions
      .filter((i) => MEMO_PROGRAMS.has(i.programId))
      .map((i) => String(i.parsed ?? ""));
    if (!memos.some((m) => m.includes(opts.memo!))) {
      throw new Error("Payment memo does not match this challenge.");
    }
  }

  return {
    amountUsd: Math.round((Number(delta) / 1e6) * 100) / 100,
    signature,
    blockTime: tx.blockTime ?? null,
  };
}
