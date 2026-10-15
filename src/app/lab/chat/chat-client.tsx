"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LabChrome } from "@/components/lab/lab-chrome";
import { Composer } from "@/components/olora/composer";
import { ModelPicker } from "@/components/olora/model-picker";
import { ChatThread } from "@/components/olora/chat-thread";
import { useChat } from "@/components/olora/use-chat";
import { defaultModel, findCurated, curatedModels, type OloraModel } from "@/lib/olora/models";
import {
  deleteConversation,
  PENDING_PROMPT_KEY,
  useBalance,
  useConversations,
  useMarketQuote,
} from "@/lib/olora/hooks";
import { usd } from "@/lib/olora/pricing";
import { useLabAuth } from "@/lib/lab/auth";

const STARTERS = [
  "Help me write a clear, friendly email",
  "Explain a hard idea like I'm new to it",
  "Plan a week of healthy dinners",
  "Review this paragraph and tighten it",
];

export function ChatClient() {
  const params = useSearchParams();
  const { authenticated, login } = useLabAuth();
  const { credits } = useBalance();
  const quote = useMarketQuote(0);
  const conversations = useConversations();
  const { conv, busy, send, reset, load } = useChat();

  const [model, setModel] = useState<OloraModel>(() => findCurated(params.get("model")) || defaultModel());
  const [second, setSecond] = useState<OloraModel | null>(null);
  const [input, setInput] = useState(() => params.get("prompt") || "");
  const [historyOpen, setHistoryOpen] = useState(false);

  // Hand-off from the Home composer.
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_PROMPT_KEY);
    try {
      const { text, model: id } = JSON.parse(pending) as { text: string; model?: string };
      const m = findCurated(id) || model;
      setModel(m);
      if (authenticated) void send(text, [m]);
      else setInput(text);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const active = useMemo(() => (second ? [model, second] : [model]), [model, second]);

  function submit(text = input) {
    if (!text.trim()) return;
    setInput("");
    void send(text, active);
  }

  function toggleCompare() {
    if (second) return setSecond(null);
    const alt = curatedModels().find((m) => m.id !== model.id) || curatedModels()[1];
    setSecond(alt);
  }

  const pickers = (
    <div className="flex flex-wrap items-center gap-1">
      <ModelPicker value={model} onChange={setModel} direction="up" creditCost={quote.creditCost} />
      {second ? (
        <>
          <span className="px-1 text-[12px] text-[var(--silver)]">vs</span>
          <ModelPicker value={second} onChange={setSecond} direction="up" creditCost={quote.creditCost} />
        </>
      ) : null}
      <button
        type="button"
        onClick={toggleCompare}
        aria-pressed={Boolean(second)}
        className={`ml-1 h-8 rounded-full px-3 text-[13px] transition-colors ${
          second ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--muted)] hover:bg-[var(--cloud)] hover:text-[var(--ink)]"
        }`}
      >
        {second ? "Comparing" : "Compare"}
      </button>
    </div>
  );

  return (
    <LabChrome fit active="ai" title="AI">
      <div className="flex min-h-0 flex-1">
        {/* History rail */}
        <aside
          className={`${historyOpen ? "flex" : "hidden"} absolute inset-y-0 left-0 z-20 w-72 flex-col border-r border-[var(--hairline)] bg-[var(--paper)] xl:static xl:flex`}
          aria-label="Conversations"
        >
          <div className="p-3">
            <button
              type="button"
              onClick={() => {
                reset();
                setHistoryOpen(false);
              }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--surface)] text-[14px] font-medium text-[var(--ink)] ring-1 ring-[var(--hairline)] hover:shadow-[var(--shadow-1)]"
            >
              New chat
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {conversations.length === 0 ? (
              <p className="m-0 px-3 py-2 text-[13px] text-[var(--silver)]">Your conversations appear here.</p>
            ) : (
              conversations.map((c) => (
                <div key={c.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      load(c);
                      setModel(findCurated(c.model) || model);
                      setHistoryOpen(false);
                    }}
                    className={`min-w-0 flex-1 truncate rounded-[10px] px-3 py-2 text-left text-[14px] ${
                      conv?.id === c.id ? "bg-[var(--cloud)] text-[var(--ink)]" : "text-[var(--graphite)] hover:bg-[var(--cloud)]"
                    }`}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${c.title}`}
                    onClick={() => {
                      deleteConversation(c.id);
                      if (conv?.id === c.id) reset();
                    }}
                    className="ml-1 hidden h-7 w-7 items-center justify-center rounded-md text-[var(--silver)] hover:text-[var(--ink)] group-hover:flex"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="m-0 border-t border-[var(--hairline)] px-4 py-3 text-[11px] leading-snug text-[var(--silver)]">
            Conversations are saved on this device only.
          </p>
        </aside>

        {/* Conversation */}
        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between px-4 md:px-6">
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="h-8 rounded-full px-3 text-[13px] text-[var(--muted)] hover:bg-[var(--cloud)] hover:text-[var(--ink)] xl:hidden"
            >
              History
            </button>
            <div className="ml-auto text-[13px] tabular-nums text-[var(--muted)]">
              {authenticated ? (credits == null ? "" : `${usd(credits)} available`) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {conv && conv.messages.length ? (
              <ChatThread conv={conv} busy={busy} pendingCount={active.length} creditCost={quote.creditCost} />
            ) : (
              <div className="mx-auto flex h-full max-w-[680px] flex-col justify-center px-5 pb-10">
                <h1 className="ol-rise m-0 text-center text-[32px] font-semibold tracking-[-0.035em] text-[var(--ink)]">
                  What can I help with?
                </h1>
                <div className="ol-rise ol-rise-1 mt-8 grid gap-2 sm:grid-cols-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => (authenticated ? submit(s) : setInput(s))}
                      className="rounded-[14px] px-4 py-3 text-left text-[14px] text-[var(--graphite)] ring-1 ring-[var(--hairline)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 px-4 pb-4 md:px-6 md:pb-6">
            <div className="mx-auto max-w-[760px]">
              {!authenticated ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-[14px] bg-[var(--cloud)] px-4 py-3 text-[14px] text-[var(--graphite)]">
                  <span>Sign in to send messages. It&apos;s free to create an account.</span>
                  <button type="button" onClick={() => login()} className="h-8 shrink-0 rounded-[10px] bg-[var(--ink)] px-4 text-[13px] font-medium text-[var(--paper)]">
                    Sign in
                  </button>
                </div>
              ) : null}
              <Composer
                value={input}
                onChange={setInput}
                onSubmit={() => submit()}
                busy={busy}
                autoFocus
                placeholder={second ? `Ask ${model.name} and ${second.name}` : `Message ${model.name}`}
                leading={pickers}
              />
              <p className="m-0 mt-2 text-center text-[11px] text-[var(--silver)]">
                AI can make mistakes. Check important information.
              </p>
            </div>
          </div>
        </section>
      </div>
    </LabChrome>
  );
}
