/**
 * Lab marks. Each lab's real logo (monochrome SVG, rendered as a CSS mask so it
 * takes the surrounding ink colour). Falls back to a neutral glyph.
 */
const LOGO: Record<string, string> = {
  anthropic: "anthropic",
  openai: "openai",
  google: "gemini",
  "x-ai": "grok",
  deepseek: "deepseek",
  qwen: "qwen",
  mistralai: "mistral",
  "z-ai": "zai",
  moonshotai: "moonshot",
  "meta-llama": "meta",
  nvidia: "nvidia",
  microsoft: "microsoft",
};

const BASE = "/lab-dashboard/images/inference-model-icons";

export function labLogoUrl(provider: string): string | null {
  const f = LOGO[provider.replace(/^~/, "")];
  return f ? `${BASE}/${f}.svg` : null;
}

export function LabMark({
  provider,
  size = 28,
  tone = "light",
}: {
  provider: string;
  size?: number;
  tone?: "light" | "dark";
}) {
  const url = labLogoUrl(provider);
  const dark = tone === "dark";
  const glyph = Math.round(size * 0.56);
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${
        dark ? "bg-white/[0.06] text-[#f5f5f2] ring-1 ring-white/[0.08]" : "bg-[var(--cloud)] text-[var(--ink)]"
      }`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
    >
      {url ? (
        <span
          className="block bg-current"
          style={{
            width: glyph,
            height: glyph,
            WebkitMask: `url(${url}) center / contain no-repeat`,
            mask: `url(${url}) center / contain no-repeat`,
          }}
        />
      ) : (
        <span className="font-mono text-[11px] uppercase">{provider.slice(0, 1)}</span>
      )}
    </span>
  );
}
