"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { TENSORA_APP_URL } from "@/lib/lab/public-url";
import { getActiveProject, pushActivity } from "@/lib/lab/projects";
import { useBalance } from "@/lib/olora/hooks";
import { curatedModels } from "@/lib/olora/models";
import { usd } from "@/lib/olora/pricing";

type KeyRow = { id: string; name: string; prefix: string; createdAt: string; projectId: string; revoked?: boolean };

/** Use: one key, every supported model, paid from your credit balance. */
export default function UsePage() {
  const { requireAuth, getAccessToken, authenticated, ready } = useLabAuth();
  const { credits } = useBalance();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const headers = await labAuthHeaders(getAccessToken);
      const res = await fetch("/api/lab/keys", { headers });
      if (res.ok) setKeys(((await res.json()) as { keys: KeyRow[] }).keys || []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (ready && authenticated) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  const active = keys.filter((k) => !k.revoked);

  async function createKey() {
    if (!requireAuth("/lab/keys")) return;
    setBusy(true);
    setError(null);
    try {
      const headers = await labAuthHeaders(getAccessToken);
      const res = await fetch("/api/lab/keys", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: `Key ${active.length + 1}`, projectId: getActiveProject().id }),
      });
      const data = (await res.json().catch(() => null)) as { secret?: string; key?: KeyRow; error?: string } | null;
      if (!res.ok || !data?.secret || !data.key) {
        setError(data?.error || "Could not create a key. Please try again.");
        return;
      }
      setRevealed(data.secret);
      setKeys((prev) => [data.key!, ...prev]);
      pushActivity({ kind: "api_key", title: `API key created: ${data.key.name}` });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      const headers = await labAuthHeaders(getAccessToken);
      const res = await fetch(`/api/lab/keys?id=${encodeURIComponent(id)}`, { method: "DELETE", headers });
      if (res.ok) setKeys(((await res.json()) as { keys: KeyRow[] }).keys || []);
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, what: string) {
    void navigator.clipboard.writeText(text);
    setCopied(what);
    window.setTimeout(() => setCopied(null), 1600);
  }

  const shownKey = revealed || "YOUR_OLORA_KEY";
  const curl = [
    `curl ${TENSORA_APP_URL}/api/v1/chat/completions \\`,
    `  -H "Authorization: Bearer ${shownKey}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"model":"olora/auto","messages":[{"role":"user","content":"Hello"}]}'`,
  ].join("\n");

  return (
    <LabChrome active="keys" title="Use" bare>
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-10 md:px-8 lg:pt-14">
        <header className="grid gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="ol-label m-0">Use</p>
            <h1 className="m-0 mt-4 text-[clamp(36px,4.6vw,56px)] font-medium leading-[1] tracking-[-0.035em] text-[var(--ink)]">
              One key. Every model.
            </h1>
            <p className="m-0 mt-4 max-w-[520px] text-[16px] leading-relaxed text-[var(--gray)]">
              Your credits pay for requests to any supported model. No separate provider accounts, no separate bills.
            </p>
          </div>
          <div className="text-left lg:text-right">
            <div className="ol-label">Credit balance</div>
            <div className="ol-num mt-2 text-[32px] leading-none text-[var(--ink)]">{credits == null ? "—" : usd(credits)}</div>
            <Link href="/lab/market" className="mt-2 inline-block text-[13px] text-[var(--gray)] underline-offset-4 hover:text-[var(--ink)] hover:underline">
              Top up below retail →
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* The request — the black box */}
          <section className="ol-panel overflow-hidden">
            <header className="ol-panel-head">
              <span className="ol-label text-[var(--graphite)]">Your first request</span>
              <button type="button" onClick={() => copy(curl, "curl")} className="ol-key">
                {copied === "curl" ? "Copied" : "Copy"}
              </button>
            </header>
            <pre className="m-0 overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-[var(--graphite)]">{curl}</pre>
            <div className="grid border-t border-[var(--hairline)] sm:grid-cols-2">
              <div className="px-5 py-4">
                <div className="ol-label">Automatic routing</div>
                <p className="m-0 mt-2 text-[13px] leading-relaxed text-[var(--gray)]">
                  <code className="text-[var(--ink)]">olora/auto</code> picks a model for each request.
                </p>
              </div>
              <div className="border-t border-[var(--hairline)] px-5 py-4 sm:border-l sm:border-t-0">
                <div className="ol-label">Or choose one</div>
                <p className="m-0 mt-2 text-[13px] leading-relaxed text-[var(--gray)]">
                  Set <code className="text-[var(--ink)]">model</code> to any id below. OpenAI-compatible.
                </p>
              </div>
            </div>
          </section>

          {/* Keys */}
          <section className="rounded-[16px] p-5 ring-1 ring-[var(--hairline)]">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[17px] font-medium text-[var(--ink)]">API keys</h2>
              <button
                type="button"
                onClick={() => void createKey()}
                disabled={busy}
                className="h-9 rounded-[10px] bg-[var(--brand)] px-4 text-[13px] font-medium text-[var(--brand-ice)] hover:bg-[var(--brand-hover)] disabled:opacity-50"
              >
                {authenticated ? "Create key" : "Sign in to create"}
              </button>
            </div>
            {error ? <p className="m-0 mt-3 text-[13px] text-[var(--negative)]">{error}</p> : null}
            {revealed ? (
              <div className="mt-4 rounded-[12px] bg-[var(--cloud)] p-4">
                <div className="ol-label">Copy it now. It is shown once.</div>
                <code className="mt-2 block break-all font-mono text-[13px] text-[var(--ink)]">{revealed}</code>
                <button type="button" onClick={() => copy(revealed, "key")} className="mt-3 text-[13px] font-medium text-[var(--ink)] underline underline-offset-4">
                  {copied === "key" ? "Copied" : "Copy key"}
                </button>
              </div>
            ) : null}
            <ul className="m-0 mt-4 list-none p-0">
              {active.length === 0 ? (
                <li className="py-6 text-center text-[13px] text-[var(--silver)]">{authenticated ? "No keys yet." : "Sign in to see your keys."}</li>
              ) : (
                active.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] py-3">
                    <div className="min-w-0">
                      <div className="text-[14px] text-[var(--ink)]">{k.name}</div>
                      <div className="ol-num truncate text-[11px] text-[var(--silver)]">
                        {k.prefix}… · {new Date(k.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button type="button" onClick={() => void revoke(k.id)} disabled={busy} className="text-[13px] text-[var(--gray)] hover:text-[var(--negative)]">
                      Revoke
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        {/* Supported models */}
        <section className="mt-14">
          <h2 className="m-0 text-[22px] font-medium tracking-[-0.02em] text-[var(--ink)]">Supported models</h2>
          <ul className="m-0 mt-5 grid list-none gap-0 p-0 sm:grid-cols-2">
            {curatedModels().map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 border-t border-[var(--hairline)] py-3.5 sm:pr-8">
                <span className="text-[15px] text-[var(--ink)]">{m.name}</span>
                <button type="button" onClick={() => copy(m.id, m.id)} className="ol-num truncate text-[12px] text-[var(--gray)] hover:text-[var(--ink)]">
                  {copied === m.id ? "Copied" : m.id}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </LabChrome>
  );
}
