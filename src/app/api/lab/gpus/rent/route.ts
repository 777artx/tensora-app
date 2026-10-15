import { NextResponse } from "next/server";
import { authenticateRequest, unauthorized, insufficientCredits } from "@/lib/lab/server-auth";
import {
  addInstance,
  chargeGpuWithSubsidy,
  getOrCreateAccount,
  quoteGpuHouseRate,
  recordUsage,
  refundGpuCharge,
} from "@/lib/lab/account-store";
import { isLiveMode } from "@/lib/lab/app-mode";

export const runtime = "nodejs";

type RentBody = {
  name?: string;
  cloudId?: string;
  gpuType?: string;
  socket?: string;
  gpuCount?: number;
  provider?: string;
  dataCenter?: string | null;
  country?: string | null;
  image?: string;
  diskSize?: number;
  vcpus?: number;
  memory?: number;
  maxPrice?: number;
  pricePerHour?: number;
  /** "sandbox" = local demo provision; never claims real infra */
  mode?: "prime" | "sandbox";
  hours?: number;
  sshPublicKey?: string;
  projectId?: string;
  gpuLabel?: string;
  gpuMemory?: number;
  region?: string;
  offerId?: string;
};

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return unauthorized("Sign in or provide a valid API key.");

  let body: RentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const cloudId = String(body.cloudId || "").trim();
  const gpuType = String(body.gpuType || "").trim();
  const provider = String(body.provider || "").trim();
  const gpuCount = Number(body.gpuCount || 1);
  const mode = body.mode === "sandbox" ? "sandbox" : "prime";
  const hours = Math.max(1, Number(body.hours || 1));
  const listedHourly =
    Number(body.pricePerHour) > 0
      ? Number(body.pricePerHour)
      : mode === "sandbox"
        ? 0.25
        : 0.5;
  const maxPrice = Number(body.maxPrice || 0) > 0 ? Number(body.maxPrice) : listedHourly;

  if (!cloudId || !gpuType || !provider) {
    return NextResponse.json(
      { error: "cloudId, gpuType, and provider are required." },
      { status: 400 }
    );
  }

  // Sandbox when requested — allowed in demo, or live when Prime is not configured
  if (mode === "sandbox") {
    const primeConfigured = Boolean(process.env.PRIME_INTELLECT_API_KEY);
    if (isLiveMode() && primeConfigured) {
      return NextResponse.json(
        { error: "Sandbox provisioning is disabled when live GPU is configured." },
        { status: 403 }
      );
    }

    await new Promise((r) => setTimeout(r, 400));
    const podId = `sandbox_${Date.now().toString(36)}`;
    const billed = await chargeGpuWithSubsidy(user.userId, {
      listedHourlyUsd: listedHourly,
      hours,
      gpuType,
      provider,
      sandbox: true,
    });
    if (!billed.ok) return insufficientCredits(billed.credits);

    await addInstance(user.userId, {
      id: podId,
      name: String(body.name || `sandbox-${gpuType}`).slice(0, 64),
      gpuType,
      provider,
      status: "PENDING",
      sandbox: true,
      createdAt: new Date().toISOString(),
      hourlyUsd: billed.houseHourlyUsd,
    });

    return NextResponse.json({
      configured: false,
      sandbox: true,
      charged: billed.charged,
      subsidyApplied: billed.subsidyApplied,
      houseHourlyUsd: billed.houseHourlyUsd,
      listedHourlyUsd: listedHourly,
      pod: {
        id: podId,
        name: String(body.name || `sandbox-${gpuType}`).slice(0, 64),
        status: "PENDING",
        provider,
        gpuType,
        gpuCount,
      },
    });
  }

  const apiKey = process.env.PRIME_INTELLECT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "PRIME_INTELLECT_API_KEY is not configured.",
        marketplace: "https://app.primeintellect.ai/dashboard/on-demand-gpus",
        configured: false,
      },
      { status: 503 }
    );
  }

  const quote = await quoteGpuHouseRate(listedHourly, hours);
  const account = await getOrCreateAccount(user.userId);
  if (quote.buyerPay > 0 && account.credits < quote.buyerPay) {
    return insufficientCredits(account.credits);
  }

  const sshPublicKey = String(body.sshPublicKey || "").trim();
  let sshKeyId: string | undefined;
  if (sshPublicKey) {
    if (!sshPublicKey.startsWith("ssh-")) {
      return NextResponse.json(
        { error: "SSH key must be a public key starting with ssh-." },
        { status: 400 }
      );
    }
    const uploaded = await uploadPrimeSshKey(apiKey, sshPublicKey, String(body.name || gpuType));
    if (!uploaded.ok) {
      return NextResponse.json({ error: uploaded.error, configured: true }, { status: 502 });
    }
    sshKeyId = uploaded.id;
  }

  const podName = String(body.name || `tensora-${gpuType}-${Date.now()}`).slice(0, 64);
  const upstream = await fetch("https://api.primeintellect.ai/api/v1/pods/", {
    method: "POST",
    headers: primeHeaders(apiKey),
    body: JSON.stringify({
      pod: {
        name: podName,
        cloudId,
        gpuType,
        socket: String(body.socket || "PCIe"),
        gpuCount,
        diskSize: body.diskSize || undefined,
        vcpus: body.vcpus || undefined,
        memory: body.memory || undefined,
        maxPrice,
        image: body.image || "ubuntu_22_cuda_12",
        dataCenterId: body.dataCenter || undefined,
        country: body.country || undefined,
        ...(sshKeyId ? { sshKeyId } : {}),
      },
      provider: { type: provider },
    }),
  });

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: primeErrorMessage(data), configured: true },
      { status: upstream.status }
    );
  }

  const podId =
    data && typeof data === "object" && "id" in data
      ? String((data as { id?: string }).id || "")
      : "";
  if (!podId) {
    return NextResponse.json(
      { error: "Prime accepted the request but did not return a pod id. You were not charged." },
      { status: 502 }
    );
  }

  const billed = await chargeGpuWithSubsidy(user.userId, {
    listedHourlyUsd: listedHourly,
    hours,
    gpuType,
    provider,
    sandbox: false,
  });
  if (!billed.ok) {
    await deletePrimePod(apiKey, podId);
    return insufficientCredits(billed.credits);
  }

  try {
    await addInstance(user.userId, {
      id: podId,
      name: podName,
      gpuType,
      provider,
      status: "PENDING",
      sandbox: false,
      primePodId: podId,
      createdAt: new Date().toISOString(),
      hourlyUsd: billed.houseHourlyUsd,
      projectId: String(body.projectId || "default").slice(0, 64),
      gpuLabel: String(body.gpuLabel || gpuType).slice(0, 80),
      gpuMemory: Number(body.gpuMemory || 0) || undefined,
      gpuCount,
      region: body.region ? String(body.region) : undefined,
      dataCenter: body.dataCenter || null,
      image: body.image || "ubuntu_22_cuda_12",
      diskGb: body.diskSize || undefined,
      vcpu: body.vcpus || undefined,
      memoryGb: body.memory || undefined,
      offerId: body.offerId ? String(body.offerId) : undefined,
    });

    await recordUsage(user.userId, {
      model: gpuType,
      cost: billed.charged,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      gatewayMs: 0,
      kind: "gpu",
    });
  } catch (err) {
    await refundGpuCharge(user.userId, {
      amount: billed.charged,
      subsidyApplied: billed.subsidyApplied,
      gpuType,
      provider,
    });
    await deletePrimePod(apiKey, podId);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save the instance. The charge was reversed." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    configured: true,
    sandbox: false,
    charged: billed.charged,
    subsidyApplied: billed.subsidyApplied,
    houseHourlyUsd: billed.houseHourlyUsd,
    listedHourlyUsd: listedHourly,
    pod: data,
    instancesUrl: "https://app.primeintellect.ai/dashboard/instances",
  });
}

function primeHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function primeErrorMessage(data: unknown) {
  if (data && typeof data === "object") {
    const row = data as { detail?: unknown; error?: string; message?: string };
    if (typeof row.detail === "string" && row.detail) return row.detail;
    if (row.error) return row.error;
    if (row.message) return row.message;
  }
  return "Provisioning failed";
}

async function uploadPrimeSshKey(
  apiKey: string,
  publicKey: string,
  name: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const res = await fetch("https://api.primeintellect.ai/api/v1/ssh_keys/", {
    method: "POST",
    headers: primeHeaders(apiKey),
    body: JSON.stringify({
      name: `tensora-${name}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "tensora-key",
      publicKey,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, error: primeErrorMessage(data) };
  const id = data && typeof data === "object" && "id" in data ? String((data as { id?: string }).id || "") : "";
  if (!id) return { ok: false, error: "SSH key upload did not return an id." };
  return { ok: true, id };
}

async function deletePrimePod(apiKey: string, podId: string) {
  await fetch(`https://api.primeintellect.ai/api/v1/pods/${encodeURIComponent(podId)}`, {
    method: "DELETE",
    headers: primeHeaders(apiKey),
  }).catch(() => null);
}
