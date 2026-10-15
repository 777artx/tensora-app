"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LabChrome } from "@/components/lab/lab-chrome";
import {
  formatUptime,
  instanceSpend,
  listInstances,
  refreshServerInstances,
  stopServerInstance,
  type GpuInstance,
} from "@/lib/lab/compute-instances";
import { useLabAuth } from "@/lib/lab/auth";
import { providerLabel, regionLabel, formatPrice } from "@/lib/lab/compute";
import { getActiveProject } from "@/lib/lab/projects";

export default function InstancesPage() {
  const { getAccessToken } = useLabAuth();
  const [instances, setInstances] = useState<GpuInstance[]>([]);
  const [projectName, setProjectName] = useState("Project");
  const [, setTick] = useState(0);

  const refresh = useCallback(() => {
    setProjectName(getActiveProject().name);
    void refreshServerInstances(getAccessToken)
      .then(setInstances)
      .catch(() => setInstances(listInstances()));
  }, [getAccessToken]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("tensora-instances-change", onChange);
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      window.removeEventListener("tensora-instances-change", onChange);
      clearInterval(t);
    };
  }, [refresh]);

  const projectId = getActiveProject().id;
  const projectInstances = instances.filter((i) => i.projectId === projectId);

  return (
    <LabChrome
      active="compute"
      title="Instances"
      subtitle={projectName}
    >
      <div className="mx-auto max-w-[1000px] pb-8">
        <div className="mb-5 flex justify-end">
          <Link
            href="/lab/compute"
            className="rounded-full bg-[var(--hero)] px-3 py-1.5 text-[12px] font-medium text-[var(--hero-fg)]"
          >
            Buy compute →
          </Link>
        </div>

        {projectInstances.length === 0 ? (
          <div className="rounded-[var(--lab-radius-card)] border border-[var(--border)] bg-[var(--panel)] px-6 py-14 text-center">
            <p className="m-0 text-[13px] text-[var(--muted)]">No instances yet.</p>
            <Link
              href="/lab/compute"
              className="mt-3 inline-block text-[13px] font-medium text-[var(--foreground)]"
            >
              Choose a GPU →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {projectInstances.map((inst) => (
              <InstanceRow
                key={inst.id}
                instance={inst}
                onStop={() => {
                  void stopServerInstance(inst.id, getAccessToken).then(() => refresh());
                }}
              />
            ))}
          </div>
        )}
      </div>
    </LabChrome>
  );
}

function InstanceRow({
  instance,
  onStop,
}: {
  instance: GpuInstance;
  onStop: () => void;
}) {
  const statusColor =
    instance.status === "running"
      ? "text-emerald-400"
      : instance.status === "error"
        ? "text-red-400"
        : instance.status === "stopped"
          ? "text-[var(--gd-muted)]"
          : "text-amber-300";

  return (
    <article className="rounded-lg border border-[var(--gd-border)] bg-[var(--gd-panel)] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/lab/compute/instances/${instance.id}`}
              className="text-[14px] font-medium text-[var(--gd-text)] hover:text-[var(--orange)]"
            >
              {instance.name}
            </Link>
            <span className={`font-mono text-[10px] uppercase tracking-wide ${statusColor}`}>
              {instance.status}
            </span>
            {instance.sandbox ? (
              <span className="rounded-[3px] border border-amber-500/30 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-300">
                Sandbox
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--gd-muted)]">
            <span>{instance.gpuLabel}</span>
            <span>{providerLabel(instance.provider)}</span>
            <span>{regionLabel(instance.region)}</span>
            <span className="font-mono">{formatPrice(instance.pricePerHour)}/hr</span>
            <span className="font-mono">Uptime {formatUptime(instance)}</span>
            <span className="font-mono">
              Spend ${instanceSpend(instance).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/lab/compute/instances/${instance.id}`}
            className="rounded-md border border-[var(--gd-border)] px-2.5 py-1 text-[11px] text-[var(--gd-soft)]"
          >
            Details
          </Link>
          {instance.status === "running" ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded-md border border-[var(--gd-border)] px-2.5 py-1 text-[11px] text-[var(--gd-muted)]"
            >
              Stop
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
