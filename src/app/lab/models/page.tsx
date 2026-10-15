"use client";

import { Suspense } from "react";
import ModelsPageInner from "./models-page-client";

export default function ModelsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--gd-bg,#0a0a0b)] text-[var(--muted)]">
          Loading models…
        </div>
      }
    >
      <ModelsPageInner />
    </Suspense>
  );
}
