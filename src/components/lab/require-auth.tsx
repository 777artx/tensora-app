"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLabAuth } from "@/lib/lab/auth";

export function RequireAuth({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { ready, authenticated } = useLabAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (authenticated) return;
    const ret = `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`;
    router.replace(`/lab/signin?return=${encodeURIComponent(ret || "/lab/home")}`);
  }, [ready, authenticated, router, pathname]);

  if (!ready) {
    return (
      fallback ?? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">Checking session…</div>
      )
    );
  }

  if (!authenticated) {
    return (
      fallback ?? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">
          Redirecting to sign in…
        </div>
      )
    );
  }

  return <>{children}</>;
}
