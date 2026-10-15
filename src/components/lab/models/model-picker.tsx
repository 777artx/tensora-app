"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InferenceModel } from "@/lib/lab/inference-catalog";
import {
  filterCatalog,
  getModelById,
  providerLabel,
  providerLogoUrl,
  TENSORA_AUTO,
} from "@/lib/lab/inference-catalog";

export function ModelPicker({
  selected,
  onChange,
  max = 4,
  min = 1,
  includeAuto = true,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  min?: number;
  includeAuto?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const list = filterCatalog({ query, sort: "name" }).slice(0, 80);
    if (includeAuto && (!query || "tensora auto".includes(query.toLowerCase()))) {
      return [TENSORA_AUTO, ...list.filter((m) => m.id !== TENSORA_AUTO.id)];
    }
    return list;
  }, [query, includeAuto]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggle(id: string) {
    if (selected.includes(id)) {
      if (selected.length <= min) return;
      onChange(selected.filter((x) => x !== id));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, id]);
  }

  const chips = selected
    .map((id) => getModelById(id))
    .filter(Boolean) as InferenceModel[];

  return (
    <div ref={rootRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((m) => (
          <span
            key={m.id}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-white py-1.5 pl-1.5 pr-2 shadow-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--panel-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={providerLogoUrl(m.provider, m.logoDomain)}
                alt=""
                className="h-4 w-4 object-contain"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold leading-tight text-[var(--foreground)]">
                {m.name}
              </span>
              <span className="block truncate text-[10px] text-[var(--muted)]">
                {providerLabel(m.provider)}
              </span>
            </span>
            <button
              type="button"
              className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--panel-2)] hover:text-[var(--foreground)] disabled:opacity-30"
              onClick={() => toggle(m.id)}
              aria-label={`Remove ${m.name}`}
              disabled={selected.length <= min}
            >
              ×
            </button>
          </span>
        ))}

        {selected.length < max ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed px-3.5 text-[13px] font-medium transition-colors ${
              open
                ? "border-[var(--orange)] bg-[var(--orange-soft)] text-[var(--foreground)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted-3)] hover:text-[var(--foreground)]"
            }`}
          >
            + Add model
          </button>
        ) : null}

        <span className="ml-auto text-[11px] tabular-nums text-[var(--muted)]">
          {selected.length}/{max}
        </span>
      </div>

      {open ? (
        <div className="absolute z-30 mt-2 w-full max-w-md overflow-hidden rounded-[var(--lab-radius-card)] border border-[var(--border)] bg-white shadow-lg shadow-black/10">
          <div className="border-b border-[var(--border-subtle)] p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models…"
              className="h-9 w-full rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-3.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--orange)]/50"
            />
          </div>
          <ul className="m-0 max-h-64 list-none overflow-y-auto p-1">
            {options.map((m) => {
              const on = selected.includes(m.id);
              const disabled = !on && selected.length >= max;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      toggle(m.id);
                      if (!on) setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-[var(--lab-radius)] px-2.5 py-2 text-left disabled:opacity-30 ${
                      on
                        ? "bg-[var(--orange-soft)]"
                        : "hover:bg-[var(--panel-2)]"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={providerLogoUrl(m.provider, m.logoDomain)}
                        alt=""
                        className="h-5 w-5 object-contain"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">
                        {m.name}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-[var(--muted)]">
                        {m.id}
                      </span>
                    </span>
                    {on ? (
                      <span className="text-[11px] font-medium text-[var(--orange)]">Added</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
