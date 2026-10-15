"use client";

import Link from "next/link";

/**
 * Olora brand. The wave mark in brand blue on light surfaces, white on dark.
 * Export names TensoraMark / TensoraLogoLockup are kept so older imports keep working.
 */
export function OloraMark({
  size = 16,
  tone = "dark",
  className = "",
}: {
  size?: number;
  tone?: "dark" | "light" | "sky" | "orange" | "mono";
  className?: string;
}) {
  const src =
    tone === "light" ? "/brand/olora-mark-white.png" : tone === "sky" ? "/brand/olora-mark-sky.png" : "/brand/olora-mark.png";
  const h = size;
  const w = Math.round(size * (529 / 394));
  return <img src={src} alt="" width={w} height={h} aria-hidden className={`inline-block shrink-0 ${className}`} />;
}

/** Wordmark art. Wide logotype, so height is the cap size and width follows. */
export function OloraWord({
  height = 20,
  tone = "dark",
  className = "",
}: {
  height?: number;
  tone?: "dark" | "light";
  className?: string;
}) {
  const src = tone === "light" ? "/brand/olora-wordmark-white.png" : "/brand/olora-wordmark.png";
  const w = Math.round(height * (768 / 164));
  return (
    <img
      src={src}
      alt=""
      width={w}
      height={height}
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
      style={{ height, width: "auto" }}
    />
  );
}

export function OloraWordmark({
  href = "/lab/home",
  tone = "dark",
  className = "",
}: {
  href?: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const wordTone = tone === "light" ? "light" : "dark";
  return (
    <Link href={href} aria-label="Olora home" className={`inline-flex items-center gap-2 ${className}`}>
      <OloraMark size={22} tone={wordTone} />
      <OloraWord height={18} tone={wordTone} />
    </Link>
  );
}

/* Back-compat aliases */
export const TensoraMark = OloraMark;
export function TensoraLogoLockup(props: { href?: string; className?: string; tone?: "dark" | "light" }) {
  return <OloraWordmark {...props} />;
}
