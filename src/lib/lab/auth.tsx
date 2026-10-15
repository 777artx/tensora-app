"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const ACCOUNT_KEY = "gd-account";

export type LabAccount = {
  email?: string;
  name?: string;
  wallet?: string;
  privyId?: string;
  updatedAt: string;
};

export type LabAuthValue = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  userLabel: string;
  userSub: string;
  initials: string;
  account: LabAccount | null;
  requireAuth: (returnTo?: string) => boolean;
  getAccessToken: () => Promise<string | null>;
};

export const LabAuthContext = createContext<LabAuthValue | null>(null);

export function shortAddr(a: string) {
  if (!a || a.length < 10) return a || "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function mirrorAccount(account: LabAccount | null) {
  try {
    if (!account) {
      localStorage.removeItem(ACCOUNT_KEY);
      return;
    }
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  } catch {
    /* ignore */
  }
}

export function readStoredAccount(): LabAccount | null {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    return raw && (raw.email || raw.wallet || raw.privyId) ? raw : null;
  } catch {
    return null;
  }
}

/** Local demo auth when NEXT_PUBLIC_PRIVY_APP_ID is unset. no Privy import. */
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<LabAccount | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAccount(readStoredAccount());
    setReady(true);
    const onChange = () => setAccount(readStoredAccount());
    window.addEventListener("tensora-auth-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("tensora-auth-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const login = useCallback(() => {
    const next: LabAccount = {
      email: "demo@olora.si",
      name: "Demo Operator",
      wallet: "0x7a3f9c2e1b84d5a6e8f0123456789abcde91c91e",
      privyId: "demo",
      updatedAt: new Date().toISOString(),
    };
    mirrorAccount(next);
    setAccount(next);
    window.dispatchEvent(new Event("tensora-auth-change"));
  }, []);

  const logout = useCallback(async () => {
    mirrorAccount(null);
    setAccount(null);
    window.dispatchEvent(new Event("tensora-auth-change"));
  }, []);

  const authenticated = Boolean(account);

  const requireAuth = useCallback(
    (returnTo?: string) => {
      if (authenticated) return true;
      const ret =
        returnTo || `${window.location.pathname}${window.location.search}`;
      window.location.href = `/lab/signin?return=${encodeURIComponent(ret)}`;
      return false;
    },
    [authenticated]
  );

  const value: LabAuthValue = {
    ready,
    authenticated,
    login,
    logout,
    userLabel: account?.name || "Guest",
    userSub: account?.email || "Sign in to continue",
    initials: (account?.name || "G").slice(0, 1).toUpperCase(),
    account,
    requireAuth,
    getAccessToken: async () => null,
  };

  return <LabAuthContext.Provider value={value}>{children}</LabAuthContext.Provider>;
}

export function useLabAuth(): LabAuthValue {
  const ctx = useContext(LabAuthContext);
  if (!ctx) {
    return {
      ready: true,
      authenticated: false,
      login: () => {
        window.location.href = "/lab/signin";
      },
      logout: async () => undefined,
      userLabel: "Guest",
      userSub: "Sign in to continue",
      initials: "G",
      account: null,
      requireAuth: (returnTo?: string) => {
        const ret = returnTo || "/lab/home";
        window.location.href = `/lab/signin?return=${encodeURIComponent(ret)}`;
        return false;
      },
      getAccessToken: async () => null,
    };
  }
  return ctx;
}
