/**
 * Olora icon set. Drawn for this product on a 24px grid.
 * Every mark is a variation of the ring: an arc, a bar, or a cut.
 * They are filled or closed shapes, not a stock line-icon library.
 */
const P: Record<string, string> = {
  // Home: an open ring with a dot — the Olora mark, reduced.
  // Home: the Olora ring, open at the top, with the center mark.
  home: "M16.2 6.2A7.25 7.25 0 1 0 19.2 12M12 12.2v.2",
  // Chat: a broken ring used as a reply.
  chat: "M12 5.2a6.8 6.8 0 0 1 6.5 8.6L19.4 18l-4.2-1.4A6.8 6.8 0 1 1 12 5.2Z",
  // Compare: three measures on one baseline.
  compare: "M5 19.2h14M7.2 19.2V12M12 19.2V7.2M16.8 19.2V9.4",
  // Market: price rising, then offered back.
  market: "M4.8 15.2 9.2 10l3 3.2L19.2 6.4M14.6 6.4h4.6v4.6",
  // Billing: a card with one stripe.
  billing: "M3.5 6.5h17v11h-17zM3.5 10h17",
  // Rewards: a ring with a smaller ring inside — something held.
  rewards: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  // Settings: three sliders.
  settings: "M5 6.5h14M5 12h14M5 17.5h14M9 4.5v4M15 10v4M8 15.5v4",
  // Help: the ring with a question inside.
  help: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9.7 9.7a2.4 2.4 0 1 1 3.3 2.2c-.6.3-1 .8-1 1.5v.4M12 16.5v.1",
  code: "M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  up: "M12 19V5M6 11l6-6 6 6",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  chevron: "M8 10l4 4 4-4",
  history: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3h3M12 8v4l2.5 2.5",
  columns: "M4.5 5h6v14h-6zM13.5 5h6v14h-6z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  spark: "M12 4v4M12 16v4M4 12h4M16 12h4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
  // Search: the ring again, with a short handle.
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16 16l4 4",
  // Enter: return key.
  enter: "M19 5.5v5a3.5 3.5 0 0 1-3.5 3.5H5.5M9 10.5 5.5 14 9 17.5",
  // Paperclip-free "material": a page with a folded corner.
  page: "M6.5 3.5h7l4 4v13h-11zM13.5 3.5v4h4",
  use: "",
  portfolio: "",
  dashboard: "",
};

export type IconName = keyof typeof P & string;

/** Closed shapes for the four destinations. Not a line-icon set. */
function Mark({ name }: { name: IconName }) {
  if (name === "home") {
    return (
      <>
        <circle cx="12" cy="12" r="6.6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.35" fill="currentColor" />
      </>
    );
  }
  if (name === "chat") {
    return (
      <>
        <path
          d="M9.35 6.2C6.4 8.1 5.1 10 5.1 12s1.3 3.9 4.25 5.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M14.65 6.2c2.95 1.9 4.25 4 4.25 5.8s-1.3 3.9-4.25 5.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    );
  }
  if (name === "compare") {
    return (
      <>
        <rect x="4" y="13" width="3.4" height="6.2" rx="0.6" fill="currentColor" />
        <rect x="10.3" y="8" width="3.4" height="11.2" rx="0.6" fill="currentColor" />
        <rect x="16.6" y="4.6" width="3.4" height="14.6" rx="0.6" fill="currentColor" />
      </>
    );
  }
  if (name === "market") {
    // The book: three price levels, longest at the top.
    return <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M5.5 7.5h13M5.5 12h9M5.5 16.5h6" />;
  }
  if (name === "use") {
    return (
      <>
        <circle cx="8.2" cy="12" r="3.15" stroke="currentColor" strokeWidth="1.5" />
        <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M11.1 12H19M16.4 12v2.7M13.7 12v1.8" />
      </>
    );
  }
  if (name === "portfolio") {
    return (
      <>
        <rect x="4.2" y="6" width="15.6" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path stroke="currentColor" strokeWidth="1.5" d="M4.2 10.2h15.6" />
      </>
    );
  }
  if (name === "dashboard") {
    return (
      <>
        <rect x="4.2" y="4.5" width="15.6" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M7.6 14.4 10.3 11l2.3 2L16.6 8.6" />
      </>
    );
  }
  return <path d={P[name]} />;
}

const DRAWN = new Set(["home", "chat", "compare", "market", "use", "portfolio", "dashboard"]);

export function Icon({ name, size = 18, className = "", strokeWidth = 1.6 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  const drawn = DRAWN.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={drawn ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      <Mark name={name} />
    </svg>
  );
}

export type NavId =
  | "home"
  | "dashboard"
  | "market"
  | "use"
  | "portfolio"
  | "chat"
  | "subscribe"
  | "compare"
  | "billing"
  | "rewards"
  | "settings"
  | "help"
  | "developer";

export type NavLink = { id: NavId; href: string; label: string; icon: IconName };

/** The exchange: see the price, trade it, use it, check what you hold. */
export const PRIMARY_NAV: NavLink[] = [
  { id: "home", href: "/lab/home", label: "Overview", icon: "home" },
  { id: "market", href: "/lab/market", label: "Market", icon: "market" },
  { id: "use", href: "/lab/keys", label: "Use", icon: "use" },
  { id: "chat", href: "/lab/ai", label: "AI", icon: "chat" },
  { id: "portfolio", href: "/lab/billing", label: "Portfolio", icon: "portfolio" },
  { id: "dashboard", href: "/lab/dashboard", label: "Dashboard", icon: "dashboard" },
];

export const SECONDARY_NAV: NavLink[] = [
  { id: "subscribe", href: "/lab/subscribe", label: "Subscription", icon: "billing" },
  { id: "compare", href: "/lab/compare", label: "Price a task", icon: "compare" },
  { id: "settings", href: "/lab/settings", label: "Account & Settings", icon: "settings" },
  { id: "help", href: "/lab/faq", label: "FAQ", icon: "help" },
];

/** Legacy LabChrome `active` values → new nav ids. Developer tools live under Settings. */
export function toNavId(active: string): NavId {
  switch (active) {
    case "home":
      return "home";
    case "ai":
    case "chat":
      return "chat";
    case "subscribe":
      return "subscribe";
    case "compare":
    case "models":
    case "arena":
    case "leaderboard":
      return "compare";
    case "market":
    case "inference":
      return "market";
    case "keys":
    case "apis":
    case "use":
      return "use";
    case "billing":
    case "activity":
    case "portfolio":
      return "portfolio";
    case "earn":
      return "rewards";
    case "dashboard":
    case "network":
      return "dashboard";
    case "overview":
    case "settings":
      return "settings";
    case "faq":
    case "help":
      return "help";
    default:
      return "developer";
  }
}
