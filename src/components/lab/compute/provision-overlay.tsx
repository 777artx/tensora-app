"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultProvisionSteps,
  updateInstanceStatus,
  type GpuInstance,
} from "@/lib/lab/compute-instances";
import { providerLabel } from "@/lib/lab/compute";

type Props = {
  instance: GpuInstance;
  onDone: () => void;
};

const STEP_DELAY_MS = 700;

export function ProvisionOverlay({ instance, onDone }: Props) {
  const router = useRouter();
  const [steps, setSteps] = useState(() => instance.provisionSteps || defaultProvisionSteps());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let i = 0;

    async function run() {
      const next = [...(instance.provisionSteps || defaultProvisionSteps())];
      for (; i < next.length; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, STEP_DELAY_MS));
        if (cancelled) return;
        next[i] = { ...next[i], done: true };
        setSteps([...next]);

        const status =
          i < 2 ? "creating" : i < next.length - 1 ? "starting" : "running";
        updateInstanceStatus(instance.id, {
          status,
          provisionSteps: [...next],
          ...(status === "running"
            ? { startedAt: new Date().toISOString() }
            : {}),
        });
      }
      if (cancelled) return;
      setDone(true);
    }

    run().catch((e) => {
      if (cancelled) return;
      const msg = e instanceof Error ? e.message : "Provisioning failed";
      setError(msg);
      updateInstanceStatus(instance.id, { status: "error", error: msg });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--gd-border)] bg-[var(--gd-panel)] p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gd-muted)]">
          {instance.sandbox ? "Sandbox provisioning" : "Provisioning"}
        </div>
        <h2 className="m-0 mt-1 text-[17px] text-[var(--gd-text)]">
          {done ? "Instance running" : "Creating instance…"}
        </h2>
        <p className="m-0 mt-1 text-[12px] text-[var(--gd-muted)]">
          {instance.name} · {instance.gpuLabel} · {providerLabel(instance.provider)}
        </p>

        {instance.sandbox ? (
          <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
            Demo sandbox. This does not reserve real GPU capacity.
          </p>
        ) : null}

        <ol className="mt-5 m-0 list-none space-y-2.5 p-0">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 text-[13px]">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                  s.done
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : "border-[var(--gd-border)] text-[var(--gd-muted)]"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <span className={s.done ? "text-[var(--gd-text)]" : "text-[var(--gd-muted)]"}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        {error ? (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
            {error}
          </div>
        ) : null}

        {done || error ? (
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onDone}
              className="flex-1 rounded-md border border-[var(--gd-border)] py-2 text-[12px] text-[var(--gd-muted)]"
            >
              Close
            </button>
            {done ? (
              <button
                type="button"
                onClick={() => {
                  onDone();
                  router.push(`/lab/compute/instances/${instance.id}`);
                }}
                className="flex-1 rounded-full bg-[var(--hero)] py-2 text-[12px] font-medium text-[var(--hero-fg)]"
              >
                Open instance →
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
