"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LabChrome } from "@/components/lab/lab-chrome";
import {
  formatUptime,
  getInstance,
  instanceSpend,
  listInstances,
  refreshServerInstances,
  saveInstances,
  stopServerInstance,
  type GpuInstance,
} from "@/lib/lab/compute-instances";
import { useLabAuth } from "@/lib/lab/auth";
import { formatPrice, providerLabel, regionLabel } from "@/lib/lab/compute";

type Tab = "overview" | "metrics" | "logs" | "settings";

export default function InstanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getAccessToken } = useLabAuth();
  const id = String(params?.id || "");
  const [instance, setInstance] = useState<GpuInstance | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [, setTick] = useState(0);

  useEffect(() => {
    void refreshServerInstances(getAccessToken).then(() => setInstance(getInstance(id) || null));
    setInstance(getInstance(id) || null);
    const onChange = () => setInstance(getInstance(id) || null);
    window.addEventListener("tensora-instances-change", onChange);
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      window.removeEventListener("tensora-instances-change", onChange);
      clearInterval(t);
    };
  }, [id, getAccessToken]);

  if (!instance) {
    return (
      <LabChrome active="compute" title="Instance">
        <div className="mx-auto max-w-2xl px-1 py-16 text-center">
          <p className="text-[13px] text-[var(--gd-muted)]">Instance not found.</p>
          <Link href="/lab/compute/instances" className="mt-3 inline-block text-[var(--orange)]">
            ← Instances
          </Link>
        </div>
      </LabChrome>
    );
  }

  const statusColor =
    instance.status === "running"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : instance.status === "error"
        ? "text-red-400 border-red-500/30 bg-red-500/10"
        : "text-[var(--gd-muted)] border-[var(--gd-border)]";

  function stop() {
    void stopServerInstance(instance!.id, getAccessToken).then(() => {
      setInstance(getInstance(instance!.id) || null);
    });
  }

  function remove() {
    void stopServerInstance(instance!.id, getAccessToken).finally(() => {
      const next = listInstances().filter((i) => i.id !== instance!.id);
      saveInstances(next);
      router.push("/lab/compute/instances");
    });
  }

  return (
    <LabChrome active="compute" title={instance.name}>
      <div className="mx-auto max-w-[900px] px-1 pb-16">
        <Link
          href="/lab/compute/instances"
          className="text-[12px] text-[var(--gd-muted)] hover:text-[var(--gd-soft)]"
        >
          ← Instances
        </Link>

        <header className="mt-3 mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display m-0 text-[24px] tracking-tight text-[var(--gd-text)]">
                {instance.name}
              </h1>
              <span
                className={`rounded-[3px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${statusColor}`}
              >
                {instance.status}
              </span>
              {instance.sandbox ? (
                <span className="rounded-[3px] border border-amber-500/30 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-300">
                  Sandbox
                </span>
              ) : null}
            </div>
            <p className="m-0 mt-1.5 text-[13px] text-[var(--gd-muted)]">
              {instance.gpuLabel} · {providerLabel(instance.provider)} ·{" "}
              {regionLabel(instance.region)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {instance.status === "running" ? (
              <>
                <button
                  type="button"
                  disabled
                  title="Terminal requires a live provider connection"
                  className="rounded-md border border-[var(--gd-border)] px-2.5 py-1.5 text-[11px] text-[var(--gd-muted)] opacity-50"
                >
                  Open terminal
                </button>
                <button
                  type="button"
                  disabled
                  title="Restart is not available. Stop the instance and launch a new one."
                  className="rounded-md border border-[var(--gd-border)] px-2.5 py-1.5 text-[11px] text-[var(--gd-muted)] opacity-50"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-md border border-[var(--gd-border)] px-2.5 py-1.5 text-[11px] text-[var(--gd-soft)]"
                >
                  Stop
                </button>
              </>
            ) : null}
          </div>
        </header>

        <div className="mb-4 flex gap-1 border-b border-[var(--gd-border)]">
          {(["overview", "metrics", "logs", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`border-b-2 px-3 py-2 text-[12px] capitalize ${
                tab === t
                  ? "border-[var(--orange)] text-[var(--gd-text)]"
                  : "border-transparent text-[var(--gd-muted)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["GPU", instance.gpuLabel],
              ["VRAM", `${instance.gpuMemory} GB`],
              ["CPU", instance.vcpu ? `${instance.vcpu} vCPU` : "-"],
              ["Memory", instance.memoryGb ? `${instance.memoryGb} GB` : "-"],
              ["Network", instance.dataCenter || regionLabel(instance.region)],
              ["Uptime", formatUptime(instance)],
              ["Rate", `${formatPrice(instance.pricePerHour)}/hr`],
              ["Spend", `$${instanceSpend(instance).toFixed(2)}`],
              ["Image", instance.image.replace(/_/g, " ")],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-md border border-[var(--gd-border)] bg-[var(--gd-panel)] px-3 py-2.5"
              >
                <div className="text-[10px] uppercase tracking-wide text-[var(--gd-muted)]">
                  {k}
                </div>
                <div className="mt-1 text-[13px] text-[var(--gd-text)]">{v}</div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "metrics" ? (
          <div className="rounded-lg border border-[var(--gd-border)] bg-[var(--gd-panel)] px-4 py-8 text-center text-[13px] text-[var(--gd-muted)]">
            {instance.sandbox || instance.integration !== "integrated" ? (
              <p className="m-0">
                Live metrics require a connected provider session. Sandbox instances do not
                stream GPU utilization.
              </p>
            ) : (
              <p className="m-0">
                Metrics stream is not wired for this pod yet. Check provider console for live
                telemetry.
              </p>
            )}
          </div>
        ) : null}

        {tab === "logs" ? (
          <pre className="overflow-auto rounded-lg border border-[var(--gd-border)] bg-[var(--gd-panel)] p-4 font-mono text-[11px] leading-relaxed text-[var(--gd-muted)]">
            {instance.sandbox
              ? `[sandbox] ${instance.createdAt} request accepted\n[sandbox] provider=${instance.provider}\n[sandbox] status=${instance.status}\n[sandbox] No remote log stream in demo mode.`
              : `[tensora] ${instance.createdAt} provision started\n[tensora] provider=${instance.provider} pod=${instance.primePodId || "-"}\n[tensora] status=${instance.status}\n${
                  instance.error ? `[error] ${instance.error}` : "[tensora] awaiting provider log stream"
                }`}
          </pre>
        ) : null}

        {tab === "settings" ? (
          <div className="space-y-4 rounded-lg border border-[var(--gd-border)] bg-[var(--gd-panel)] p-4">
            <div>
              <h3 className="m-0 text-[13px] text-[var(--gd-text)]">SSH</h3>
              <p className="m-0 mt-1 text-[12px] text-[var(--gd-muted)]">
                {instance.sshKeyName
                  ? `Key: ${instance.sshKeyName}`
                  : "No SSH key attached at launch."}
              </p>
            </div>
            <div>
              <h3 className="m-0 text-[13px] text-[var(--gd-text)]">Storage</h3>
              <p className="m-0 mt-1 text-[12px] text-[var(--gd-muted)]">
                {instance.diskGb} GB disk
              </p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[var(--gd-border)] pt-4">
              {instance.status === "running" ? (
                <>
                  <button
                    type="button"
                    disabled
                    title="Restart is not available. Stop the instance and launch a new one."
                    className="rounded-md border border-[var(--gd-border)] px-3 py-1.5 text-[12px] text-[var(--gd-muted)] opacity-50"
                  >
                    Restart
                  </button>
                  <button
                    type="button"
                    onClick={stop}
                    className="rounded-md border border-[var(--gd-border)] px-3 py-1.5 text-[12px] text-[var(--gd-soft)]"
                  >
                    Stop
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={remove}
                className="rounded-md border border-red-500/30 px-3 py-1.5 text-[12px] text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </LabChrome>
  );
}
