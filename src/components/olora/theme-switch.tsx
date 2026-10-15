"use client";

const KEY = "olora-theme";

function apply(next: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode */
  }
}

/** Sun and moon, same stroke as the nav marks. CSS shows the one that matches the page. */
export function ThemeSwitch() {
  function toggle() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    apply(dark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch color theme"
      className="ol-theme flex h-9 w-9 items-center justify-center rounded-lg text-current"
    >
      <svg className="ol-theme-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M15.2 3.8A8.2 8.2 0 1 0 20.2 14 6.4 6.4 0 0 1 15.2 3.8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="ol-theme-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 3.6v2.2M12 18.2v2.2M3.6 12h2.2M18.2 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
