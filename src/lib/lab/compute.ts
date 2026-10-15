/** Shared Compute marketplace types, provider registry, and pick logic. */

export type StockStatus = "Available" | "Low" | "Unavailable" | "Limited" | "Quote";

export type OfferType = "on-demand" | "spot" | "marketplace" | "enterprise";

export type IntegrationKind = "integrated" | "external";

export type GpuOffer = {
  id: string;
  cloudId: string;
  gpuType: string;
  label: string;
  socket: string;
  provider: string;
  region: string;
  country: string;
  dataCenter: string | null;
  gpuCount: number;
  gpuMemory: number;
  vcpu: number;
  memoryGb: number;
  pricePerHour: number;
  /** House discounted hourly when subsidy pool remains. */
  tensoraPricePerHour?: number;
  stockStatus: string;
  images: string[];
  source: "live" | "catalog";
  /** Derived */
  offerType?: OfferType;
  integration?: IntegrationKind;
};

export type GpuCatalogResponse = {
  configured: boolean;
  live: boolean;
  error: string | null;
  marketplace: string;
  offers: GpuOffer[];
  total: number;
  demoMode?: boolean;
  gpuSubsidyUsd?: number;
  gpuDiscountBps?: number;
  /** ISO timestamp when this catalog payload was produced */
  fetchedAt?: string;
};

export type GpuModelSummary = {
  /** Unique card key: gpuType + socket */
  modelKey: string;
  gpuType: string;
  socket: string;
  label: string;
  gpuMemory: number;
  offers: GpuOffer[];
  offerCount: number;
  availableOfferCount: number;
  minPrice: number | null;
  providers: string[];
  regions: string[];
  vcpuHint: number;
  memoryHint: number;
  /** GPU counts offered for this model, e.g. [1, 2, 8]. */
  configs: number[];
  available: boolean;
};

export type PickStrategy = "best-value" | "lowest-price" | "most-available";

export type TensoraPickResult = {
  offer: GpuOffer;
  strategy: PickStrategy;
  reason: string;
};

export const PROVIDER_META: Record<
  string,
  { label: string; url: string; logoDomain: string }
> = {
  lambdalabs: {
    label: "Lambda Cloud",
    url: "https://cloud.lambdalabs.com/",
    logoDomain: "lambdalabs.com",
  },
  runpod: {
    label: "RunPod",
    url: "https://www.runpod.io/console/gpu-cloud",
    logoDomain: "runpod.io",
  },
  massedcompute: {
    label: "Massed Compute",
    url: "https://massedcompute.com/",
    logoDomain: "massedcompute.com",
  },
  datacrunch: {
    label: "DataCrunch",
    url: "https://datacrunch.io/",
    logoDomain: "datacrunch.io",
  },
  hyperstack: {
    label: "Hyperstack",
    url: "https://www.hyperstack.cloud/",
    logoDomain: "hyperstack.cloud",
  },
  nebius: {
    label: "Nebius",
    url: "https://nebius.com/",
    logoDomain: "nebius.com",
  },
  tensordock: {
    label: "TensorDock",
    url: "https://tensordock.com/",
    logoDomain: "tensordock.com",
  },
  fluidstack: {
    label: "FluidStack",
    url: "https://www.fluidstack.io/",
    logoDomain: "fluidstack.io",
  },
  vultr: {
    label: "Vultr",
    url: "https://www.vultr.com/",
    logoDomain: "vultr.com",
  },
  crusoecloud: {
    label: "Crusoe",
    url: "https://crusoe.ai/",
    logoDomain: "crusoe.ai",
  },
  vast: {
    label: "Vast",
    url: "https://vast.ai/",
    logoDomain: "vast.ai",
  },
  coreweave: {
    label: "CoreWeave",
    url: "https://www.coreweave.com/",
    logoDomain: "coreweave.com",
  },
  primeintellect: {
    label: "Prime Intellect",
    url: "https://app.primeintellect.ai/dashboard/on-demand-gpus",
    logoDomain: "primeintellect.ai",
  },
};

export const REGION_LABELS: Record<string, string> = {
  united_states: "US",
  canada: "Canada",
  europe_west: "EU West",
  europe_east: "EU East",
  asia_pacific: "Asia Pacific",
  unknown: "Unknown",
};

/** Providers Olora can provision when Prime live inventory is available. */
export const PRIME_INTEGRATED = true;

export function providerLabel(provider: string): string {
  const key = String(provider || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const hit = Object.entries(PROVIDER_META).find(([k]) => key.includes(k) || k.includes(key));
  if (hit) return hit[1].label;
  return provider || "Provider";
}

export function providerUrl(provider: string, fallbackMarketplace?: string): string {
  const key = String(provider || "").toLowerCase();
  for (const [id, meta] of Object.entries(PROVIDER_META)) {
    if (key.includes(id) || id.includes(key.replace(/[^a-z0-9]/g, ""))) return meta.url;
  }
  return fallbackMarketplace || PROVIDER_META.primeintellect.url;
}

export function providerLogo(provider: string): string {
  const key = String(provider || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const hit = Object.entries(PROVIDER_META).find(([k]) => key.includes(k) || k.includes(key));
  const domain = hit?.[1].logoDomain || "nvidia.com";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

export function regionLabel(region: string): string {
  if (REGION_LABELS[region]) return REGION_LABELS[region];
  const words = String(region || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/^(us|eu|uk|apac)$/i.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()));
  return words.join(" ") || "-";
}

export function isOfferInStock(offer: GpuOffer): boolean {
  const s = String(offer.stockStatus || "").toLowerCase();
  if (s.includes("unavail")) return false;
  return Number(offer.pricePerHour) > 0;
}

export function stockLabel(offer: GpuOffer): StockStatus {
  const s = String(offer.stockStatus || "").toLowerCase();
  if (s.includes("unavail")) return "Unavailable";
  if (s.includes("limited") || s.includes("low")) return "Limited";
  if (!s || s === "unknown" || Number(offer.pricePerHour) <= 0) return "Quote";
  return "Available";
}

export function inferOfferType(offer: GpuOffer): OfferType {
  const p = String(offer.provider || "").toLowerCase();
  if (p.includes("vast") || p.includes("tensordock")) return "marketplace";
  if (p.includes("coreweave") || Number(offer.pricePerHour) <= 0) return "enterprise";
  return "on-demand";
}

/**
 * Integration honesty:
 * - live + Prime configured → Rent on Olora
 * - everything else → External (View provider)
 * Sandbox is a separate developer affordance, not an integration kind.
 */
export function resolveIntegration(
  offer: GpuOffer,
  opts: { configured: boolean; demoMode?: boolean }
): IntegrationKind {
  void opts.demoMode;
  if (opts.configured && offer.source === "live" && isOfferInStock(offer)) {
    return "integrated";
  }
  return "external";
}

/** Demo-only secondary action. never the primary marketplace CTA. */
export function canTrySandbox(
  offer: GpuOffer,
  opts: { demoMode: boolean; configured: boolean }
): boolean {
  // Allow sandbox when live GPU (Prime) is not configured, even outside demoMode.
  return !opts.configured && isOfferInStock(offer) && offer.pricePerHour > 0;
}

export function enrichOffer(
  offer: GpuOffer,
  opts: { configured: boolean; demoMode: boolean }
): GpuOffer {
  return {
    ...offer,
    offerType: inferOfferType(offer),
    integration: resolveIntegration(offer, opts),
  };
}

export function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "Quote";
  return `$${n.toFixed(n < 1 ? 3 : 2)}`;
}

/** What the buyer pays. House price while the subsidy applies, otherwise the listed rate. */
export function buyerHourly(offer: Pick<GpuOffer, "pricePerHour" | "tensoraPricePerHour">): number {
  const listed = Number(offer.pricePerHour) || 0;
  const house = Number(offer.tensoraPricePerHour);
  if (house > 0 && listed > 0 && house < listed) return house;
  return listed;
}

/** Buyer price divided across the GPUs in the node. */
export function perGpuHourly(offer: Pick<GpuOffer, "pricePerHour" | "tensoraPricePerHour" | "gpuCount">): number {
  return buyerHourly(offer) / Math.max(1, offer.gpuCount || 1);
}

/** Whole-percent savings versus the provider list price. 0 when there is no house discount. */
export function houseSavePct(offer: Pick<GpuOffer, "pricePerHour" | "tensoraPricePerHour">): number {
  const listed = Number(offer.pricePerHour) || 0;
  const pay = buyerHourly(offer);
  if (!(listed > 0) || pay >= listed) return 0;
  return Math.round((1 - pay / listed) * 100);
}

export function shortGpuName(label: string): string {
  return label
    .replace(/\s+(SXM|PCIe)\s*/i, " ")
    .replace(/\s+\d+\s*GB$/i, "")
    .replace(/\s+/g, " ")
    .trim() || label;
}

export function modelKeyFor(offer: Pick<GpuOffer, "gpuType" | "socket">): string {
  return `${offer.gpuType}::${offer.socket || "PCIe"}`;
}

export function aggregateGpuModels(offers: GpuOffer[]): GpuModelSummary[] {
  const byKey = new Map<string, GpuOffer[]>();
  for (const o of offers) {
    const key = modelKeyFor(o);
    const list = byKey.get(key) || [];
    list.push(o);
    byKey.set(key, list);
  }

  const featured = [
    "B300_262GB::SXM",
    "B200_180GB::SXM",
    "H200_141GB::SXM",
    "H100_80GB::SXM",
    "H100_80GB::PCIe",
    "A100_80GB::SXM",
    "A100_40GB::PCIe",
  ];

  const models: GpuModelSummary[] = [];
  for (const [modelKey, list] of byKey) {
    const priced = list.filter((o) => Number(o.pricePerHour) > 0);
    const availableOffers = list.filter(isOfferInStock);
    // Per-GPU hourly so 8× nodes don't hide behind a single-card price.
    const minPrice =
      priced.length > 0 ? Math.min(...priced.map(perGpuHourly)) : null;
    const single = availableOffers.find((o) => o.gpuCount <= 1) || list.find((o) => o.gpuCount <= 1);
    const first = single || list[0];
    const base = shortGpuName(first.label || first.gpuType.replace(/_/g, " "));
    models.push({
      modelKey,
      gpuType: first.gpuType,
      socket: first.socket || "PCIe",
      label: `${base} ${first.socket || ""}`.trim(),
      gpuMemory: first.gpuMemory || 0,
      offers: list,
      offerCount: list.length,
      availableOfferCount: availableOffers.length,
      minPrice,
      providers: [...new Set(list.map((o) => o.provider))],
      regions: [...new Set(list.map((o) => o.region))],
      vcpuHint: first.vcpu || 0,
      memoryHint: first.memoryGb || 0,
      configs: [...new Set(list.map((o) => Math.max(1, o.gpuCount)))].sort((a, b) => a - b),
      available: availableOffers.length > 0,
    });
  }

  models.sort((a, b) => {
    const ai = featured.indexOf(a.modelKey);
    const bi = featured.indexOf(b.modelKey);
    if (ai >= 0 || bi >= 0) {
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    }
    return a.label.localeCompare(b.label);
  });

  return models;
}

export function sortOffers(
  offers: GpuOffer[],
  sort: "cheapest" | "best-value" | "most-available"
): GpuOffer[] {
  const copy = [...offers];
  if (sort === "cheapest") {
    return copy.sort((a, b) => {
      const ap = a.pricePerHour > 0 ? a.pricePerHour : Infinity;
      const bp = b.pricePerHour > 0 ? b.pricePerHour : Infinity;
      return ap - bp;
    });
  }
  if (sort === "most-available") {
    const rank = (o: GpuOffer) => {
      const s = stockLabel(o);
      if (s === "Available") return 0;
      if (s === "Limited") return 1;
      if (s === "Quote") return 2;
      return 3;
    };
    return copy.sort((a, b) => rank(a) - rank(b) || a.pricePerHour - b.pricePerHour);
  }
  // best-value: price weighted by availability
  return copy.sort((a, b) => {
    const score = (o: GpuOffer) => {
      if (!isOfferInStock(o) || o.pricePerHour <= 0) return Infinity;
      const availBoost = stockLabel(o) === "Available" ? 1 : 1.25;
      return o.pricePerHour * availBoost;
    };
    return score(a) - score(b);
  });
}

export function pickOffer(
  offers: GpuOffer[],
  strategy: PickStrategy,
  preferredRegion?: string
): TensoraPickResult | null {
  const stocked = offers.filter(isOfferInStock);
  if (!stocked.length) return null;

  if (strategy === "lowest-price") {
    const sorted = sortOffers(stocked, "cheapest");
    const offer = sorted[0];
    return {
      offer,
      strategy,
      reason: `Lowest price among currently available offers (${formatPrice(offer.pricePerHour)}/hr).`,
    };
  }

  if (strategy === "most-available") {
    const sorted = sortOffers(stocked, "most-available");
    let offer = sorted[0];
    if (preferredRegion) {
      const regional = sorted.find((o) => o.region === preferredRegion);
      if (regional) offer = regional;
    }
    return {
      offer,
      strategy,
      reason: `Highest availability (${stockLabel(offer)}) among current offers${
        preferredRegion ? ` preferring ${regionLabel(preferredRegion)}` : ""
      }.`,
    };
  }

  // best-value: prefer available + mid/low price + more providers diversity isn't per-offer;
  // score = price × availability penalty, then slight boost for marketplace liquidity (vast/tensordock)
  // and integrated checkout when present. so pick ≠ always cheapest.
  const scored = stocked
    .map((o) => {
      let score = o.pricePerHour > 0 ? o.pricePerHour : 999;
      if (stockLabel(o) === "Limited") score *= 1.18;
      if (preferredRegion && o.region === preferredRegion) score *= 0.9;
      if (o.integration === "integrated") score *= 0.88;
      const p = o.provider.toLowerCase();
      // Prefer reliable on-demand over cheapest marketplace when within ~12%
      if (p.includes("vast") || p.includes("tensordock")) score *= 1.06;
      if (o.vcpu >= 24 && o.memoryGb >= 160) score *= 0.97;
      return { o, score };
    })
    .sort((a, b) => a.score - b.score);

  const best = scored[0];
  const cheapest = sortOffers(stocked, "cheapest")[0];
  const differs = cheapest && cheapest.id !== best.o.id;
  return {
    offer: best.o,
    strategy,
    reason: differs
      ? `Selected ${providerLabel(best.o.provider)} at ${formatPrice(best.o.pricePerHour)}/hr for availability and host specs, not the absolute floor (${formatPrice(cheapest.pricePerHour)}/hr on ${providerLabel(cheapest.provider)}).`
      : `Best available balance of price and stock (${formatPrice(best.o.pricePerHour)}/hr · ${providerLabel(best.o.provider)}).`,
  };
}

export function sortModels(
  models: GpuModelSummary[],
  sort: "cheapest" | "best-value" | "most-available" | "newest"
): GpuModelSummary[] {
  const copy = [...models];
  if (sort === "cheapest") {
    return copy.sort(
      (a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity)
    );
  }
  if (sort === "most-available") {
    return copy.sort((a, b) => b.availableOfferCount - a.availableOfferCount);
  }
  if (sort === "newest") {
    const order = [
      "B300_262GB::SXM",
      "B200_180GB::SXM",
      "H200_141GB::SXM",
      "H100_80GB::SXM",
      "H100_80GB::PCIe",
      "A100_80GB::SXM",
      "L40S_48GB::PCIe",
    ];
    return copy.sort((a, b) => {
      const ai = order.indexOf(a.modelKey);
      const bi = order.indexOf(b.modelKey);
      if (ai < 0 && bi < 0) return a.label.localeCompare(b.label);
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    });
  }
  // best-value
  return copy.sort((a, b) => {
    const score = (m: GpuModelSummary) => {
      if (m.minPrice == null) return Infinity;
      const dens = m.availableOfferCount > 0 ? 1 / m.availableOfferCount : 2;
      return m.minPrice * (0.7 + dens * 0.3);
    };
    return score(a) - score(b);
  });
}
