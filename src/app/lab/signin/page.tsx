"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OloraMark } from "@/components/lab/tensora-brand";
import { useLabAuth } from "@/lib/lab/auth";

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = useMemo(() => {
    const r = params.get("return") || "/lab/home";
    return r.startsWith("/") ? r : "/lab/home";
  }, [params]);

  const { ready, authenticated, login } = useLabAuth();
  const hasPrivy = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

  useEffect(() => {
    if (!ready || !authenticated) return;
    router.replace(returnTo);
  }, [ready, authenticated, router, returnTo]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--paper)] px-5 py-10">
      <div className="ol-rise w-full max-w-[380px] text-center">
        <div className="mx-auto mb-8 flex justify-center">
          <OloraMark size={40} />
        </div>
        <h1 className="m-0 text-[30px] font-semibold tracking-[-0.03em] text-[var(--ink)]">Welcome to Olora</h1>
        <p className="m-0 mt-3 text-[16px] leading-relaxed text-[var(--muted)]">
          The best AI, for less. Sign in or create a free account to continue.
        </p>
        <button
          type="button"
          onClick={() => login()}
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-white text-[15px] font-medium text-black transition-colors hover:bg-[#e8e8ea]"
        >
          {hasPrivy ? "Continue with Google or wallet" : "Continue (demo session)"}
        </button>
        {!hasPrivy ? (
          <p className="m-0 mt-3 text-[12px] text-[var(--silver)]">
            Set <code className="font-mono">NEXT_PUBLIC_PRIVY_APP_ID</code> for live sign-in.
          </p>
        ) : null}
        <p className="m-0 mt-6 text-[13px] text-[var(--silver)]">No crypto wallet needed. Google works fine.</p>
      </div>
      <Link href="/lab/home" className="mt-10 text-[14px] text-[var(--muted)] hover:text-[var(--ink)]">
        Back to Olora
      </Link>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[15px] text-[var(--muted)]">Loading…</div>}>
      <SignInInner />
    </Suspense>
  );
}
