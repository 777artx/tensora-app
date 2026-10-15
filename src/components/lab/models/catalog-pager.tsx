"use client";

function pages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function CatalogPager({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[12px] tabular-nums transition-colors disabled:opacity-35";

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-between gap-3" aria-label="Model pages">
      <span className="text-[12px] tabular-nums text-[var(--muted)]">
        {from}–{to} of {total.toLocaleString()} models
      </span>
      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`${btn} text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--foreground)]`}
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ←
          </button>
          {pages(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-[12px] text-[var(--muted-3)]">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${btn} ${
                  p === page
                    ? "bg-[var(--hero)] font-medium text-[var(--hero-fg)]"
                    : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--foreground)]"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className={`${btn} text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--foreground)]`}
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            →
          </button>
        </div>
      ) : null}
    </nav>
  );
}
