"use client";

import { useEffect, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { LabButton, LabDarkModule, LabDarkPanel } from "@/components/lab/ui";
import { getActiveProject, pushActivity } from "@/lib/lab/projects";

type DeployKind = "agent" | "endpoint" | "app";

type Deployment = {
  id: string;
  name: string;
  kind: DeployKind;
  model: string;
  compute: string;
  integrations: string[];
  status: "sandbox" | "running";
  endpoint: string;
  requests: number;
  spend: number;
  createdAt: string;
  projectId: string;
  env: Record<string, string>;
};

const MODELS = ["Olora Auto", "Claude", "GPT", "Qwen", "DeepSeek", "Llama"];
const GPUS = ["Managed", "Auto", "H100", "H200", "L40S", "A100"];

const STORE_KEY = "gd-sandbox-deployments";

function loadDeployments(): Deployment[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveDeployments(list: Deployment[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

function GraphNode({
  label,
  value,
  accent,
  active,
}: {
  label: string;
  value: string;
  accent?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`min-w-[7.5rem] flex-1 rounded-[var(--lab-radius)] border px-3 py-3 text-center ${
        accent
          ? "border-[var(--orange)]/50 bg-[var(--orange-soft)]"
          : active
            ? "border-white/20 bg-white/10"
            : "border-white/10 bg-white/5"
      }`}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--dark-muted-2)]">
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-semibold text-[var(--dark-fg)]">{value}</div>
    </div>
  );
}

function GraphArrow() {
  return (
    <div className="hidden shrink-0 items-center text-[var(--dark-muted-2)] sm:flex" aria-hidden>
      →
    </div>
  );
}

export default function DeployPage() {
  const [kind, setKind] = useState<DeployKind>("agent");
  const [model, setModel] = useState("Olora Auto");
  const [compute, setCompute] = useState("Managed");
  const [name, setName] = useState("research-agent");
  const [envText, setEnvText] = useState("LOG_LEVEL=info");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "logs" | "usage" | "settings">("overview");
  const [focus, setFocus] = useState<"model" | "compute" | "endpoint">("model");

  useEffect(() => {
    setDeployments(loadDeployments());
  }, []);

  const active = deployments.find((d) => d.id === activeId) || null;

  function deploySandbox() {
    const project = getActiveProject();
    const env: Record<string, string> = {};
    envText.split("\n").forEach((line) => {
      const [k, ...rest] = line.split("=");
      if (k && rest.length) env[k.trim()] = rest.join("=").trim();
    });
    const dep: Deployment = {
      id: `dep_${Date.now().toString(36)}`,
      name: name.trim() || "sandbox-service",
      kind,
      model,
      compute:
        kind === "endpoint" && model !== "Olora Auto"
          ? compute
          : compute === "Auto"
            ? "Managed"
            : compute,
      integrations: [],
      status: "sandbox",
      endpoint: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.olora.si"}/api/v1/chat/completions`,
      requests: 0,
      spend: 0,
      createdAt: new Date().toISOString(),
      projectId: project.id,
      env,
    };
    const next = [dep, ...deployments];
    saveDeployments(next);
    setDeployments(next);
    setActiveId(dep.id);
    pushActivity({
      kind: "deploy",
      title: `Sandbox deployment created: ${dep.name}`,
      detail: dep.model,
    });
  }

  if (active) {
    return (
      <LabChrome active="deploy" title={active.name}>
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            className="mb-4 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => setActiveId(null)}
          >
            ← Back to builder
          </button>
          <LabDarkModule className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-2xl font-semibold text-[var(--dark-fg)]">{active.name}</h1>
              <span className="rounded-full border border-[var(--orange)]/40 bg-[var(--orange-soft)] px-2.5 py-0.5 text-xs text-[var(--orange)]">
                ● Sandbox
              </span>
            </div>
            <p className="m-0 mt-2 font-mono text-[12px] text-[var(--dark-muted)]">
              {active.endpoint}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <GraphNode label="Model" value={active.model} />
              <GraphArrow />
              <GraphNode label="Olora" value="Router" accent />
              <GraphArrow />
              <GraphNode label="Compute" value={active.compute} />
              <GraphArrow />
              <GraphNode label="Endpoint" value="Sandbox" active />
            </div>
          </LabDarkModule>
          <div className="mt-4 flex gap-2 border-b border-[var(--border)]">
            {(["overview", "logs", "usage", "settings"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`px-3 py-2 text-sm capitalize ${
                  tab === t
                    ? "border-b-2 border-[var(--hero)] text-[var(--foreground)]"
                    : "text-[var(--muted)]"
                }`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm text-[var(--muted)]">
            {tab === "overview" && (
              <p>
                Sandbox deployment for project architecture. No production infrastructure is
                provisioned yet.
              </p>
            )}
            {tab === "logs" && (
              <pre className="overflow-auto rounded-[var(--lab-radius)] border border-[var(--border)] bg-[var(--panel)] p-3 font-mono text-xs text-[var(--foreground)]">
                {`[${active.createdAt}] sandbox.boot name=${active.name}\n[${active.createdAt}] sandbox.ready endpoint=${active.endpoint}\n`}
              </pre>
            )}
            {tab === "usage" && (
              <p>
                Requests {active.requests} · Spend ${active.spend.toFixed(2)} (sandbox)
              </p>
            )}
            {tab === "settings" && (
              <pre className="overflow-auto rounded-[var(--lab-radius)] border border-[var(--border)] bg-[var(--panel)] p-3 font-mono text-xs">
                {JSON.stringify(active.env, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </LabChrome>
    );
  }

  return (
    <LabChrome
      active="deploy"
      title="Deploy"
      status={{ label: "Demo", tone: "muted" }}
    >
      <div className="mx-auto max-w-[var(--lab-content-max)] space-y-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-[13px] text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">Preset only.</span> This does not
          create a new host. The endpoint is the live inference API, called with your API key.
        </div>
        <LabDarkModule className="p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="m-0 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--orange)]">
                Cloud builder
              </p>
              <h1 className="m-0 mt-2 text-[1.5rem] font-semibold tracking-tight text-[var(--dark-fg)] md:text-[1.75rem]">
                Deploy on Olora
              </h1>
              <p className="m-0 mt-1 text-[13px] text-[var(--dark-muted)]">
                Wire intelligence and compute into one endpoint.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["agent", "Agent"],
                  ["endpoint", "API Endpoint"],
                  ["app", "AI App"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`rounded-full px-3.5 py-1.5 text-[12px] ${
                    kind === id
                      ? "bg-white font-semibold text-[var(--dark)]"
                      : "border border-white/15 text-[var(--dark-muted)] hover:text-white"
                  }`}
                  onClick={() => setKind(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Deployment graph */}
          <div className="mt-8 flex flex-wrap items-stretch justify-center gap-2">
            <button type="button" className="contents" onClick={() => setFocus("model")}>
              <GraphNode label="Model" value={model} active={focus === "model"} />
            </button>
            <GraphArrow />
            <GraphNode label="Olora" value="Router" accent />
            <GraphArrow />
            <button type="button" className="contents" onClick={() => setFocus("compute")}>
              <GraphNode label="Compute" value={compute} active={focus === "compute"} />
            </button>
            <GraphArrow />
            <button type="button" className="contents" onClick={() => setFocus("endpoint")}>
              <GraphNode
                label="Endpoint"
                value={name || "service"}
                active={focus === "endpoint"}
              />
            </button>
          </div>
          <p className="m-0 mt-3 text-center text-[11px] text-[var(--dark-muted-2)]">
            Click a node to configure it
          </p>
        </LabDarkModule>

        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <LabDarkPanel className="p-5">
            {focus === "model" ? (
              <>
                <h3 className="m-0 text-[14px] font-semibold text-[var(--dark-fg)]">Model</h3>
                <p className="m-0 mt-1 text-[12px] text-[var(--dark-muted)]">
                  Intelligence your service routes through
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`rounded-full px-3.5 py-1.5 text-[13px] ${
                        model === m
                          ? "bg-white font-semibold text-[var(--dark)]"
                          : "border border-white/15 text-[var(--dark-muted)] hover:text-white"
                      }`}
                      onClick={() => setModel(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {focus === "compute" ? (
              <>
                <h3 className="m-0 text-[14px] font-semibold">Compute</h3>
                <p className="m-0 mt-1 text-[12px] text-[var(--dark-muted)]">
                  Hosted inference can use Managed with no GPU required
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {GPUS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`rounded-full px-3.5 py-1.5 text-[13px] ${
                        compute === g
                          ? "bg-white font-semibold text-[var(--dark)]"
                          : "border border-white/15 text-[var(--dark-muted)] hover:text-white"
                      }`}
                      onClick={() => setCompute(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {focus === "endpoint" ? (
              <>
                <h3 className="m-0 text-[14px] font-semibold">Endpoint</h3>
                <p className="m-0 mt-1 text-[12px] text-[var(--dark-muted)]">
                  Service name and environment
                </p>
                <label className="mt-4 block text-[12px] text-[var(--dark-muted)]">
                  Service name
                  <input
                    className="mt-1.5 w-full rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] text-white outline-none focus:border-[var(--orange)]/40"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="mt-3 block text-[12px] text-[var(--dark-muted)]">
                  Env (KEY=value)
                  <textarea
                    className="mt-1.5 w-full rounded-[var(--lab-radius)] border border-white/10 bg-white/5 px-4 py-3 font-mono text-[12px] text-white outline-none focus:border-[var(--orange)]/40"
                    rows={4}
                    value={envText}
                    onChange={(e) => setEnvText(e.target.value)}
                  />
                </label>
              </>
            ) : null}
          </LabDarkPanel>

          <div className="space-y-3">
            <LabDarkPanel className="p-4">
              <div className="text-[10px] uppercase tracking-wide text-[var(--dark-muted-2)]">
                Summary
              </div>
              <dl className="mt-3 space-y-2 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--dark-muted)]">Kind</dt>
                  <dd className="m-0 capitalize text-[var(--dark-fg)]">{kind}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--dark-muted)]">Model</dt>
                  <dd className="m-0 text-[var(--dark-fg)]">{model}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--dark-muted)]">Compute</dt>
                  <dd className="m-0 text-[var(--dark-fg)]">{compute}</dd>
                </div>
              </dl>
              <LabButton
                variant="secondary"
                className="mt-5 !w-full !bg-white !py-2.5 !font-semibold !text-[var(--dark)]"
                onClick={deploySandbox}
              >
                Deploy sandbox →
              </LabButton>
              <p className="m-0 mt-2 text-center text-[11px] text-[var(--dark-muted-2)]">
                Sandbox with no production infra yet
              </p>
            </LabDarkPanel>

            {deployments.length ? (
              <LabDarkPanel className="p-4">
                <div className="text-[10px] uppercase tracking-wide text-[var(--dark-muted-2)]">
                  Sandboxes
                </div>
                <ul className="mt-2 m-0 list-none space-y-1 p-0">
                  {deployments.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-white/5"
                        onClick={() => setActiveId(d.id)}
                      >
                        <span className="truncate text-[13px] text-[var(--dark-fg)]">{d.name}</span>
                        <span className="text-[10px] text-[var(--orange)]">Sandbox</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </LabDarkPanel>
            ) : null}
          </div>
        </div>
      </div>
    </LabChrome>
  );
}
