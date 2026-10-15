"use client";

const VID_KEY = "olora-vid";

export function visitorId(): string {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, "");
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

export function trackClient(event: "pageview" | "wallet_connect" | "card_declined") {
  try {
    const body = JSON.stringify({ event, visitor: visitorId() });
    const url = "/api/analytics/collect";
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
    else void fetch(url, { method: "POST", body, keepalive: true });
  } catch {
    /* ignore */
  }
}

/** Count a wallet once per browser. */
export function trackWalletOnce(address: string) {
  try {
    const key = `olora-wc-${address.toLowerCase()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    trackClient("wallet_connect");
  } catch {
    /* ignore */
  }
}
