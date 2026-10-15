import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LabMark } from "@/components/olora/lab-mark";

/* Olora primitives. One button language, one surface language. */

type BtnVariant = "primary" | "secondary" | "ghost" | "inverse";
type BtnSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "bg-[var(--brand)] text-[var(--brand-ice)] hover:bg-[var(--brand-hover)]",
  secondary:
    "bg-transparent text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--mist)] hover:bg-[var(--cloud)]",
  ghost: "text-[var(--graphite)] hover:bg-[var(--cloud)] hover:text-[var(--ink)]",
  inverse: "bg-[var(--paper)] text-[var(--ink)] hover:opacity-90",
};

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

export function btnClass(variant: BtnVariant = "primary", size: BtnSize = "md", extra = "") {
  return `${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return <button type="button" className={btnClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: BtnVariant;
  size?: BtnSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={btnClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/** Page container with consistent width and rhythm. */
export function Page({
  children,
  width = "default",
  className = "",
}: {
  children: ReactNode;
  width?: "narrow" | "default" | "wide";
  className?: string;
}) {
  const max = width === "narrow" ? "max-w-[720px]" : width === "wide" ? "max-w-[1200px]" : "max-w-[1040px]";
  return <div className={`mx-auto w-full ${max} ${className}`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="ol-rise flex flex-col gap-5 pb-10 pt-6 md:flex-row md:items-end md:justify-between md:pt-10">
      <div className="max-w-[640px]">
        {eyebrow ? (
          <p className="m-0 mb-3 text-[13px] font-medium text-[var(--muted)]">{eyebrow}</p>
        ) : null}
        <h1 className="m-0 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--ink)] md:text-[44px]">
          {title}
        </h1>
        {lede ? (
          <p className="m-0 mt-4 text-[17px] leading-relaxed text-[var(--muted)]">{lede}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="m-0 text-[22px] font-semibold tracking-[-0.025em] text-[var(--ink)]">{title}</h2>
        {description ? (
          <p className="m-0 mt-1.5 text-[15px] text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Surface({
  children,
  className = "",
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark" | "muted";
}) {
  const t =
    tone === "dark"
      ? "ol-panel"
      : tone === "muted"
        ? "bg-[var(--cloud)]"
        : "bg-[var(--surface)] ring-1 ring-[var(--hairline)]";
  return <div className={`rounded-[var(--radius-lg)] ${t} ${className}`}>{children}</div>;
}

/** Label/value pair. Value uses tabular figures. */
export function Stat({
  label,
  value,
  note,
  size = "md",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-[var(--muted)]">{label}</div>
      <div
        className={`mt-1 font-semibold tabular-nums tracking-[-0.02em] text-[var(--foreground)] ${
          size === "lg" ? "text-[32px] leading-tight" : "text-[22px]"
        }`}
      >
        {value}
      </div>
      {note ? <div className="mt-1 text-[13px] text-[var(--muted)]">{note}</div> : null}
    </div>
  );
}

/** Back-compat: renders Olora's own lab mark (no third-party logos). Pass `provider`. */
export function ProviderLogo({ provider = "openai", size = 28 }: { src?: string; alt?: string; size?: number; provider?: string }) {
  return <LabMark provider={provider} size={size} />;
}

export function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error" | "success";
}) {
  const t =
    tone === "error"
      ? "text-[var(--negative)] bg-[var(--cloud)]"
      : tone === "success"
        ? "text-[var(--positive)] bg-[var(--cloud)]"
        : "text-[var(--graphite)] bg-[var(--cloud)]";
  return <div className={`rounded-[var(--radius)] px-4 py-3 text-[14px] leading-relaxed ${t}`}>{children}</div>;
}

/**
 * Instrument panel: near-black plate, brushed-metal hairline, optional header row.
 * The one container for data across the app.
 */
export function Panel({
  label,
  meta,
  children,
  className = "",
  bodyClassName = "",
}: {
  label?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`ol-panel flex min-h-0 flex-col ${className}`}>
      {label || meta ? (
        <header className="ol-panel-head shrink-0">
          <span className="ol-label">{label}</span>
          {meta ? <div className="flex min-w-0 items-center gap-2">{meta}</div> : null}
        </header>
      ) : null}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** Small mono toggle for instrument controls (Brief / Standard, Book / Simple). */
export function Keys<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="ol-keys">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className="ol-key"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Live indicator: a steady dot, not a ping. */
export function LiveDot({ on = true }: { on?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 rounded-full ${on ? "lab-live-dot bg-[var(--brand)]" : "bg-[var(--mist)]"}`}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-grid auto-cols-fr grid-flow-col gap-1 rounded-[11px] bg-[var(--cloud)] p-1 ring-1 ring-inset ring-[var(--hairline)]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex h-9 items-center justify-center rounded-[8px] px-5 text-[13px] font-medium transition-[background-color,color] duration-150 ${
            value === o.value
              ? "bg-[var(--ink)] text-[var(--paper)]"
              : "text-[var(--gray)] hover:text-[var(--ink)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
