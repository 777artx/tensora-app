"use client";

import { useMemo, useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { Keys } from "@/components/olora/primitives";
import { TaskResults, rank } from "@/components/olora/task-results";
import { curatedModels } from "@/lib/olora/models";
import { useMarketQuote } from "@/lib/olora/hooks";
import { pct, usdSmall } from "@/lib/olora/pricing";
import { EXAMPLES, KIND_LABEL, estimateTask, type Depth } from "@/lib/olora/task-estimate";

/**
 * Compare = "what will this task cost?"
 * Left: describe the task (the focal input). Right: every frontier model, ranked by
 * what that exact task costs on Olora. Fits one screen on desktop.
 */
export default function ComparePage() {
  const quote = useMarketQuote();
  const [task, setTask] = useState("");
  const [material, setMaterial] = useState("");
  const [showMaterial, setShowMaterial] = useState(false);
  const [depth, setDepth] = useState<Depth>("standard");

  const sample = task.trim() || EXAMPLES[0];
  const est = useMemo(() => estimateTask(sample, material, depth), [sample, material, depth]);
  const rows = useMemo(() => rank(curatedModels(), est, quote.creditCost), [est, quote.creditCost]);
  const hasDiscount = quote.loaded && quote.discount > 0;
  const cheapest = rows[0];
  const priciest = rows[rows.length - 1];

  return (
    <LabChrome active="compare" title="Compare" fit>
      <div className="mx-auto grid min-h-0 w-full max-w-[1280px] flex-1 grid-cols-1 gap-10 overflow-y-auto px-5 py-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16 md:overflow-hidden md:px-8 md:py-12">
        {/* Task */}
        <section className="flex min-h-0 flex-col">
          <h1 className="ol-rise m-0 text-[36px] font-medium leading-[1.02] tracking-[-0.025em] text-[var(--ink)] md:text-[44px]">
            What will it <span className="text-[var(--silver)]">cost?</span>
          </h1>
          <p className="ol-rise ol-rise-1 m-0 mt-3 max-w-[400px] text-[16px] leading-relaxed text-[var(--muted)]">
            Describe a task. See what it costs on every model, paid with credits at today&rsquo;s market price.
          </p>

          <div className="ol-rise ol-rise-2 ol-panel ol-composer mt-8 p-1.5 transition-shadow">
            <label htmlFor="task" className="sr-only">Your task</label>
            <textarea
              id="task"
              rows={3}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={EXAMPLES[0]}
              className="block w-full resize-none bg-transparent px-3.5 pt-3 text-[17px] leading-snug text-[var(--ink)] outline-none placeholder:text-[var(--silver)]"
            />
            {showMaterial ? (
              <textarea
                aria-label="Material to include"
                rows={3}
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Paste the document, code or text the model should read"
                className="mx-1.5 mb-1.5 block w-[calc(100%-12px)] resize-none rounded-[10px] bg-black/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] px-3 py-2.5 text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--silver)]"
              />
            ) : null}
            <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
              <button type="button" onClick={() => setShowMaterial((v) => !v)} className="h-8 rounded-full px-2.5 text-[13px] text-[var(--gray)] hover:bg-[var(--cloud)] hover:text-[var(--ink)]">
                {showMaterial ? "Remove material" : "+ Add material"}
              </button>
              <Keys
                label="Answer length"
                value={depth}
                onChange={setDepth}
                options={[
                  { value: "brief", label: "Brief" },
                  { value: "standard", label: "Standard" },
                  { value: "thorough", label: "Thorough" },
                ]}
              />
            </div>
          </div>

          {!task ? (
            <div className="ol-rise ol-rise-3 mt-4 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setTask(ex)} className="h-8 rounded-[8px] px-3 text-[13px] text-[var(--gray)] ring-1 ring-[var(--hairline)] transition-colors hover:text-[var(--ink)] hover:ring-[var(--ink)]">
                  {ex}
                </button>
              ))}
            </div>
          ) : null}

          <dl className="mt-auto hidden grid-cols-3 gap-6 border-t border-[var(--hairline)] pt-6 md:grid">
            <div>
              <dt className="ol-label">Task type</dt>
              <dd className="m-0 mt-1 text-[15px] text-[var(--ink)]">{KIND_LABEL[est.kind]}</dd>
            </div>
            <div>
              <dt className="ol-label">Reading</dt>
              <dd className="m-0 mt-1.5 ol-num text-[15px] text-[var(--ink)]">{est.inputTokens.toLocaleString()} tokens</dd>
            </div>
            <div>
              <dt className="ol-label">Writing</dt>
              <dd className="m-0 mt-1.5 ol-num text-[15px] text-[var(--ink)]">~{est.outputTokens.toLocaleString()} tokens</dd>
            </div>
          </dl>
        </section>

        {/* Prices */}
        <section aria-live="polite" className="ol-panel flex min-h-0 flex-col">
          <div className="flex items-end justify-between gap-4 px-5 pb-4 pt-5">
            <div>
              <p className="m-0 ol-label">{task.trim() ? "This task costs" : "For example, this task costs"}</p>
              <p className="m-0 mt-2.5 ol-num text-[28px] leading-none text-[var(--ink)]">
                {usdSmall(cheapest?.ol)} <span className="text-[var(--silver)]">to</span> {usdSmall(priciest?.ol)}
              </p>
            </div>
            <p className="m-0 max-w-[220px] text-right text-[12px] leading-snug text-[var(--silver)]">
              {hasDiscount ? `Olora price, with ${pct(quote.discount, 1)} off from Market credits. List price struck through.` : "At each provider's list price."}
            </p>
          </div>
          <div className="min-h-0 flex-1 md:overflow-y-auto">
            <TaskResults rows={rows} hasDiscount={hasDiscount} task={task} />
          </div>
          <p className="m-0 border-t border-white/[0.06] px-5 py-3 text-[12px] leading-relaxed text-[var(--silver)]">
            Estimate based on the length of your task and a typical answer{est.fromRequest ? ", using the length you asked for" : ""}. You pay for actual usage.
          </p>
        </section>
      </div>
    </LabChrome>
  );
}
