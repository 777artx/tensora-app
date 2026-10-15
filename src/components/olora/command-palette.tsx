"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, PRIMARY_NAV, SECONDARY_NAV, type IconName } from "@/components/olora/nav";
import { LabMark } from "@/components/olora/lab-mark";
import { curatedModels } from "@/lib/olora/models";

type Item = { id: string; group: string; label: string; hint?: string; icon?: IconName; provider?: string; run: () => void };

/**
 * ⌘K. Every destination and every model, one keystroke away. Typing a sentence that
 * matches nothing turns into "Ask <default model>", so the palette is also a launcher.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const all = useMemo<Item[]>(() => {
    const go = (href: string) => () => router.push(href);
    return [
      ...PRIMARY_NAV.map((n) => ({ id: n.id, group: "Go to", label: n.label, icon: n.icon, run: go(n.href) })),
      ...SECONDARY_NAV.map((n) => ({ id: n.id, group: "Go to", label: n.label, icon: n.icon, run: go(n.href) })),
      ...curatedModels().map((m) => ({
        id: m.id,
        group: "Chat with",
        label: m.name,
        hint: m.bestFor,
        provider: m.provider,
        run: go(`/lab/chat?model=${encodeURIComponent(m.id)}`),
      })),
    ];
  }, [router]);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    const hits = all.filter((it) => `${it.label} ${it.hint ?? ""} ${it.group}`.toLowerCase().includes(s));
    if (hits.length) return hits;
    return [
      {
        id: "ask",
        group: "Ask",
        label: `Ask “${q.trim()}”`,
        icon: "chat" as IconName,
        run: () => router.push(`/lab/chat?prompt=${encodeURIComponent(q.trim())}`),
      },
    ];
  }, [q, all, router]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setI(0);
    requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  useEffect(() => setI(0), [q]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: "nearest" });
  }, [i]);

  if (!open) return null;

  function pick(it: Item | undefined) {
    if (!it) return;
    onClose();
    it.run();
  }

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        onMouseDown={(e) => e.stopPropagation()}
        className="ol-pop w-full max-w-[560px] overflow-hidden rounded-[18px] bg-[var(--surface)] shadow-[var(--shadow-2)] ring-1 ring-[var(--mist)]/40"
        style={{ transformOrigin: "top center" }}
      >
        <div className="flex items-center gap-3 px-5">
          <Icon name="search" size={17} className="text-[var(--silver)]" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") (e.preventDefault(), setI((v) => Math.min(items.length - 1, v + 1)));
              else if (e.key === "ArrowUp") (e.preventDefault(), setI((v) => Math.max(0, v - 1)));
              else if (e.key === "Enter") (e.preventDefault(), pick(items[i]));
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Go anywhere, pick a model, or ask"
            aria-label="Search commands"
            className="h-14 flex-1 bg-transparent text-[16px] text-[var(--ink)] outline-none placeholder:text-[var(--silver)]"
          />
          <kbd className="rounded-[6px] px-1.5 py-0.5 font-sans text-[11px] text-[var(--silver)] ring-1 ring-[var(--hairline)]">esc</kbd>
        </div>
        <div ref={list} role="listbox" className="max-h-[52vh] overflow-y-auto border-t border-[var(--hairline)] p-1.5">
          {items.map((it, n) => {
            const head = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            const on = n === i;
            return (
              <div key={it.id}>
                {head ? <div className="px-3 pb-1.5 pt-3 text-[12px] text-[var(--silver)]">{head}</div> : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-i={n}
                  onMouseMove={() => setI(n)}
                  onClick={() => pick(it)}
                  className={`flex h-11 w-full items-center gap-3 rounded-[11px] px-3 text-left text-[14px] ${on ? "bg-[var(--cloud)] text-[var(--ink)]" : "text-[var(--graphite)]"}`}
                >
                  {it.provider ? (
                    <LabMark provider={it.provider} size={22} />
                  ) : (
                    <span className="flex h-[22px] w-[22px] items-center justify-center">
                      <Icon name={it.icon ?? "arrow"} size={17} className={on ? "text-[var(--ink)]" : "text-[var(--silver)]"} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.hint ? <span className="text-[13px] text-[var(--silver)]">{it.hint}</span> : null}
                  {on ? <Icon name="enter" size={15} className="text-[var(--silver)]" /> : null}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
