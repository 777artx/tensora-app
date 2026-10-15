"use client";

import { useEffect, useMemo, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";

type ProviderRow = {
  host?: string;
  hostSlug?: string;
  modelName?: string;
  creator?: string;
  latency?: number;
  speed?: number;
  priceBlended?: number;
  intelligence?: number;
  rank?: number;
};

type ProviderCard = {
  id: string;
  name: string;
  models: number;
  avgLatency?: number;
  avgPrice?: number;
  topModel?: string;
};

export default function NetworkPage() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lab/providers");
        const data = await res.json();
        const list = Array.isArray(data?.rows)
          ? data.rows
          : Array.isArray(data)
            ? data
            : Array.isArray(data?.providers)
              ? data.providers
              : [];
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load providers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const providers = useMemo(() => {
    const map = new Map<string, ProviderCard & { latencySum: number; priceSum: number; n: number }>();
    for (const row of rows) {
      const name = String(row.host || row.creator || "Unknown");
      const id = String(row.hostSlug || name.toLowerCase());
      const cur = map.get(id) || {
        id,
        name,
        models: 0,
        topModel: row.modelName,
        latencySum: 0,
        priceSum: 0,
        n: 0,
      };
      cur.models += 1;
      if (typeof row.latency === "number") {
        cur.latencySum += row.latency;
        cur.n += 1;
      }
      if (typeof row.priceBlended === "number") {
        cur.priceSum += row.priceBlended;
      }
      if (!cur.topModel && row.modelName) cur.topModel = row.modelName;
      map.set(id, cur);
    }
    return Array.from(map.values())
      .map((p) => ({
        id: p.id,
        name: p.name,
        models: p.models,
        topModel: p.topModel,
        avgLatency: p.n ? p.latencySum / p.n : undefined,
        avgPrice: p.models ? p.priceSum / p.models : undefined,
      }))
      .sort((a, b) => b.models - a.models);
  }, [rows]);

  return (
    <LabChrome active="network" title="Network">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#d7003a]">Network</p>
          <h1 className="font-display m-0 text-3xl tracking-tight text-white">
            Compute providers
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#9194a1]">
            Marketplace supply Olora routes workloads across. Browse hosts, models, and blended
            pricing.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-[#777a88]">Loading providers…</p>
        ) : error ? (
          <p className="text-sm text-[#ff573d]">{error}</p>
        ) : providers.length === 0 ? (
          <div className="rounded border border-[#2e3038] bg-[#0b0c0e] p-6 text-sm text-[#9194a1]">
            No providers in the catalog yet. GPU listings under Cloud still work in demo mode.
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {providers.map((p) => (
              <li key={p.id} className="rounded border border-[#2e3038] bg-[#0b0c0e] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="m-0 text-base font-medium text-white">{p.name}</h2>
                  <span className="text-xs text-[#00ff5e]">{p.models} models</span>
                </div>
                {p.topModel ? (
                  <p className="mt-2 m-0 truncate text-xs text-[#777a88]">{p.topModel}</p>
                ) : null}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#9194a1]">
                  {p.avgLatency != null ? (
                    <>
                      <dt>Avg latency</dt>
                      <dd className="m-0 text-right text-[#c8cad3]">
                        {p.avgLatency.toFixed(2)} s
                      </dd>
                    </>
                  ) : null}
                  {p.avgPrice != null ? (
                    <>
                      <dt>Blended $/M</dt>
                      <dd className="m-0 text-right text-[#c8cad3]">
                        ${p.avgPrice.toFixed(2)}
                      </dd>
                    </>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </LabChrome>
  );
}
