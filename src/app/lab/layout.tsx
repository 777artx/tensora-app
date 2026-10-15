import { LabPrivyProvider } from "@/lib/lab/lab-privy-provider";
import "./lab.css";

export default function LabSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="gd-lab-root">
      {/* One shared gradient so any icon can use stroke: url(#ol-grad). */}
      <svg width="0" height="0" aria-hidden className="pointer-events-none absolute">
        <defs>
          <linearGradient id="ol-grad" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff2d5f" />
            <stop offset="1" stopColor="#5a46ff" />
          </linearGradient>
        </defs>
      </svg>
      <LabPrivyProvider>{children}</LabPrivyProvider>
    </div>
  );
}
