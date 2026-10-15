"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  DemoAuthProvider,
  LabAuthContext,
  type LabAuthValue,
} from "@/lib/lab/auth";
import { allowDemoAuth } from "@/lib/lab/app-mode";

export {
  useLabAuth,
  DemoAuthProvider,
  type LabAccount,
  type LabAuthValue,
} from "@/lib/lab/auth";

type PrivyProps = { appId: string; children: ReactNode };

/** Placeholder while Privy loads — ready=false so RequireAuth waits (no false redirect). */
function BootAuthProvider({ children }: { children: ReactNode }) {
  const value: LabAuthValue = {
    ready: false,
    authenticated: false,
    login: () => undefined,
    logout: async () => undefined,
    userLabel: "Guest",
    userSub: "Loading…",
    initials: "G",
    account: null,
    requireAuth: () => false,
    getAccessToken: async () => null,
  };
  return <LabAuthContext.Provider value={value}>{children}</LabAuthContext.Provider>;
}

function PrivyAuthLoader({ appId, children }: PrivyProps) {
  const [Provider, setProvider] = useState<ComponentType<PrivyProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/lab/privy-auth").then((m) => {
      if (!cancelled) setProvider(() => m.PrivyAuthProvider);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Provider) {
    return <BootAuthProvider>{children}</BootAuthProvider>;
  }
  return <Provider appId={appId}>{children}</Provider>;
}

function ProductionAuthRequired({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Privy is required</h1>
        <p className="text-sm text-[var(--muted)]">
          This deployment is in live mode without{" "}
          <code className="text-[12px]">NEXT_PUBLIC_PRIVY_APP_ID</code>. Set Privy env on Vercel,
          then redeploy.
        </p>
        {children}
      </div>
    </div>
  );
}

export function LabPrivyProvider({ children }: { children: ReactNode }) {
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || "").trim();

  if (!appId) {
    if (!allowDemoAuth()) {
      return <ProductionAuthRequired>{null}</ProductionAuthRequired>;
    }
    return <DemoAuthProvider>{children}</DemoAuthProvider>;
  }

  return <PrivyAuthLoader appId={appId}>{children}</PrivyAuthLoader>;
}
