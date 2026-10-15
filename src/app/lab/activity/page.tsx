"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { RequireAuth } from "@/components/lab/require-auth";
import { TensoraMark } from "@/components/lab/tensora-brand";
import { LabCard } from "@/components/lab/ui";
import { getActiveProject } from "@/lib/lab/projects";
import { refreshCreditsFromServer, type BillingHistoryRow } from "@/lib/lab/credits";
import { useLabAuth } from "@/lib/lab/auth";

type ActivityItem = {
  id: string;
  at: string;
  kind: string;
  title: string;
  detail?: string;
  provider?: string;
  resource?: string;
  status?: string;
  explorerUrl?: string;
  project?: string;
  amount?: string;
};

function fromLedger(history: BillingHistoryRow[]): ActivityItem[] {
  return history.slice(0, 80).map((row) => ({
    id: row.id,
    at: row.date,
    kind: row.kind,
    title: row.title || row.description,
    detail: row.description,
    amount: row.amount,
    resource: row.resource || row.description,
    provider: row.method,
    project: row.projectId,
    status: "ok",
  }));
}

function typeLabel(kind: string) {
  const k = kind.toLowerCase();
  if (k.includes("deposit") || k.includes("marketplace") || k.includes("pay") || k.includes("usdc") || k.includes("usdg") || k.includes("x402"))
    return "Payment";
  if (k.includes("gpu") || k.includes("compute")) return "GPU";
  if (k.includes("tool") || k.includes("mcp") || k.includes("integrat")) return "Tool";
  if (k.includes("api_key") || k.includes("key")) return "API";
  if (k.includes("chat") || k.includes("infer") || k.includes("model")) return "Model";
  return kind.replace(/_/g, " ");
}

export default function ActivityPage() {
  const { getAccessToken } = useLabAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Project");

  useEffect(() => {
    const refresh = () => {
      void refreshCreditsFromServer(getAccessToken).then((snap) => {
        setItems(snap ? fromLedger(snap.history || []) : []);
      });
    };
    refresh();
    setProjectName(getActiveProject().name);
    window.addEventListener("tensora-credits-change", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("tensora-credits-change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [getAccessToken]);

  return (
    <LabChrome
      active="activity"
      title="Activity"
    >
      <RequireAuth>
      <div className="mx-auto max-w-4xl">
        {items.length === 0 ? (
          <LabCard className="px-6 py-14 text-center">
            <TensoraMark size={32} className="mx-auto mb-3 opacity-25" />
            <p className="m-0 text-[13px] text-[var(--muted)]">
              Your receipts show up here — deposits, credit buys, model calls, GPU launches.
            </p>
            <p className="m-0 mt-2 text-[12px] text-[var(--muted-3)]">
              Home shows network USDC on Basescan. This page is your personal trade ticket.
            </p>
            <p className="m-0 mt-4 text-[12px]">
              <Link href="/lab/models" className="text-[var(--orange)] hover:underline">
                Try a model →
              </Link>
              {" · "}
              <Link href="/lab/billing" className="text-[var(--orange)] hover:underline">
                Deposit USDC →
              </Link>
              {" · "}
              <Link href="/lab/market" className="text-[var(--orange)] hover:underline">
                Buy credits →
              </Link>
            </p>
          </LabCard>
        ) : (
          <LabCard className="overflow-hidden">
            <div className="hidden grid-cols-[7rem_5.5rem_1fr_1fr_5rem_4.5rem_4rem] gap-2 border-b border-[var(--border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-3)] md:grid">
              <span>Time</span>
              <span>Type</span>
              <span>Resource</span>
              <span>Provider</span>
              <span>Amount</span>
              <span>Status</span>
              <span />
            </div>
            <ul className="m-0 list-none divide-y divide-[var(--border-subtle)] p-0">
              {items.map((item) => {
                const open = openId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left hover:bg-[var(--panel-2)] md:grid-cols-[7rem_5.5rem_1fr_1fr_5rem_4.5rem_4rem] md:items-center md:gap-2"
                      onClick={() => setOpenId(open ? null : item.id)}
                    >
                      <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
                        {new Date(item.at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-[12px] font-medium">{typeLabel(item.kind)}</span>
                      <span className="truncate text-[13px]">{item.resource || item.title}</span>
                      <span className="truncate text-[12px] text-[var(--muted)]">
                        {item.provider || item.project || projectName}
                      </span>
                      <span className="text-[12px] font-medium tabular-nums">
                        {item.amount || "-"}
                      </span>
                      <span className="text-[11px] text-[var(--live)]">
                        {item.status || "ok"}
                      </span>
                      <span className="text-right text-[11px] text-[var(--muted-3)]">
                        {item.explorerUrl ? "Tx" : open ? "Hide" : "Detail"}
                      </span>
                    </button>
                    {open ? (
                      <div className="border-t border-[var(--border-subtle)] bg-[var(--panel-2)] px-4 py-3 text-[12px] text-[var(--muted)]">
                        <div className="font-medium text-[var(--foreground)]">{item.title}</div>
                        {item.detail ? <p className="m-0 mt-1">{item.detail}</p> : null}
                        {item.explorerUrl ? (
                          <a
                            href={item.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-[var(--orange)] hover:underline"
                          >
                            View on explorer →
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </LabCard>
        )}
      </div>
      </RequireAuth>
    </LabChrome>
  );
}
