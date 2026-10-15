"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";

const ICON = "/lab-dashboard/images/icon-svgs/sidebar";

function RefIcon({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${ICON}/${src}`}
      alt=""
      className="h-4 w-4 shrink-0 object-contain"
      style={{ filter: "brightness(0) invert(84%)" }}
    />
  );
}

const linkClass = "inline-flex items-center gap-1.5 text-xs text-[#9194a1]";

export function LabSidebarRefs() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#2e3038] px-3 py-3">
        <button type="button" className={linkClass} onClick={() => setOpen(true)}>
          <RefIcon src="send-icon.svg" />
          Support
        </button>
        <Link href="/lab/dashboard/support" className={linkClass}>
          <RefIcon src="documentation-icon.svg" />
          Docs
        </Link>
        <Link href="/lab/dashboard/billing" className={linkClass}>
          <RefIcon src="billing-new-icon.svg" />
          Billing
        </Link>
        <Link href="/lab/dashboard/profile" className={linkClass}>
          <RefIcon src="users-icon.svg" />
          Profile
        </Link>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-6"
          style={{ fontFamily: "var(--gd-font-sans, inherit)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-lg overflow-auto rounded border border-[#2e3038] bg-[#121317] text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className="flex items-center justify-between gap-4 border-b border-[#2e3038] px-5 py-4">
              <h2 id={titleId} className="m-0 text-xl font-semibold tracking-tight">
                Support
              </h2>
              <button
                type="button"
                className="border-0 bg-transparent px-2 text-xl leading-none text-[#9194a1]"
                aria-label="Close"
                onClick={close}
              >
                ×
              </button>
            </header>
            <div className="space-y-4 px-5 py-5 text-sm leading-relaxed text-[#9194a1]">
              <p className="m-0">
                Get help with Olora for workloads, GPUs, network providers, and
                settlements.
              </p>
              <p className="m-0">
                Email{" "}
                <a
                  className="text-[#d7003a] no-underline hover:underline"
                  href="mailto:support@olora.si"
                >
                  support@olora.si
                </a>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
