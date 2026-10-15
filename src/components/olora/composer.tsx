"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/olora/nav";

/** The one chat input used on Home and in Chat. */
export function Composer({
  value,
  onChange,
  onSubmit,
  busy = false,
  placeholder = "Ask anything",
  leading,
  autoFocus = false,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  placeholder?: string;
  leading?: ReactNode;
  autoFocus?: boolean;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const canSend = value.trim().length > 0 && !busy;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
      className="ol-panel ol-composer p-2 transition-shadow"
    >
      <label htmlFor="ol-composer" className="sr-only">
        Message
      </label>
      <textarea
        id="ol-composer"
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        placeholder={placeholder}
        className={`block w-full resize-none bg-transparent px-3 pt-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--silver)] ${
          size === "lg" ? "min-h-[64px] text-[17px]" : "min-h-[44px] text-[15px]"
        }`}
      />
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">{leading}</div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-[background,opacity,transform] duration-200 active:scale-95 ${
            canSend
              ? "bg-[var(--brand)] text-[var(--brand-ice)]"
              : "bg-[var(--raise)] text-[var(--silver)]"
          }`}
        >
          {busy ? <span className="h-3 w-3 rounded-[3px] bg-[var(--paper)]" /> : <Icon name="up" size={16} strokeWidth={2} />}
        </button>
      </div>
    </form>
  );
}
