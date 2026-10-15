"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { getCredits, refreshCreditsFromServer } from "@/lib/lab/credits";
import { effectiveCreditCost, marketDiscount } from "@/lib/olora/pricing";

export type MarketQuote = {
  bestAsk: number | null;
  bestBid: number | null;
  feeBps: number;
  /** Dollars paid per $1 of credits at the best ask, fee included. 1 when no ask. */
  creditCost: number;
  /** 0.06 = 6% below face. 0 when no live ask. */
  discount: number;
  askDepthUsd: number;
  loaded: boolean;
  error: string | null;
};

const EMPTY: MarketQuote = {
  bestAsk: null,
  bestBid: null,
  feeBps: 100,
  creditCost: 1,
  discount: 0,
  askDepthUsd: 0,
  loaded: false,
  error: null,
};

/** Live best price for credits, read from the real order book. */
export function useMarketQuote(pollMs = 15_000): MarketQuote {
  const { getAccessToken } = useLabAuth();
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;
  const [q, setQ] = useState<MarketQuote>(EMPTY);

  const load = useCallback(async () => {
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/market", { headers });
      if (!res.ok) throw new Error(`Market unavailable (${res.status})`);
      const data = (await res.json()) as {
        book?: { bestAsk: number | null; bestBid: number | null; depthAsk?: number };
        config?: { feeBps: number };
        yourFeeBps?: number;
      };
      const feeBps = data.yourFeeBps ?? data.config?.feeBps ?? 100;
      const bestAsk = data.book?.bestAsk ?? null;
      setQ({
        bestAsk,
        bestBid: data.book?.bestBid ?? null,
        feeBps,
        creditCost: effectiveCreditCost(bestAsk, feeBps),
        discount: marketDiscount(bestAsk, feeBps),
        askDepthUsd: data.book?.depthAsk ?? 0,
        loaded: true,
        error: null,
      });
    } catch (err) {
      setQ((prev) => ({ ...prev, loaded: true, error: err instanceof Error ? err.message : "Unavailable" }));
    }
  }, []);

  useEffect(() => {
    void load();
    if (!pollMs) return;
    const t = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(t);
  }, [load, pollMs]);

  return q;
}

/** Credit balance, synced with the server ledger when signed in. */
export function useBalance() {
  const { getAccessToken, authenticated, ready } = useLabAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    setCredits(getCredits());
    const onChange = () => setCredits(getCredits());
    window.addEventListener("tensora-credits-change", onChange);
    return () => window.removeEventListener("tensora-credits-change", onChange);
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void refreshCreditsFromServer(getAccessToken).then((snap) => {
      if (snap) setCredits(snap.credits);
    });
  }, [ready, authenticated, getAccessToken]);

  return { credits: authenticated ? credits : null, authenticated, ready };
}

/* ── Conversations (kept in this browser only) ─────────── */

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  cost?: number | null;
  included?: boolean;
  error?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
  messages: StoredMessage[];
};

const CONV_KEY = "olora-conversations";
const CONV_EVENT = "olora-conversations-change";

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CONV_KEY) || "[]");
    return Array.isArray(raw) ? (raw as Conversation[]) : [];
  } catch {
    return [];
  }
}

export function saveConversation(conv: Conversation) {
  const rest = loadConversations().filter((c) => c.id !== conv.id);
  const next = [conv, ...rest].slice(0, 50);
  try {
    localStorage.setItem(CONV_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CONV_EVENT));
  } catch {
    /* storage full — ignore */
  }
}

export function deleteConversation(id: string) {
  const next = loadConversations().filter((c) => c.id !== id);
  localStorage.setItem(CONV_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CONV_EVENT));
}

export function useConversations() {
  const [list, setList] = useState<Conversation[]>([]);
  useEffect(() => {
    setList(loadConversations());
    const on = () => setList(loadConversations());
    window.addEventListener(CONV_EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(CONV_EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return list;
}

/** Hand-off from the Home composer to Chat. */
export const PENDING_PROMPT_KEY = "olora-pending-prompt";
