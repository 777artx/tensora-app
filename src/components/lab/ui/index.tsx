import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { TensoraMark } from "@/components/lab/tensora-brand";

const baseBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50";

export function LabButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "subtle" | "accent";
}) {
  const styles =
    variant === "primary"
      ? "bg-[var(--hero)] text-[var(--hero-fg)] hover:bg-[#1a1a1c] px-4 py-2"
      : variant === "secondary"
        ? "bg-[var(--panel-3)] text-[var(--foreground)] hover:bg-[#e4e4e6] px-4 py-2"
        : variant === "accent"
          ? "bg-grad text-white hover:brightness-110 px-4 py-2"
          : variant === "ghost"
            ? "border border-[var(--border)] bg-[var(--panel)] text-[var(--foreground)] hover:bg-[var(--panel-2)] px-4 py-2"
            : "bg-[var(--panel-2)] text-[var(--foreground)] hover:bg-[var(--panel-3)] px-3 py-1.5";
  return <button type="button" className={`${baseBtn} ${styles} ${className}`} {...props} />;
}

export function LabBadge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "orange" | "live" | "sandbox" | "danger";
}) {
  const toneClass =
    tone === "orange"
      ? "text-[var(--orange)] bg-[var(--orange-soft)]"
      : tone === "live"
        ? "text-[var(--live)] bg-[rgba(22,163,74,0.1)]"
        : tone === "danger"
          ? "text-[var(--danger)] bg-[rgba(220,38,38,0.08)]"
          : tone === "sandbox"
            ? "text-[var(--muted)] bg-[var(--panel-2)] border border-[var(--border)]"
            : "text-[var(--muted)] bg-[var(--panel-2)]";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function LabStatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "live" | "offline" | "danger";
}) {
  const dot =
    tone === "live"
      ? "bg-[var(--live)] lab-live-dot"
      : tone === "danger"
        ? "bg-[var(--danger)]"
        : tone === "offline"
          ? "bg-[var(--muted-3)]"
          : "bg-[var(--muted-2)]";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--panel)]/90 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)] backdrop-blur-sm">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function LabGrowthPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-[rgba(22,163,74,0.1)] px-2 py-0.5 text-[11px] font-medium text-[var(--live)]">
      ↑ {children}
    </span>
  );
}

export function LabCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--lab-radius-card)] border border-[var(--border)] bg-[var(--panel)] ${className}`}
    >
      {children}
    </div>
  );
}

export function LabHeroCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`lab-dark lab-hero-enter rounded-[var(--lab-radius-card)] bg-[var(--dark)] text-[var(--dark-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Premium black product surface for marketplace / Live / Deploy cores */
export function LabDarkModule({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`lab-dark relative overflow-hidden rounded-[var(--lab-radius-card)] border border-[var(--dark-border)] bg-[var(--dark)] text-[var(--dark-fg)] ${className}`}
    >
      {/* Subtle brand watermark */}
      <TensoraMark
        tone="light"
        size={64}
        className="pointer-events-none absolute -bottom-3 -right-3 opacity-[0.04]"
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export function LabDarkPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--lab-radius)] border border-[var(--dark-border)] bg-[var(--dark-elevated)] ${className}`}
    >
      {children}
    </div>
  );
}

export function LabMetric({
  label,
  value,
  hint,
  size = "md",
}: {
  label: string;
  value: string;
  hint?: string;
  size?: "md" | "lg" | "xl";
}) {
  const valueClass =
    size === "xl"
      ? "text-4xl md:text-5xl font-semibold tracking-tight"
      : size === "lg"
        ? "text-2xl md:text-3xl font-semibold tracking-tight"
        : "text-xl font-semibold tracking-tight tabular-nums";
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
        {label}
      </div>
      <div className={`mt-1 text-[var(--foreground)] ${valueClass}`}>{value}</div>
      {hint ? <div className="mt-1 text-[12px] text-[var(--muted-2)]">{hint}</div> : null}
    </div>
  );
}

export function LabSectionTitle({
  children,
  kicker,
  subtitle,
}: {
  children: ReactNode;
  kicker?: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      {kicker ? (
        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
          {kicker}
        </div>
      ) : null}
      <h2 className="m-0 text-xl font-semibold tracking-tight text-[var(--foreground)] md:text-2xl">
        {children}
      </h2>
      {subtitle ? (
        <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function LabListRow({
  leading,
  title,
  meta,
  trailing,
}: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-[var(--foreground)]">{title}</div>
        {meta ? <div className="mt-0.5 text-[12px] text-[var(--muted)]">{meta}</div> : null}
      </div>
      {trailing ? (
        <div className="shrink-0 text-[13px] font-medium tabular-nums text-[var(--foreground)]">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

export function LabEntryLink({
  href,
  name,
  description,
  icon,
}: {
  href: string;
  name: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-[var(--lab-radius-card)] border border-[var(--border)] bg-[var(--panel)] px-4 py-4 transition-colors hover:bg-[var(--panel-2)]"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--panel-2)] text-[var(--foreground)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-medium tracking-tight text-[var(--foreground)]">
            {name}
          </span>
          <span
            aria-hidden
            className="text-[var(--muted-3)] transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
        <span className="mt-1 block text-sm leading-snug text-[var(--muted)]">{description}</span>
      </span>
    </Link>
  );
}
