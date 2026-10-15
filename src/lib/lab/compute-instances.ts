import { pushActivity, getActiveProject } from "@/lib/lab/projects";
import type { GpuOffer, IntegrationKind } from "@/lib/lab/compute";
import { buyerHourly, providerLabel, regionLabel } from "@/lib/lab/compute";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";

export type InstanceStatus =
  | "creating"
  | "starting"
  | "running"
  | "stopped"
  | "error"
  | "terminating";

export type ProvisionStep = {
  id: string;
  label: string;
  done: boolean;
};

export type GpuInstance = {
  id: string;
  name: string;
  projectId: string;
  status: InstanceStatus;
  gpuLabel: string;
  gpuType: string;
  gpuMemory: number;
  gpuCount: number;
  provider: string;
  region: string;
  dataCenter: string | null;
  pricePerHour: number;
  offerType: string;
  integration: IntegrationKind;
  image: string;
  diskGb: number;
  vcpu: number;
  memoryGb: number;
  sshKeyName?: string;
  createdAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
  error?: string;
  sandbox: boolean;
  primePodId?: string;
  offerId: string;
  provisionSteps: ProvisionStep[];
};

const INSTANCES_KEY = "gd-gpu-instances";

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function listInstances(): GpuInstance[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(INSTANCES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as GpuInstance[]) : [];
  } catch {
    return [];
  }
}

export function getInstance(id: string): GpuInstance | undefined {
  return listInstances().find((i) => i.id === id);
}

export function saveInstances(list: GpuInstance[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(INSTANCES_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("tensora-instances-change"));
}

export function upsertInstance(instance: GpuInstance) {
  const list = listInstances();
  const idx = list.findIndex((i) => i.id === instance.id);
  if (idx >= 0) list[idx] = instance;
  else list.unshift(instance);
  saveInstances(list);
}

export function defaultProvisionSteps(): ProvisionStep[] {
  return [
    { id: "accepted", label: "Request accepted", done: false },
    { id: "provider", label: "Provider selected", done: false },
    { id: "reserved", label: "GPU reserved", done: false },
    { id: "starting", label: "Instance starting", done: false },
    { id: "network", label: "Network ready", done: false },
    { id: "running", label: "Running", done: false },
  ];
}

export function createInstanceFromOffer(opts: {
  offer: GpuOffer;
  name: string;
  image: string;
  diskGb: number;
  sshKeyName?: string;
  sandbox: boolean;
  primePodId?: string;
  id?: string;
}): GpuInstance {
  const project = getActiveProject();
  const slug = opts.offer.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
  const id = opts.id || `inst_${Date.now().toString(36)}`;
  const instance: GpuInstance = {
    id,
    name: opts.name || `instance-${slug}-01`,
    projectId: project.id,
    status: "creating",
    gpuLabel: opts.offer.label,
    gpuType: opts.offer.gpuType,
    gpuMemory: opts.offer.gpuMemory,
    gpuCount: opts.offer.gpuCount,
    provider: opts.offer.provider,
    region: opts.offer.region,
    dataCenter: opts.offer.dataCenter,
    pricePerHour: buyerHourly(opts.offer),
    offerType: opts.offer.offerType || "on-demand",
    integration: opts.offer.integration || "external",
    image: opts.image,
    diskGb: opts.diskGb,
    vcpu: opts.offer.vcpu,
    memoryGb: opts.offer.memoryGb,
    sshKeyName: opts.sshKeyName,
    createdAt: new Date().toISOString(),
    startedAt: null,
    stoppedAt: null,
    sandbox: opts.sandbox,
    primePodId: opts.primePodId,
    offerId: opts.offer.id,
    provisionSteps: defaultProvisionSteps(),
  };
  upsertInstance(instance);
  pushActivity({
    kind: "gpu_instance",
    title: `${opts.sandbox ? "Sandbox" : "Live"} · ${instance.name}`,
    detail: `${instance.gpuLabel} · ${providerLabel(instance.provider)} · ${regionLabel(instance.region)}`,
    amount: `$${instance.pricePerHour.toFixed(2)}/hr`,
    resource: instance.gpuLabel,
    provider: providerLabel(instance.provider),
    status: opts.sandbox ? "sandbox" : "pending",
  });
  return instance;
}

export function updateInstanceStatus(
  id: string,
  patch: Partial<GpuInstance>
): GpuInstance | undefined {
  const list = listInstances();
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return undefined;
  list[idx] = { ...list[idx], ...patch };
  saveInstances(list);
  return list[idx];
}

export function instanceSpend(instance: GpuInstance, now = Date.now()): number {
  if (!instance.startedAt) return 0;
  const end = instance.stoppedAt
    ? new Date(instance.stoppedAt).getTime()
    : now;
  const hours = Math.max(0, (end - new Date(instance.startedAt).getTime()) / 3_600_000);
  return hours * instance.pricePerHour;
}

export function formatUptime(instance: GpuInstance, now = Date.now()): string {
  if (!instance.startedAt) return "00:00:00";
  const end = instance.stoppedAt
    ? new Date(instance.stoppedAt).getTime()
    : now;
  const secs = Math.max(0, Math.floor((end - new Date(instance.startedAt).getTime()) / 1000));
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

type ServerInstanceRow = {
  id: string;
  name: string;
  gpuType: string;
  provider: string;
  status: string;
  sandbox: boolean;
  primePodId?: string;
  createdAt: string;
  hourlyUsd?: number;
  projectId?: string;
  gpuLabel?: string;
  gpuMemory?: number;
  gpuCount?: number;
  region?: string;
  dataCenter?: string | null;
  image?: string;
  diskGb?: number;
  vcpu?: number;
  memoryGb?: number;
  offerId?: string;
};

function statusFromServer(raw: string): InstanceStatus {
  const s = raw.toUpperCase();
  if (s === "ACTIVE" || s === "RUNNING") return "running";
  if (s === "STOPPED" || s === "TERMINATED" || s === "DELETING") return "stopped";
  if (s === "ERROR") return "error";
  return "creating";
}

export function instanceFromServer(row: ServerInstanceRow): GpuInstance {
  const status = statusFromServer(row.status);
  return {
    id: row.id,
    name: row.name,
    projectId: row.projectId || "default",
    status,
    gpuLabel: row.gpuLabel || row.gpuType,
    gpuType: row.gpuType,
    gpuMemory: row.gpuMemory || 0,
    gpuCount: row.gpuCount || 1,
    provider: row.provider,
    region: row.region || "",
    dataCenter: row.dataCenter ?? null,
    pricePerHour: row.hourlyUsd || 0,
    offerType: "on-demand",
    integration: row.sandbox ? "external" : "integrated",
    image: row.image || "",
    diskGb: row.diskGb || 0,
    vcpu: row.vcpu || 0,
    memoryGb: row.memoryGb || 0,
    createdAt: row.createdAt,
    startedAt: status === "running" ? row.createdAt : null,
    stoppedAt: status === "stopped" ? row.createdAt : null,
    sandbox: row.sandbox,
    primePodId: row.primePodId,
    offerId: row.offerId || row.id,
    provisionSteps: defaultProvisionSteps().map((step) => ({
      ...step,
      done: status === "running" || status === "stopped",
    })),
  };
}

export async function refreshServerInstances(
  getAccessToken?: () => Promise<string | null>
): Promise<GpuInstance[]> {
  const headers = await labAuthHeaders(getAccessToken);
  if (!headers.Authorization) return listInstances();
  const res = await fetch("/api/lab/gpus/instances", { headers });
  if (!res.ok) return listInstances();
  const data = (await res.json()) as { instances?: ServerInstanceRow[] };
  const list = (data.instances || []).map(instanceFromServer);
  saveInstances(list);
  return list;
}

export async function stopServerInstance(
  id: string,
  getAccessToken?: () => Promise<string | null>
): Promise<{ ok: boolean; error?: string }> {
  const headers = await labAuthHeaders(getAccessToken);
  const res = await fetch("/api/lab/gpus/instances", {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "stop", id }),
  });
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) return { ok: false, error: data?.error || "Could not stop the instance." };
  updateInstanceStatus(id, { status: "stopped", stoppedAt: new Date().toISOString() });
  return { ok: true };
}

export function saveGpuQuote(offer: GpuOffer) {
  pushActivity({
    kind: "gpu_quote",
    title: `${offer.label} · ${providerLabel(offer.provider)}`,
    detail: `${regionLabel(offer.region)} · ${offer.gpuCount}× GPU · ${offer.socket}`,
    amount: offer.pricePerHour > 0 ? `$${offer.pricePerHour.toFixed(2)}/hr` : "Quote",
  });
}
