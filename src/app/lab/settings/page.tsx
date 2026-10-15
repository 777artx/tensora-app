"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { RequireAuth } from "@/components/lab/require-auth";
import { Button, Page, PageHeader, SectionHeader } from "@/components/olora/primitives";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { currentPlanName } from "@/lib/olora/plans";
import { loadConversations } from "@/lib/olora/hooks";

const DEV_TOOLS = [
  { href: "/lab/keys", title: "API keys", body: "Use your Olora balance from your own code." },
  { href: "/lab/docs", title: "Documentation", body: "API reference and quick-start guides." },
  { href: "/lab/apis", title: "API catalog", body: "Browse every model available over the API." },
  { href: "/lab/agents", title: "Agents", body: "Build and run automated assistants." },
  { href: "/lab/compute", title: "GPU compute", body: "Rent GPUs by the hour." },
  { href: "/lab/deploy", title: "Deploy", body: "Host models and apps." },
  { href: "/lab/integrations", title: "Integrations", body: "Connect tools and services." },
  { href: "/lab/activity", title: "Activity log", body: "Every request and charge, in full detail." },
];

function Row({ label, value, action }: { label: string; value: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--hairline)] py-5">
      <div className="min-w-0">
        <div className="text-[13px] text-[var(--muted)]">{label}</div>
        <div className="mt-0.5 truncate text-[15px] text-[var(--ink)]">{value}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default function AccountPage() {
  const { getAccessToken, userLabel, userSub, logout } = useLabAuth();
  const [keys, setKeys] = useState<number | null>(null);
  const [convCount, setConvCount] = useState(0);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    setConvCount(loadConversations().length);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/lab/keys", { headers: await labAuthHeaders(getAccessToken) });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { keys?: { revoked?: boolean }[] };
          setKeys((data.keys || []).filter((k) => !k.revoked).length);
        }
      } catch {
        /* leave unknown */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  function clearChats() {
    if (!window.confirm("Delete all conversations saved in this browser? This can't be undone.")) return;
    localStorage.removeItem("olora-conversations");
    window.dispatchEvent(new Event("olora-conversations-change"));
    setConvCount(0);
    setCleared(true);
  }

  return (
    <LabChrome active="settings" title="Account & Settings">
      <RequireAuth>
        <Page width="narrow">
          <PageHeader title="Account & Settings" />

          <section className="ol-rise">
            <SectionHeader title="Account" />
            <Row label="Signed in as" value={userLabel || "—"} />
            {userSub && userSub !== userLabel ? <Row label="Account ID" value={<span className="font-mono text-[13px]">{userSub}</span>} /> : null}
            <Row
              label="Plan"
              value={currentPlanName()}
              action={<Link href="/lab/subscribe" className="text-[14px] text-[var(--ink)] underline-offset-2 hover:underline">Subscription</Link>}
            />
            <div className="border-t border-[var(--hairline)] pt-6">
              <Button variant="secondary" onClick={() => void logout()}>Sign out</Button>
            </div>
          </section>

          <section className="mt-14">
            <SectionHeader title="Privacy" />
            <Row
              label="Conversations"
              value={cleared ? "All conversations deleted" : `${convCount} saved in this browser only`}
              action={convCount > 0 ? <Button size="sm" variant="ghost" onClick={clearChats}>Delete all</Button> : null}
            />
          </section>

          <section className="mt-14 pb-10">
            <SectionHeader
              title="Developer tools"
              description={`For building with Olora. Not needed to chat or trade.${keys != null ? ` ${keys} active API key${keys === 1 ? "" : "s"}.` : ""}`}
            />
            <ul className="m-0 list-none p-0">
              {DEV_TOOLS.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="group flex items-center justify-between gap-4 border-t border-[var(--hairline)] py-4 transition-colors">
                    <div>
                      <div className="text-[15px] text-[var(--ink)]">{t.title}</div>
                      <div className="text-[13px] text-[var(--muted)]">{t.body}</div>
                    </div>
                    <span aria-hidden className="text-[var(--silver)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--ink)]">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Page>
      </RequireAuth>
    </LabChrome>
  );
}
