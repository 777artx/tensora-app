"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { findCurated } from "@/lib/olora/models";
import { usdSmall } from "@/lib/olora/pricing";
import type { Conversation, StoredMessage } from "@/lib/olora/hooks";
import { ProviderLogo } from "@/components/olora/primitives";

function Reply({ m, creditCost }: { m: StoredMessage; creditCost: number }) {
  const model = findCurated(m.model);
  const paid = m.cost != null ? m.cost * creditCost : null;
  const saved = m.cost != null && paid != null ? m.cost - paid : 0;
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--ink)]">
        {model ? <ProviderLogo provider={model.provider} size={20} /> : null}
        {model?.name ?? m.model ?? "Assistant"}
      </div>
      {m.error ? (
        <div className="rounded-[var(--radius)] bg-[var(--cloud)] px-4 py-3 text-[14px] text-[var(--graphite)]">
          {m.content}{" "}
          {/credits/i.test(m.content) ? (
            <Link href="/lab/billing" className="font-medium text-[var(--ink)] underline underline-offset-2">
              Add credits
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="ol-prose">{m.content}</div>
      )}
      {!m.error && m.included ? (
        <div className="mt-2 text-[12px] tabular-nums text-[var(--silver)]">
          {(model?.name ?? "Assistant").split(" ")[0]} · Included
        </div>
      ) : !m.error && paid != null ? (
        <div className="mt-2 text-[12px] tabular-nums text-[var(--silver)]">
          {(model?.name ?? "Assistant").split(" ")[0]} · {usdSmall(paid)}
          {saved >= 0.0005 ? <span className="ml-3 text-[var(--ink)]">Saved {usdSmall(saved)}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Groups consecutive assistant replies to the same prompt (compare mode → side by side). */
function turns(messages: StoredMessage[]) {
  const out: { user: StoredMessage; replies: StoredMessage[] }[] = [];
  for (const m of messages) {
    if (m.role === "user") out.push({ user: m, replies: [] });
    else if (out.length) out[out.length - 1].replies.push(m);
  }
  return out;
}

export function ChatThread({
  conv,
  busy,
  pendingCount,
  creditCost = 1,
}: {
  conv: Conversation;
  busy: boolean;
  pendingCount: number;
  creditCost?: number;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conv.messages.length, busy]);

  const list = turns(conv.messages);

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-10 pt-8 md:px-8">
      {list.map((t, i) => {
        const last = i === list.length - 1;
        const waiting = last && busy && t.replies.length === 0;
        const cols = Math.max(t.replies.length, waiting ? pendingCount : 1);
        return (
          <div key={t.user.id} className="mb-10">
            <div className="mb-6 flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-[20px] bg-[var(--cloud)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--ink)]">
                {t.user.content}
              </div>
            </div>
            <div className={`grid gap-8 ${cols > 1 ? "md:grid-cols-2" : ""}`}>
              {t.replies.map((r) => (
                <Reply key={r.id} m={r} creditCost={creditCost} />
              ))}
              {waiting
                ? Array.from({ length: pendingCount }).map((_, k) => (
                    <div key={k} className="ol-typing pt-2" aria-label="Thinking">
                      <span />
                      <span />
                      <span />
                    </div>
                  ))
                : null}
            </div>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}
