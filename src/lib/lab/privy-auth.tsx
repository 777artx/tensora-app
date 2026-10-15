"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import {
  LabAuthContext,
  mirrorAccount,
  shortAddr,
  type LabAccount,
  type LabAuthValue,
} from "@/lib/lab/auth";
import { cacheAccessToken } from "@/lib/lab/lab-fetch";
import { trackWalletOnce } from "@/lib/analytics/client";

function LabAuthInner({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const account = useMemo<LabAccount | null>(() => {
    if (!authenticated || !user) return null;
    const email = user.email?.address || user.google?.email || undefined;
    const name =
      user.google?.name ||
      email?.split("@")[0] ||
      (user.wallet?.address ? shortAddr(user.wallet.address) : undefined);
    const wallet = user.wallet?.address || wallets[0]?.address || undefined;
    return {
      email,
      name,
      wallet,
      privyId: user.id,
      updatedAt: new Date().toISOString(),
    };
  }, [authenticated, user, wallets]);

  useEffect(() => {
    if (!ready) return;
    mirrorAccount(account);
  }, [ready, account]);

  useEffect(() => {
    if (ready && account?.wallet) trackWalletOnce(account.wallet);
  }, [ready, account?.wallet]);

  useEffect(() => {
    if (!ready || !authenticated) {
      cacheAccessToken(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!cancelled) cacheAccessToken(token);
      } catch {
        if (!cancelled) cacheAccessToken(null);
      }
    })();
    const id = window.setInterval(() => {
      void getAccessToken()
        .then((t) => cacheAccessToken(t))
        .catch(() => cacheAccessToken(null));
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ready, authenticated, getAccessToken]);

  const requireAuth = useCallback(
    (returnTo?: string) => {
      if (authenticated) return true;
      const ret =
        returnTo ||
        (typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/lab/home");
      window.location.href = `/lab/signin?return=${encodeURIComponent(ret)}`;
      return false;
    },
    [authenticated]
  );

  const getToken = useCallback(async () => {
    try {
      const token = await getAccessToken();
      cacheAccessToken(token);
      return token;
    } catch {
      return null;
    }
  }, [getAccessToken]);

  const value: LabAuthValue = {
    ready,
    authenticated,
    login,
    logout: async () => {
      await logout();
      mirrorAccount(null);
      cacheAccessToken(null);
    },
    userLabel:
      account?.name ||
      account?.email ||
      (account?.wallet ? shortAddr(account.wallet) : "Guest"),
    userSub:
      account?.email ||
      (account?.wallet ? shortAddr(account.wallet) : "Sign in to continue"),
    initials: (account?.name || account?.email || "G").slice(0, 1).toUpperCase(),
    account,
    requireAuth,
    getAccessToken: getToken,
  };

  return <LabAuthContext.Provider value={value}>{children}</LabAuthContext.Provider>;
}

export function PrivyAuthProvider({
  appId,
  children,
}: {
  appId: string;
  children: ReactNode;
}) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["google", "wallet", "email"],
        appearance: {
          theme: "light",
          accentColor: "#d7003a",
          logo: "/brand/olora-lockup.png",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <LabAuthInner>{children}</LabAuthInner>
    </PrivyProvider>
  );
}
