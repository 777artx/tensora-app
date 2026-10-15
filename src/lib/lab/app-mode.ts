/** Shared live / demo mode helpers (server + client via NEXT_PUBLIC_*). */

export function isLiveMode(): boolean {
  return (process.env.NEXT_PUBLIC_APP_MODE || "").trim().toLowerCase() === "live";
}

export function isDemoMode(): boolean {
  if (isLiveMode()) return false;
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

/** Demo auth (local session without Privy) only when not live and App ID missing. */
export function allowDemoAuth(): boolean {
  if (isLiveMode()) return false;
  if (process.env.NODE_ENV === "production" && isLiveMode()) return false;
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || "").trim();
  if (appId) return false;
  // Fail closed: production builds without App ID never use demo auth.
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

export function marketplaceDiscountBps(): number {
  const raw = Number(process.env.MARKETPLACE_DISCOUNT_BPS || "1000");
  if (!Number.isFinite(raw) || raw < 0) return 1000;
  return Math.min(5000, Math.floor(raw));
}

export function marketplacePlatformFeeBps(): number {
  const raw = Number(process.env.MARKETPLACE_PLATFORM_FEE_BPS || "500");
  if (!Number.isFinite(raw) || raw < 0) return 500;
  return Math.min(2000, Math.floor(raw));
}
