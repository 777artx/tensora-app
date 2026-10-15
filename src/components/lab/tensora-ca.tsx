"use client";

import { useState } from "react";

export const TENSORA_CA = "0xd3c5a67c686323236f892a21391faa0616733d91";
export const TENSORA_CA_EXPLORER = `https://robinhoodchain.blockscout.com/token/${TENSORA_CA}`;

/** Copyable $OLORA contract address. */
export function TensoraCa({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const [copied, setCopied] = useState(false);
  const fg = tone === "dark" ? "text-white" : "text-[var(--fg)]";
  const muted = tone === "dark" ? "text-white/55" : "text-[var(--muted)]";
  const border = tone === "dark" ? "border-white/15 hover:border-white/35" : "border-black/15 hover:border-black/35";

  async function copy() {
    try {
      await navigator.clipboard.writeText(TENSORA_CA);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 text-[12px] ${className}`}>
      <span className={`font-semibold uppercase tracking-[0.12em] ${muted}`}>$OLORA CA</span>
      <button
        type="button"
        onClick={() => void copy()}
        title="Copy contract address"
        aria-label={`Copy $OLORA contract address ${TENSORA_CA}`}
        className={`inline-flex min-w-0 items-center gap-2 border px-2.5 py-1 font-mono transition-colors ${border} ${fg}`}
      >
        <span className="truncate">{TENSORA_CA}</span>
        <span className={`shrink-0 ${copied ? "text-emerald-400" : muted}`}>{copied ? "Copied" : "Copy"}</span>
      </button>
      <a
        href={TENSORA_CA_EXPLORER}
        target="_blank"
        rel="noreferrer"
        className={`${muted} underline-offset-2 hover:underline`}
      >
        Robinhood Chain →
      </a>
    </div>
  );
}
