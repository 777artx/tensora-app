"use client";

import { useEffect, useRef, useState } from "react";
import { LabMark } from "@/components/olora/lab-mark";
import type { MarketSnap } from "@/components/olora/market-snapshot";
import { Segmented } from "@/components/olora/primitives";
import { TENSORA_APP_URL } from "@/lib/lab/public-url";
import { curatedModels } from "@/lib/olora/models";
import { costPerMessage, effectiveCreditCost, usd, usdSmall } from "@/lib/olora/pricing";

const SCRIPTS = [
  {
    prompt: "What can I cook with eggs and rice?",
    answer:
      "Try egg fried rice. Scramble the eggs, add cooked rice and a splash of soy sauce, toss in any vegetables you have, then finish with spring onions.",
  },
  {
    prompt: "Help me write a birthday message.",
    answer:
      "Happy birthday! Hope your day is full of good food, big laughs and your favourite people. Here's to another year of making memories together.",
  },
  {
    prompt: "Give me a quick study tip.",
    answer:
      "Close your notes and explain what you just learned out loud, as if teaching a friend. The parts you struggle to explain are exactly what to review next.",
  },
] as const;

const CYCLE_MS = 8000;

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

/** Ease a number toward its target over `ms`. */
function useTween(target: number, ms = 400, off = false) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (off) {
      setV(target);
      from.current = target;
      return;
    }
    const a = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const x = a + (target - a) * e;
      setV(x);
      from.current = x;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, off]);
  return v;
}

/**
 * The pitch, played out: a prompt types, an answer streams, and the price of
 * that model drops from list to what it costs with credit from the book.
 */
export function SavingsDemo({ snap }: { snap: MarketSnap }) {
  const reduce = useReducedMotion();
  const models = curatedModels().slice(0, 3);
  const [mi, setMi] = useState(0);
  const [unit, setUnit] = useState<"output" | "input">("output");
  const [si, setSi] = useState(0);
  const [typed, setTyped] = useState(0);
  const [words, setWords] = useState(0);

  const script = SCRIPTS[si];
  const answerWords = script.answer.split(" ");
  const model = models[mi] ?? models[0];

  // Drive one cycle: type prompt, stream answer, hold, advance.
  useEffect(() => {
    if (reduce) {
      setTyped(script.prompt.length);
      setWords(answerWords.length);
      return;
    }
    setTyped(0);
    setWords(0);
    const timers: number[] = [];
    const typeMs = 38;
    for (let i = 1; i <= script.prompt.length; i++) timers.push(window.setTimeout(() => setTyped(i), i * typeMs));
    const streamAt = script.prompt.length * typeMs + 450;
    for (let w = 1; w <= answerWords.length; w++) timers.push(window.setTimeout(() => setWords(w), streamAt + w * 70));
    timers.push(window.setTimeout(() => setSi((s) => (s + 1) % SCRIPTS.length), CYCLE_MS));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [si, mi, reduce]);

  const streaming = words < answerWords.length;
  const cost = effectiveCreditCost(snap.book?.bestAsk, snap.feeBps);
  const list = unit === "output" ? model.outputPerM : model.inputPerM;
  const ours = list * cost;
  const before = useTween(list, 400, reduce);
  const after = useTween(ours, 400, reduce);
  const save = list - ours;
  const savePct = list > 0 ? (save / list) * 100 : 0;

  const snippet = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${TENSORA_APP_URL}/api/v1",
  apiKey: process.env.OLORA_API_KEY,
});

const res = await client.chat.completions.create({
  model: "${model.id}",
  messages: [{ role: "user", content: "${script.prompt}" }],
  stream: true,
});`;

  return (
    <div className="ol-panel grid overflow-hidden md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
      {/* Request */}
      <div className="flex min-w-0 flex-col border-b border-white/[0.07] p-6 md:border-b-0 md:border-r">
        <span className="ol-label">Your prompt</span>
        <div className="relative mt-4" aria-label="Sample prompt">
          {/* Sizers: reserve the tallest prompt so nothing jumps. */}
          <div className="invisible grid [grid-template-areas:'s']" aria-hidden>
            {SCRIPTS.map((s) => (
              <span key={s.prompt} className="text-[26px] font-medium leading-[1.2] tracking-[-0.02em] [grid-area:s]">
                {s.prompt}
              </span>
            ))}
          </div>
          <p className="absolute inset-0 m-0 text-[26px] font-medium leading-[1.2] tracking-[-0.02em] text-[#f5f5f2]">
            {script.prompt.slice(0, typed)}
            {!reduce && typed < script.prompt.length ? (
              <span className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] animate-pulse bg-white/70 align-baseline" />
            ) : null}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-white/[0.07] pt-4">
          <span className="ol-label">Olora API key</span>
          <code className="font-mono text-[12px] text-white/70">sk-olora-••••7x9k</code>
        </div>

        <details className="group mt-4">
          <summary className="cursor-pointer list-none text-[12px] text-white/50 hover:text-white [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition-transform group-open:rotate-90">›</span> View API snippet
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-[8px] bg-white/[0.04] p-3 font-mono text-[11px] leading-relaxed text-white/70 ring-1 ring-inset ring-white/[0.06]">
            {snippet}
          </pre>
        </details>
      </div>

      {/* Answer + price */}
      <div className="flex min-w-0 flex-col p-6">
        <div className="flex items-center gap-2">
          <span className="ol-label">The answer</span>
          <span role="status" className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/45">
            {streaming ? "Streaming" : "Ready"}
          </span>
        </div>
        <div className="relative mt-4" aria-live="off">
          <div className="invisible grid [grid-template-areas:'s']" aria-hidden>
            {SCRIPTS.map((s) => (
              <span key={s.answer} className="text-[15px] leading-[1.6] [grid-area:s]">
                {s.answer}
              </span>
            ))}
          </div>
          <p className="absolute inset-0 m-0 text-[15px] leading-[1.6] text-white/85">
            {answerWords.slice(0, words).join(" ")}
            {streaming && words > 0 ? <span className="text-white/30"> {answerWords[words]}</span> : null}
          </p>
        </div>

        <div className="mt-6 border-t border-white/[0.07] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="radiogroup" aria-label="Model" className="flex flex-wrap gap-1">
              {models.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={i === mi}
                  onClick={() => setMi(i)}
                  className={`flex h-8 items-center gap-2 rounded-[8px] pl-1 pr-3 text-[12px] transition-colors ${
                    i === mi ? "bg-[var(--brand-soft)] text-white ring-1 ring-inset ring-[var(--brand)]" : "text-white/50 hover:text-white"
                  }`}
                >
                  <LabMark provider={m.provider} size={22} tone="dark" />
                  {m.name}
                </button>
              ))}
            </div>
            <Segmented
              label="Token pricing unit"
              value={unit}
              onChange={setUnit}
              options={[
                { value: "output", label: "Output" },
                { value: "input", label: "Input" },
              ]}
            />
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
            <div>
              <div className="ol-label">List price · per 1M</div>
              <div className="ol-num mt-2 text-[34px] leading-none text-white/45 line-through decoration-white/20">
                {usd(before)}
              </div>
            </div>
            <span aria-hidden className="pb-2 text-white/30">
              →
            </span>
            <div>
              <div className="ol-label">With Olora</div>
              <div className="ol-num mt-2 text-[34px] leading-none text-[var(--brand-ice)]">{snap.loaded ? usd(after) : "—"}</div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-[8px] bg-[var(--brand-ice)] px-4 py-2.5 font-mono text-[12px] tabular-nums text-[var(--brand)]">
            <span>
              You save <span className="font-medium">{snap.loaded ? usd(save) : "—"}</span>
            </span>
            <span>{snap.loaded ? `${savePct.toFixed(1)}% less` : ""}</span>
          </div>
          {snap.loaded && costPerMessage(model.inputPerM, model.outputPerM) != null ? (
            <p className="m-0 mt-3 font-mono text-[12px] tabular-nums text-white/70">
              {model.name.split(" ")[0]} · {usdSmall((costPerMessage(model.inputPerM, model.outputPerM) || 0) * cost)}
              <span className="ml-3 text-[var(--brand-ice)]">
                Saved {usdSmall((costPerMessage(model.inputPerM, model.outputPerM) || 0) * (1 - cost))}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
