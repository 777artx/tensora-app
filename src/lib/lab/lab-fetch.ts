/** Client helpers to attach auth headers for Lab API calls. */

const TOKEN_KEY = "gd-privy-token";

function isClientLiveMode() {
  return (process.env.NEXT_PUBLIC_APP_MODE || "").trim().toLowerCase() === "live";
}

export function cacheAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function readCachedAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function labAuthHeaders(
  getAccessToken?: () => Promise<string | null>
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let token: string | null = null;
  if (getAccessToken) {
    try {
      token = await getAccessToken();
    } catch {
      token = null;
    }
  }
  if (!token) token = readCachedAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // Demo / local only — live mode rejects these and they just spam 401s.
  if (isClientLiveMode()) return headers;

  try {
    const raw = localStorage.getItem("gd-account");
    const parsed = raw ? (JSON.parse(raw) as { privyId?: string }) : null;
    const userId = parsed?.privyId || "demo";
    headers["x-tensora-user-id"] = userId;
    headers["x-tensora-demo"] = "1";
  } catch {
    headers["x-tensora-user-id"] = "demo";
    headers["x-tensora-demo"] = "1";
  }
  return headers;
}
