"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import {
  aggregateGpuModels,
  enrichOffer,
  type GpuCatalogResponse,
  type GpuModelSummary,
  type GpuOffer,
  type PickStrategy,
} from "@/lib/lab/compute";
import { listInstances, refreshServerInstances, type GpuInstance } from "@/lib/lab/compute-instances";
import { GpuChoose } from "@/components/lab/compute/gpu-choose";
import { GpuOffers } from "@/components/lab/compute/gpu-offers";
import { CheckoutDrawer } from "@/components/lab/compute/checkout-drawer";
import { ProvisionOverlay } from "@/components/lab/compute/provision-overlay";
import { CompareOffersModal } from "@/components/lab/compute/compare-offers-modal";
import { useLabAuth } from "@/lib/lab/auth";

type Step = 1 | 2;
type Topology = "all" | "single" | "multi";

export default function ComputePageClient() {
  const { requireAuth, getAccessToken } = useLabAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<GpuCatalogResponse | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [topology, setTopology] = useState<Topology>("all");
  const [checkout, setCheckout] = useState<{
    offer: GpuOffer;
    mode: "prime" | "sandbox";
  } | null>(null);
  const [provisioning, setProvisioning] = useState<GpuInstance | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [instances, setInstances] = useState<GpuInstance[]>([]);
  const [pickStrategy] = useState<PickStrategy>("best-value");
  const [highlightOfferId, setHighlightOfferId] = useState<string | null>(null);

  const refreshInstances = useCallback(() => {
    void refreshServerInstances(getAccessToken)
      .then(setInstances)
      .catch(() => setInstances(listInstances()));
  }, [getAccessToken]);

  useEffect(() => {
    refreshInstances();
    const onChange = () => refreshInstances();
    window.addEventListener("tensora-instances-change", onChange);
    return () => window.removeEventListener("tensora-instances-change", onChange);
  }, [refreshInstances]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/lab/gpus", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load GPUs (${res.status})`);
        const data = (await res.json()) as GpuCatalogResponse;
        if (cancelled) return;
        const demoMode = data.demoMode ?? !data.configured;
        data.offers = (data.offers || []).map((o) =>
          enrichOffer(o, { configured: data.configured, demoMode })
        );
        setCatalog(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const offers = catalog?.offers || [];

  const topologyOffers = useMemo(() => {
    if (topology === "all") return offers;
    return offers.filter((o) =>
      topology === "single" ? o.gpuCount <= 1 : o.gpuCount > 1
    );
  }, [offers, topology]);

  const models = useMemo(
    () => aggregateGpuModels(topologyOffers),
    [topologyOffers]
  );

  const selectedModel: GpuModelSummary | null = useMemo(() => {
    if (!selectedKey) return null;
    return models.find((m) => m.modelKey === selectedKey) || null;
  }, [models, selectedKey]);

  const selectedOffers = selectedModel?.offers || [];

  const runningCount = instances.filter(
    (i) => i.status === "running" || i.status === "starting" || i.status === "creating"
  ).length;

  function openGpu(modelKey: string, offerId?: string) {
    setSelectedKey(modelKey);
    setStep(2);
    setCompareIds([]);
    setHighlightOfferId(offerId || null);
  }

  return (
    <LabChrome
      active="compute"
      title="GPUs"
      status={
        catalog?.live
          ? { label: "Live", tone: "live" }
          : { label: "Market", tone: "muted" }
      }
    >
      <div className="w-full pb-2">
        {loading ? (
          <div className="flex h-[50dvh] min-h-[280px] items-center justify-center rounded-[var(--lab-radius-card)] border border-[var(--dark-border)] bg-[var(--dark)] text-[13px] text-white/50">
            Loading GPU marketplace…
          </div>
        ) : error ? (
          <div className="rounded-[var(--lab-radius-card)] border border-red-200 bg-red-50 px-6 py-10 text-center text-[13px] text-red-700">
            {error}
          </div>
        ) : step === 1 ? (
          <GpuChoose
            models={models}
            topology={topology}
            onTopologyChange={setTopology}
            onSelectGpu={(key, offerId) => openGpu(key, offerId)}
            fetchedAt={catalog?.fetchedAt}
            live={Boolean(catalog?.live)}
            runningCount={runningCount}
          />
        ) : selectedModel ? (
          <GpuOffers
            model={selectedModel}
            offers={selectedOffers}
            configured={Boolean(catalog?.configured)}
            demoMode={Boolean(catalog?.demoMode)}
            marketplace={catalog?.marketplace}
            highlightOfferId={highlightOfferId}
            onBack={() => setStep(1)}
            onRent={(o, mode) => {
              if (!requireAuth("/lab/compute")) return;
              setCheckout({ offer: o, mode });
            }}
            onCompareToggle={(id) => {
              setCompareIds((prev) => {
                if (prev.includes(id)) return prev.filter((x) => x !== id);
                if (prev.length >= 4) return prev;
                return [...prev, id];
              });
            }}
            compareIds={compareIds}
            onOpenCompare={() => setShowCompare(true)}
            pickStrategy={pickStrategy}
          />
        ) : null}
      </div>

      {checkout ? (
        <CheckoutDrawer
          offer={checkout.offer}
          mode={checkout.mode}
          onClose={() => setCheckout(null)}
          onLaunched={(inst) => {
            setCheckout(null);
            setProvisioning(inst);
          }}
        />
      ) : null}

      {provisioning ? (
        <ProvisionOverlay
          instance={provisioning}
          onDone={() => {
            setProvisioning(null);
            refreshInstances();
          }}
        />
      ) : null}

      {showCompare ? (
        <CompareOffersModal
          offers={selectedOffers.filter((o) => compareIds.includes(o.id))}
          demoMode={Boolean(catalog?.demoMode)}
          configured={Boolean(catalog?.configured)}
          onClose={() => setShowCompare(false)}
          onRent={(o, mode) => {
            if (!requireAuth("/lab/compute")) return;
            setShowCompare(false);
            setCheckout({ offer: o, mode });
          }}
          marketplace={catalog?.marketplace}
        />
      ) : null}
    </LabChrome>
  );
}
