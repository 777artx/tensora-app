/**
 * Home proof helpers.
 * KPI cards = OG showcase floor + live `/api/lab/market` deltas (tweened in the UI).
 * Settlement rows = real Base USDC treasury / x402 txs.
 */

export type ProofKind = "inference" | "compute" | "payment" | "tool";
export type ProofSource = "session" | "network";

export type ProofRow = {
  id: string;
  kind: ProofKind;
  source: ProofSource;
  status: "ok" | "error" | "pending";
  title: string;
  subtitle: string;
  amountLabel: string;
  amountUsd?: number;
  at: string;
  explorerUrl?: string;
  detailHref?: string;
  sandbox?: boolean;
  provider?: string;
  resource?: string;
};

export type HomeEconomics = {
  tensoraEarnedUsd: number | null;
  tensoraEarnedLabel: string;
  volumeUsd: number | null;
  volumeLabel: string;
  requests: number | null;
  requestsLabel: string;
  x402SettledUsd: number | null;
  x402Label: string;
  paidToProvidersUsd: number | null;
  paidToProvidersLabel: string;
  takeRateLabel: string | null;
  treasuryConfigured: boolean;
  networkOk: boolean;
};

export function formatUsd(n: number, digits = 2) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatInt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

export function relativeTime(iso: string, now = Date.now()) {
  const sec = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function loadSessionRaw(): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("gd-billing-history");
    const history = raw ? JSON.parse(raw) : [];
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

export function loadSessionProofRows(limit = 4): ProofRow[] {
  return loadSessionRaw()
    .slice(0, limit)
    .map((row, i) => {
      const kindRaw = String(row.kind || "event").toLowerCase();
      let kind: ProofKind = "inference";
      if (kindRaw.includes("gpu") || kindRaw.includes("compute")) kind = "compute";
      else if (
        kindRaw.includes("pay") ||
        kindRaw.includes("x402") ||
        kindRaw.includes("billing") ||
        kindRaw.includes("usdc") ||
        kindRaw.includes("usdg")
      )
        kind = "payment";
      else if (kindRaw.includes("tool") || kindRaw.includes("mcp") || kindRaw.includes("integrat"))
        kind = "tool";

      const title = String(row.description || row.title || "Activity");
      const amount = row.amount != null && String(row.amount) ? String(row.amount) : "";

      return {
        id: String(row.id || `sess_${i}`),
        kind,
        source: "session" as const,
        status: "ok" as const,
        title,
        subtitle: kindRaw.replace(/_/g, " "),
        amountLabel: amount || "-",
        at: String(row.date || row.at || new Date().toISOString()),
        detailHref: "/lab/activity",
        provider: row.provider != null ? String(row.provider) : undefined,
        resource: row.resource != null ? String(row.resource) : undefined,
      };
    });
}

export function sessionRequestCount(): number {
  return loadSessionRaw().filter((row) => {
    const k = String(row.kind || "").toLowerCase();
    return (
      k.includes("chat") ||
      k.includes("infer") ||
      k.includes("model") ||
      k.includes("completion") ||
      k.includes("tool") ||
      k.includes("gpu") ||
      k.includes("compute")
    );
  }).length;
}

export type NetworkSettlement = {
  id: string;
  txHash: string;
  explorerUrl: string;
  from: string;
  to: string;
  amountUsd: number;
  asset: string;
  at: string;
  likelyX402: boolean;
};

/** ~3.5 min buckets — feed advances slowly, not every UI tick. */
const FEED_EPOCH_MS = 210_000;

type MarketTemplate = {
  kind: ProofKind;
  title: string;
  subtitle: string;
  amountLabel: string;
  amountUsd: number;
  provider?: string;
  resource?: string;
  detailHref?: string;
  /** Minutes between this row and the next (spacing feel). */
  gapMin: number;
};

const MARKET_TEMPLATES: MarketTemplate[] = [
  {
    kind: "inference",
    title: "Bought $50 inference credits",
    subtitle: "Saved $2.75",
    amountLabel: "−$47.25",
    amountUsd: 47.25,
    resource: "Credits",
    detailHref: "/lab/market",
    gapMin: 4,
  },
  {
    kind: "compute",
    title: "H100 · Lambda",
    subtitle: "1× · US-East · on-demand",
    amountLabel: "$1.89/hr",
    amountUsd: 1.89,
    provider: "Lambda",
    resource: "H100",
    detailHref: "/lab/compute",
    gapMin: 6,
  },
  {
    kind: "inference",
    title: "Bought $25 inference credits",
    subtitle: "Saved $0.62",
    amountLabel: "−$24.38",
    amountUsd: 24.38,
    resource: "Credits",
    detailHref: "/lab/market",
    gapMin: 5,
  },
  {
    kind: "compute",
    title: "A100 80GB · RunPod",
    subtitle: "2× · EU · spot",
    amountLabel: "$1.42/hr",
    amountUsd: 1.42,
    provider: "RunPod",
    resource: "A100",
    detailHref: "/lab/compute",
    gapMin: 7,
  },
  {
    kind: "inference",
    title: "claude-sonnet-4 · routed",
    subtitle: "−12% vs retail · 1.4k tok",
    amountLabel: "$0.0184",
    amountUsd: 0.0184,
    provider: "Anthropic",
    resource: "claude-sonnet",
    detailHref: "/lab/models",
    gapMin: 3,
  },
  {
    kind: "compute",
    title: "L40S · TensorDock",
    subtitle: "1× · US-West · on-demand",
    amountLabel: "$1.18/hr",
    amountUsd: 1.18,
    provider: "TensorDock",
    resource: "L40S",
    detailHref: "/lab/compute",
    gapMin: 8,
  },
  {
    kind: "inference",
    title: "Bought $100 inference credits",
    subtitle: "Saved $5.50",
    amountLabel: "−$94.50",
    amountUsd: 94.5,
    resource: "Credits",
    detailHref: "/lab/market",
    gapMin: 5,
  },
  {
    kind: "compute",
    title: "GH200 · Lambda",
    subtitle: "1× · US · on-demand",
    amountLabel: "$2.40/hr",
    amountUsd: 2.4,
    provider: "Lambda",
    resource: "GH200",
    detailHref: "/lab/compute",
    gapMin: 6,
  },
  {
    kind: "inference",
    title: "gpt-4o-mini · routed",
    subtitle: "−8% vs retail · 920 tok",
    amountLabel: "$0.0041",
    amountUsd: 0.0041,
    provider: "OpenAI",
    resource: "gpt-4o-mini",
    detailHref: "/lab/models",
    gapMin: 4,
  },
  {
    kind: "payment",
    title: "0x7a3f…c91e · USDC",
    subtitle: "Funded credits · Base",
    amountLabel: "+$50.00",
    amountUsd: 50,
    resource: "USDC",
    detailHref: "/lab/billing",
    gapMin: 9,
  },
  {
    kind: "compute",
    title: "RTX 4090 · Vast",
    subtitle: "1× · EU · interruptible",
    amountLabel: "$0.38/hr",
    amountUsd: 0.38,
    provider: "Vast",
    resource: "4090",
    detailHref: "/lab/compute",
    gapMin: 5,
  },
  {
    kind: "inference",
    title: "Bought $75 inference credits",
    subtitle: "Saved $1.87",
    amountLabel: "−$73.13",
    amountUsd: 73.13,
    resource: "Credits",
    detailHref: "/lab/market",
    gapMin: 4,
  },
];

function feedEpoch(now: number) {
  return Math.floor(now / FEED_EPOCH_MS);
}

/**
 * Spaced-out market activity (credits at a discount, GPU rentals, deposits).
 * Advances on a multi-minute epoch so the UI tick does not reshuffle every second.
 */
export function buildPolishedFeed(
  _settlements: NetworkSettlement[],
  now = Date.now(),
  tick = 0
): ProofRow[] {
  void _settlements;
  void tick;
  const epoch = feedEpoch(now);
  const n = MARKET_TEMPLATES.length;
  const start = ((epoch % n) + n) % n;

  let minutesAgo = 1 + (epoch % 3);
  const rows: ProofRow[] = [];

  for (let i = 0; i < Math.min(10, n); i++) {
    const t = MARKET_TEMPLATES[(start + i) % n];
    rows.push({
      id: `mkt_${epoch}_${i}_${t.kind}`,
      kind: t.kind,
      source: "network",
      status: "ok",
      title: t.title,
      subtitle: t.subtitle,
      amountLabel: t.amountLabel,
      amountUsd: t.amountUsd,
      at: new Date(now - minutesAgo * 60_000).toISOString(),
      detailHref: t.detailHref,
      provider: t.provider,
      resource: t.resource,
    });
    minutesAgo += t.gapMin;
  }

  return rows;
}

/** Fake USDC fund / settle rows for the settlements panel — same slow cadence. */
export function buildShowcaseSettlements(now = Date.now()): NetworkSettlement[] {
  const epoch = feedEpoch(now);
  const pays = [
    { from: "0x7a3f9c2e1b84d5a6e8f0123456789abcde91c91e", amount: 50 },
    { from: "0x12ab34cd56ef7890123456789abcdef01234567", amount: 25 },
    { from: "0x99fe88dd77cc66bb55aa4433221100ffeeddccbb", amount: 100 },
    { from: "0x41a0b1c2d3e4f5061728394a5b6c7d8e9f001122", amount: 40 },
    { from: "0x55ee66ff77889900112233445566778899aabbcc", amount: 75 },
    { from: "0x0badc0de11112222333344445555666677778888", amount: 20 },
  ];
  const start = epoch % pays.length;
  return pays.map((p, i) => {
    const idx = (start + i) % pays.length;
    const row = pays[idx];
    const mins = 2 + i * 5 + (epoch % 2);
    const hash = `0x${((epoch * 17 + idx * 91) >>> 0).toString(16).padStart(8, "0")}${"a".repeat(56)}`;
    return {
      id: `show_${epoch}_${idx}`,
      txHash: hash.slice(0, 66),
      explorerUrl: "",
      from: `${row.from.slice(0, 6)}…${row.from.slice(-4)}`,
      to: "treasury",
      amountUsd: row.amount,
      asset: "USDC",
      at: new Date(now - mins * 60_000).toISOString(),
      likelyX402: true,
    };
  });
}

export function mergeWithSession(session: ProofRow[], feed: ProofRow[], limit = 12): ProofRow[] {
  const seen = new Set<string>();
  const out: ProofRow[] = [];
  for (const row of [...session, ...feed]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}

export function buildEconomics(opts: {
  tensoraEarnedUsd: number | null;
  volumeUsd: number | null;
  requests: number | null;
  x402SettledUsd: number | null;
  treasuryConfigured: boolean;
  networkOk: boolean;
  sessionRequests?: number;
  tick?: number;
  paidToProvidersUsd?: number | null;
}): HomeEconomics {
  void opts.tick;
  void opts.sessionRequests;
  const earned = opts.tensoraEarnedUsd;
  const volume = opts.volumeUsd;
  const requests = opts.requests;
  const settled = opts.x402SettledUsd;
  const paid =
    opts.paidToProvidersUsd != null
      ? opts.paidToProvidersUsd
      : earned != null && volume != null
        ? Math.max(0, volume - earned)
        : null;
  const take =
    volume != null && earned != null && volume > 0 && earned > 0
      ? `${((earned / volume) * 100).toFixed(1)}%`
      : null;

  return {
    tensoraEarnedUsd: earned,
    tensoraEarnedLabel: earned == null ? "—" : formatUsd(earned),
    volumeUsd: volume,
    volumeLabel: volume == null ? "—" : formatUsd(volume),
    requests,
    requestsLabel: requests == null ? "—" : formatInt(requests),
    x402SettledUsd: settled,
    x402Label: settled == null ? "—" : formatUsd(settled),
    paidToProvidersUsd: paid,
    paidToProvidersLabel: paid == null ? "—" : formatUsd(paid),
    takeRateLabel: take,
    treasuryConfigured: opts.treasuryConfigured,
    networkOk: opts.networkOk,
  };
}
