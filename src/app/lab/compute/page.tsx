"use client";

import { Suspense } from "react";
import ComputePageClient from "./compute-page-client";

export default function ComputePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--gd-bg,#0a0a0b)] text-[var(--gd-muted)]">
          Loading compute…
        </div>
      }
    >
      <ComputePageClient />
    </Suspense>
  );
}
