"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackClient } from "@/lib/analytics/client";

/** One pageview per route change. */
export function PageTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path) return;
    trackClient("pageview");
  }, [path]);
  return null;
}
