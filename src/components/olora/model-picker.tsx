"use client";

import { useEffect, useId, useRef, useState } from "react";
import { curatedModels, type OloraModel } from "@/lib/olora/models";
import { costPerMessage, usdSmall } from "@/lib/olora/pricing";
import { ProviderLogo } from "@/components/olora/primitives";
import { Icon } from "@/components/olora/nav";

const TIER_LABEL: Record<OloraModel["tier"], string> = {
  flagship: "Flagship",
  everyday: "Frontier",
};

/** Unobtrusive model switcher. Opens a curated list grouped by what it's good for. */
export function ModelPicker({
  value,
  onChange,
  align = "left",
  direction = "down",
  creditCost = 1,
}: {
  value: OloraModel;
  onChange: (m: OloraModel) => void;
  align?: "left" | "right";
  direction?: "up" | "down";
  /** $ paid per $1 credit — lets us show the real per-message price. */
  creditCost?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const models = curatedModels();
  const groups = (["flagship", "everyday"] as const)
    .map((t) => ({ tier: t, items: models.filter((m) => m.tier === t) }))
    .filter((g) => g.items.length);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="inline-flex h-8 items-center gap-2 rounded-full pl-1.5 pr-3 text-[13px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--cloud)]"
      >
        <ProviderLogo provider={value.provider} size={22} />
        <span className="max-w-[11rem] truncate">{value.name}</span>
        <Icon name="chevron" size={14} className={`text-[var(--silver)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Choose a model"
          className={`ol-rise absolute z-50 w-[min(22rem,calc(100vw-2rem))] ol-panel overflow-hidden p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.95)] ${
            align === "right" ? "right-0" : "left-0"
          } ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          <div className="max-h-[min(26rem,60vh)] overflow-y-auto">
            {groups.map((g) => (
              <div key={g.tier} className="py-1">
                <div className="px-3 pb-1 pt-2 text-[12px] text-[var(--silver)]">
                  {TIER_LABEL[g.tier]}
                </div>
                {g.items.map((m) => {
                  const on = m.id === value.id;
                  const per = costPerMessage(m.inputPerM, m.outputPerM);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => {
                        onChange(m);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                        on ? "bg-[var(--cloud)]" : "hover:bg-[var(--cloud)]"
                      }`}
                    >
                      <ProviderLogo provider={m.provider} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-[var(--ink)]">{m.name}</span>
                        <span className="block truncate text-[12px] text-[var(--muted)]">{m.strength}</span>
                      </span>
                      <span className="shrink-0 text-right font-mono text-[12px] tabular-nums text-[var(--graphite)]">
                        {per != null ? `~${usdSmall(per * creditCost)}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="m-0 border-t border-white/[0.06] px-3 py-2.5 text-[11px] leading-snug text-[var(--silver)]">
            Prices are an estimate per typical message (about 750 words in, 375 words out).
          </p>
        </div>
      ) : null}
    </div>
  );
}
