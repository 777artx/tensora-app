/**
 * Olora Plus is a 30-day pack, paid from the cash balance. It does not renew
 * by itself and it never includes unlimited usage. Flagship models stay on credits.
 */
import { LINEUP } from "@/lib/olora/models";

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export type Plan = {
  id: "payg" | "plus";
  name: string;
  priceLabel: string;
  cadence: string;
  summary: string;
  includes: string[];
  limitNote: string;
  available: boolean;
};

export const PLUS_PRICE_USD = num(process.env.NEXT_PUBLIC_OLORA_PLUS_PRICE, 20);
export const PLUS_MESSAGE_LIMIT = Math.round(num(process.env.NEXT_PUBLIC_OLORA_PLUS_MESSAGES, 1500));
export const PLUS_PERIOD_DAYS = 30;

export type TierId = "plus" | "pro" | "max";

export type SubTier = {
  id: TierId;
  name: string;
  priceUsd: number;
  messages: number;
  /** Credits added to the balance on purchase, for flagship models. */
  bonusCredits: number;
  blurb: string;
  perks: string[];
  featured?: boolean;
};

export const SUB_TIERS: SubTier[] = [
  {
    id: "plus",
    name: "Plus",
    priceUsd: PLUS_PRICE_USD,
    messages: PLUS_MESSAGE_LIMIT,
    bonusCredits: 0,
    blurb: "For daily chat and light coding.",
    perks: [
      `${PLUS_MESSAGE_LIMIT.toLocaleString("en-US")} everyday messages`,
      "Every everyday model in the lineup",
      "Flagship models on credits",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceUsd: 50,
    messages: 5000,
    bonusCredits: 10,
    blurb: "For people who live in the chat.",
    perks: ["5,000 everyday messages", "$10 of flagship credits included", "Priority routing at peak hours"],
    featured: true,
  },
  {
    id: "max",
    name: "Max",
    priceUsd: 100,
    messages: 12000,
    bonusCredits: 30,
    blurb: "For teams and heavy agent use.",
    perks: ["12,000 everyday messages", "$30 of flagship credits included", "Priority routing at peak hours"],
  },
];

export function tierById(id: string | null | undefined): SubTier | null {
  return SUB_TIERS.find((t) => t.id === id) ?? null;
}

const EVERYDAY_IDS = new Set(LINEUP.filter((m) => m.tier === "everyday").map((m) => m.id));

export function isEverydayModel(id: string | null | undefined): boolean {
  return !!id && EVERYDAY_IDS.has(id);
}

export const PLANS: Plan[] = [
  {
    id: "payg",
    name: "Pay as you go",
    priceLabel: "$0",
    cadence: "",
    summary: "Add credits and pay only for what you use.",
    includes: [
      "Every model in the Olora lineup",
      "Pay each provider's list rate from one balance",
      "Buy credits below face value on the Market",
      "Sell unused credits whenever you like",
    ],
    limitNote: "Credits don't expire.",
    available: true,
  },
  {
    id: "plus",
    name: "Olora Plus",
    priceLabel: `$${PLUS_PRICE_USD}`,
    cadence: "for 30 days",
    summary: "A fixed pack of everyday messages. Flagship models still use credits.",
    includes: [
      `${PLUS_MESSAGE_LIMIT.toLocaleString()} messages on everyday models`,
      "Flagship models draw from your credit balance",
      "Pay as you go stays available for everything else",
    ],
    limitNote: "Unused messages don't roll over and can't be sold. This does not renew on its own.",
    available: true,
  },
];

export function currentPlanName(): string {
  return "Pay as you go";
}
