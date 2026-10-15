const MIN_TOKENS = 20_000;
const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_RPC_URL = "https://rpc.mainnet.chain.robinhood.com/";
export const ROBINHOOD_EXPLORER_URL = "https://robinhoodchain.blockscout.com";

function isDemoMode() {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE !== "false" &&
    process.env.NEXT_PUBLIC_APP_MODE !== "live"
  );
}

export function minGradientBalance() {
  return MIN_TOKENS;
}

export function isEthAddress(value: string) {
  return ETH_ADDRESS.test(String(value || "").trim());
}

export function tokenContractAddress() {
  return String(
    process.env.FRONTIER_TOKEN_ADDRESS ||
      process.env.GRADIENT_TOKEN_ADDRESS ||
      process.env.FRONTIER_MINT ||
      "",
  ).trim();
}

export function tokenDecimals() {
  const n = Number(process.env.GRADIENT_TOKEN_DECIMALS || 18);
  return Number.isFinite(n) && n >= 0 && n <= 18 ? n : 18;
}

export function tokenRpcUrl() {
  return (
    process.env.GRADIENT_TOKEN_RPC_URL ||
    process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ||
    ROBINHOOD_RPC_URL
  );
}

export type TokenAccessOk = {
  ok: true;
  configured: boolean;
  minBalance: number;
  balance: number;
  demo?: boolean;
  skipped?: boolean;
};

export type TokenAccessDenied = {
  ok: false;
  configured: boolean;
  skipped?: boolean;
  minBalance: number;
  balance?: number;
  error: string;
  status: number;
};

function balanceOfCalldata(wallet: string) {
  const hex = String(wallet).trim().replace(/^0x/, "");
  return "0x70a08231" + hex.toLowerCase().padStart(64, "0");
}

export async function checkWalletTokenAccess(
  wallet: string,
): Promise<TokenAccessOk | TokenAccessDenied> {
  const minBalance = MIN_TOKENS;

  if (isDemoMode()) {
    return {
      ok: true,
      configured: true,
      minBalance,
      balance: minBalance,
      demo: true,
    };
  }

  const address = tokenContractAddress();
  const owner = String(wallet || "").trim();

  // Token gate is optional. When no contract is set, allow credit / API-key inference.
  if (!isEthAddress(address)) {
    return {
      ok: true,
      configured: false,
      skipped: true,
      minBalance,
      balance: 0,
    };
  }
  if (!isEthAddress(owner)) {
    return {
      ok: false,
      configured: true,
      minBalance,
      error: "Connect a wallet to continue.",
      status: 401,
    };
  }

  const rpc = tokenRpcUrl();
  const upstream = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: address, data: balanceOfCalldata(owner) }, "latest"],
    }),
  });
  const payload = (await upstream.json().catch(() => null)) as {
    result?: string;
    error?: { message?: string };
  } | null;
  if (!payload?.result) {
    return {
      ok: false,
      configured: true,
      minBalance,
      error: payload?.error?.message || "Could not read token balance.",
      status: 502,
    };
  }

  const raw = BigInt(payload.result);
  const unit = 10n ** BigInt(tokenDecimals());
  const balance = Number(raw / unit);
  const ok = raw >= BigInt(MIN_TOKENS) * unit;
  if (!ok) {
    return {
      ok: false,
      configured: true,
      minBalance,
      balance,
      error: `This wallet holds ${balance.toLocaleString()} tokens. Hold ${MIN_TOKENS.toLocaleString()}+ to unlock inference.`,
      status: 403,
    };
  }
  return { ok: true, configured: true, minBalance, balance };
}
