"use client";

/** Official-ish token marks (local assets under /brand). */
export function UsdcLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/usdc.png"
      alt="USDC"
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function UsdgLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/usdg.png"
      alt="USDG"
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function StableLogo({
  asset,
  size = 20,
}: {
  asset: "USDC" | "USDG" | string;
  size?: number;
}) {
  if (asset.toUpperCase().includes("USDG")) return <UsdgLogo size={size} />;
  return <UsdcLogo size={size} />;
}
