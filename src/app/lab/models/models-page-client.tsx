"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LabChrome } from "@/components/lab/lab-chrome";
import { ModelsShell, type ModelsTab } from "@/components/lab/models/models-shell";
import { ExploreCatalog } from "@/components/lab/models/explore-catalog";
import { ComparePlayground } from "@/components/lab/models/compare-playground";
import { UsageFooter } from "@/components/lab/models/usage-footer";
import type { CostTier } from "@/lib/lab/inference-catalog";
import { TENSORA_AUTO } from "@/lib/lab/inference-catalog";

export default function ModelsPageInner() {
  const search = useSearchParams();
  const [tab, setTab] = useState<ModelsTab>("explore");
  const [compareSeed, setCompareSeed] = useState<string[] | undefined>();
  const [autoTier, setAutoTier] = useState<CostTier | undefined>();

  useEffect(() => {
    const t = search.get("tab");
    if (t === "playground") setTab("playground");
  }, [search]);

  return (
    <LabChrome
      active="models"
      title="Models"
    >
      <ModelsShell tab={tab} onTabChange={setTab}>
        {tab === "explore" ? (
          <>
            <ExploreCatalog
              onTryAuto={(tier) => {
                setAutoTier(tier);
                setCompareSeed([TENSORA_AUTO.id, "anthropic/claude-sonnet-4"]);
                setTab("playground");
              }}
            />
            <UsageFooter />
          </>
        ) : (
          <ComparePlayground initialModels={compareSeed} initialTier={autoTier} />
        )}
      </ModelsShell>
    </LabChrome>
  );
}
