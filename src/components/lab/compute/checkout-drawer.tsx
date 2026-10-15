"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  formatPrice,
  providerLabel,
  regionLabel,
  type GpuOffer,
} from "@/lib/lab/compute";
import {
  createInstanceFromOffer,
  type GpuInstance,
} from "@/lib/lab/compute-instances";
import { useLabAuth } from "@/lib/lab/auth";
import { getActiveProject } from "@/lib/lab/projects";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";

type Props = {
  offer: GpuOffer;
  mode?: "prime" | "sandbox";
  onClose: () => void;
  onLaunched: (instance: GpuInstance) => void;
};

const IMAGES = [
  { id: "ubuntu_22_cuda_12", label: "Ubuntu 22 · CUDA 12" },
  { id: "ubuntu_22_cuda_12_pytorch", label: "Ubuntu 22 · CUDA 12 · PyTorch" },
  { id: "ubuntu_24_cuda_12", label: "Ubuntu 24 · CUDA 12" },
  { id: "axolotl", label: "Axolotl" },
  { id: "vllm_llama_70b", label: "vLLM" },
];

export function CheckoutDrawer({ offer, mode = "prime", onClose, onLaunched }: Props) {
  const { getAccessToken, requireAuth } = useLabAuth();
  const sandbox = mode === "sandbox";
  const [name, setName] = useState(() => {
    const slug = offer.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 16);
    return `instance-${slug}-01`;
  });
  const [gpuCount, setGpuCount] = useState(offer.gpuCount);
  const [image, setImage] = useState(offer.images?.[0] || IMAGES[0].id);
  const [diskGb, setDiskGb] = useState(100);
  const [sshKey, setSshKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hourly = offer.pricePerHour * (gpuCount / Math.max(1, offer.gpuCount));
  const houseHourly =
    (offer.tensoraPricePerHour ?? offer.pricePerHour * 0.9) *
    (gpuCount / Math.max(1, offer.gpuCount));
  const daily = houseHourly * 24;
  const savePct =
    hourly > 0 ? Math.round(((hourly - houseHourly) / hourly) * 100) : 0;

  const imageOptions = useMemo(() => {
    const fromOffer = (offer.images || []).map((id) => ({
      id,
      label: id.replace(/_/g, " "),
    }));
    const ids = new Set(fromOffer.map((x) => x.id));
    return [...fromOffer, ...IMAGES.filter((i) => !ids.has(i.id))];
  }, [offer.images]);

  async function launch() {
    if (!requireAuth("/lab/compute")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lab/gpus/rent", {
        method: "POST",
        headers: await labAuthHeaders(getAccessToken),
        body: JSON.stringify({
          mode: sandbox ? "sandbox" : "prime",
          name,
          cloudId: offer.cloudId,
          gpuType: offer.gpuType,
          socket: offer.socket,
          gpuCount,
          provider: offer.provider,
          dataCenter: offer.dataCenter,
          country: offer.country,
          image,
          diskSize: diskGb,
          vcpus: offer.vcpu,
          memory: offer.memoryGb,
          pricePerHour: offer.pricePerHour,
          maxPrice: offer.pricePerHour * 1.1,
          hours: 1,
          sshPublicKey: sshKey.trim() || undefined,
          projectId: getActiveProject().id,
          gpuLabel: offer.label,
          gpuMemory: offer.gpuMemory,
          region: offer.region,
          offerId: offer.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Sign in to launch a GPU.");
        }
        if (res.status === 402) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Insufficient credits — deposit on Billing first."
          );
        }
        throw new Error(
          typeof data.error === "string" ? data.error : `Launch failed (${res.status})`
        );
      }

      const podId =
        data.pod && typeof data.pod === "object" ? String((data.pod as { id?: string }).id || "") : "";
      const instance = createInstanceFromOffer({
        offer: { ...offer, gpuCount },
        name,
        image,
        diskGb,
        sshKeyName: sshKey.trim() ? "uploaded" : undefined,
        sandbox: Boolean(data.sandbox) || sandbox,
        primePodId: podId || undefined,
        id: podId || undefined,
      });
      onLaunched(instance);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Launch failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--gd-border)] bg-[var(--gd-bg)] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[var(--gd-border)] px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--gd-muted)]">
              Configuration
            </div>
            <h2 className="m-0 mt-1 text-[17px] text-[var(--gd-text)]">Launch instance</h2>
            {sandbox ? (
              <p className="m-0 mt-1 text-[11px] text-amber-300">
                Sandbox mode. No real GPU will be provisioned.
              </p>
            ) : (
              <p className="m-0 mt-1 text-[11px] text-emerald-400/90">
                Rent on Olora via integrated provider.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[18px] leading-none text-[var(--gd-muted)] hover:text-[var(--gd-text)]"
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <Section title="Runtime">
            <Field label="GPU">
              <div className="text-[13px] text-[var(--gd-text)]">
                {offer.label} · {offer.socket}
              </div>
            </Field>
            <Field label="Provider">
              <div className="text-[13px] text-[var(--gd-text)]">
                {providerLabel(offer.provider)}
              </div>
            </Field>
            <Field label="Region">
              <div className="text-[13px] text-[var(--gd-text)]">
                {regionLabel(offer.region)}
                {offer.dataCenter ? ` · ${offer.dataCenter}` : ""}
              </div>
            </Field>
            <Field label="Instance name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-[var(--gd-border)] bg-[var(--gd-panel)] px-2.5 py-1.5 text-[13px] text-[var(--gd-text)] outline-none focus:border-[var(--orange)]/50"
              />
            </Field>
            <Field label="GPU count">
              <select
                value={gpuCount}
                onChange={(e) => setGpuCount(Number(e.target.value))}
                className="w-full rounded-md border border-[var(--gd-border)] bg-[var(--gd-panel)] px-2.5 py-1.5 text-[13px] text-[var(--gd-text)]"
              >
                {[1, 2, 4, 8].filter((n) => n <= Math.max(8, offer.gpuCount)).map((n) => (
                  <option key={n} value={n}>
                    {n}×
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Runtime type">
              <div className="text-[13px] capitalize text-[var(--gd-soft)]">
                {(offer.offerType || "on-demand").replace("-", " ")}
              </div>
            </Field>
          </Section>

          <Section title="Image / environment">
            <select
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full rounded-md border border-[var(--gd-border)] bg-[var(--gd-panel)] px-2.5 py-1.5 text-[13px] text-[var(--gd-text)]"
            >
              {imageOptions.map((img) => (
                <option key={img.id} value={img.id}>
                  {img.label}
                </option>
              ))}
            </select>
          </Section>

          <Section title="Storage">
            <Field label="Disk (GB)">
              <input
                type="number"
                min={20}
                max={2000}
                value={diskGb}
                onChange={(e) => setDiskGb(Number(e.target.value) || 100)}
                className="w-full rounded-md border border-[var(--gd-border)] bg-[var(--gd-panel)] px-2.5 py-1.5 text-[13px] text-[var(--gd-text)]"
              />
            </Field>
          </Section>

          <Section title="Networking">
            <Field label="SSH public key (optional)">
              <textarea
                value={sshKey}
                onChange={(e) => setSshKey(e.target.value)}
                placeholder="ssh-ed25519 AAAA… or leave blank"
                rows={2}
                className="w-full resize-none rounded-md border border-[var(--gd-border)] bg-[var(--gd-panel)] px-2.5 py-1.5 font-mono text-[12px] text-[var(--gd-text)] placeholder:text-[var(--gd-muted)]"
              />
            </Field>
          </Section>

          <Section title="Payment">
            <p className="m-0 text-[12px] leading-relaxed text-[var(--gd-muted)]">
              Charged to your Olora credits after the machine is reserved. Deposit on Billing first.
            </p>
          </Section>

          <Section title="Summary">
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between text-[var(--gd-muted)]">
                <span>Market rate</span>
                <span className="font-mono text-[var(--gd-muted)] line-through decoration-white/25">
                  {formatPrice(hourly)}/hr
                </span>
              </div>
              <div className="flex justify-between text-[var(--gd-muted)]">
                <span>Olora{savePct > 0 ? ` (−${savePct}%)` : ""}</span>
                <span className="font-mono text-[var(--gd-text)]">{formatPrice(houseHourly)}/hr</span>
              </div>
              <div className="flex justify-between text-[var(--gd-muted)]">
                <span>Estimated daily</span>
                <span className="font-mono text-[var(--gd-text)]">{formatPrice(daily)}/day</span>
              </div>
            </div>
          </Section>

          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
              {error}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-[var(--gd-border)] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={launch}
            className="min-h-11 w-full rounded-full bg-[var(--hero)] text-[14px] font-medium text-[var(--hero-fg)] disabled:opacity-50 hover:bg-[#1a1a1c]"
          >
            {busy ? "Submitting…" : sandbox ? "Launch sandbox instance" : "Launch instance"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="m-0 mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--gd-muted)]">
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-[var(--gd-muted)]">{label}</span>
      {children}
    </label>
  );
}
