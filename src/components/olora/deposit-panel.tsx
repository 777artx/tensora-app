"use client";

import { useState } from "react";
import { depositFunds, type DepositConfig, type DepositMethod } from "@/lib/lab/credits";
import { useLabAuth } from "@/lib/lab/auth";
import { pushActivity } from "@/lib/lab/projects";
import { Button, Notice, Segmented } from "@/components/olora/primitives";

type Rail = Extract<DepositMethod, "usdc" | "usdg" | "crypto">;

const RAILS: { value: Rail; label: string; hint: string }[] = [
  { value: "usdc", label: "USDC · Base", hint: "Send USDC on the Base network." },
  { value: "usdg", label: "USDG · Robinhood", hint: "Send USDG on Robinhood Chain." },
  { value: "crypto", label: "Not sure", hint: "We'll check both networks for your transfer." },
];

/** Add funds by stablecoin transfer. Same verified claim flow as before, presented as three steps. */
export function DepositPanel({
  config,
  initial,
  onClaimed,
}: {
  config: DepositConfig | null;
  initial?: DepositMethod | null;
  onClaimed: () => void;
}) {
  const { getAccessToken } = useLabAuth();
  const [rail, setRail] = useState<Rail>(initial === "usdg" || initial === "crypto" ? initial : "usdc");
  const [txHash, setTxHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const treasury = config?.treasury || null;

  async function copy() {
    if (!treasury) return;
    try {
      await navigator.clipboard.writeText(treasury);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setMsg({ text: "Couldn't copy. Select the address and copy it manually.", tone: "error" });
    }
  }

  async function claim() {
    const hash = txHash.trim();
    if (!hash) {
      setMsg({ text: "Paste the transaction ID from your wallet first.", tone: "error" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const data = await depositFunds(rail, hash, getAccessToken);
      const amt = data.verified?.amountUsd;
      const token = data.verified?.token || (rail === "usdg" ? "USDG" : "USDC");
      const chain = data.verified?.chain === "robinhood" ? "Robinhood Chain" : data.verified?.chain === "base" ? "Base" : rail === "usdg" ? "Robinhood Chain" : "Base";
      const explorer = data.verified?.explorerUrl || (chain === "Robinhood Chain" ? `https://robinhoodchain.blockscout.com/tx/${hash}` : `https://basescan.org/tx/${hash}`);
      pushActivity({
        kind: "deposit",
        title: `Added ${token}`,
        detail: chain,
        amount: amt != null ? `+$${amt.toFixed(2)}` : undefined,
        resource: `${token} · ${chain}`,
        provider: "Olora",
        explorerUrl: hash.startsWith("0x") ? explorer : undefined,
        status: "ok",
      });
      setMsg({ text: amt ? `$${amt.toFixed(2)} added to your balance.` : "Funds added to your balance.", tone: "success" });
      setTxHash("");
      onClaimed();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "We couldn't verify that transfer.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const hint = RAILS.find((r) => r.value === rail)?.hint;

  return (
    <div id="add-funds" className="scroll-mt-24 rounded-[var(--radius-lg)] bg-[var(--surface)] p-7 shadow-[var(--shadow-1)] ring-1 ring-[var(--hairline)] md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="m-0 text-[17px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Add funds</h3>
          <p className="m-0 mt-1 text-[14px] text-[var(--muted)]">Send a stablecoin and it lands in your balance dollar for dollar. Card payments are coming.</p>
        </div>
        <Segmented label="Network" value={rail} onChange={setRail} options={RAILS.map(({ value, label }) => ({ value, label }))} />
      </div>

      <ol className="m-0 mt-8 list-none space-y-7 p-0">
        <li className="flex gap-5">
          <span className="mt-0.5 text-[13px] tabular-nums text-[var(--silver)]">01</span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[15px] font-medium text-[var(--ink)]">Send to this address</p>
            <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">{hint}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[12px] bg-[var(--cloud)] px-4 py-3">
              <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-[var(--ink)]">{treasury || "Loading address…"}</code>
              <Button size="sm" variant="secondary" onClick={() => void copy()} disabled={!treasury}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </li>
        <li className="flex gap-5">
          <span className="mt-0.5 text-[13px] tabular-nums text-[var(--silver)]">02</span>
          <div className="min-w-0 flex-1">
            <label htmlFor="tx-hash" className="m-0 block text-[15px] font-medium text-[var(--ink)]">Paste the transaction ID</label>
            <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">Your wallet shows it once the transfer confirms. It starts with 0x.</p>
            <input
              id="tx-hash"
              type="text"
              placeholder="0x…"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="mt-3 block h-12 w-full rounded-[12px] bg-[var(--surface)] px-4 font-mono text-[13px] text-[var(--ink)] outline-none ring-1 ring-[var(--hairline)] focus:ring-[var(--ink)]"
            />
          </div>
        </li>
        <li className="flex gap-5">
          <span className="mt-0.5 text-[13px] tabular-nums text-[var(--silver)]">03</span>
          <div className="min-w-0 flex-1">
            <Button onClick={() => void claim()} disabled={busy || !treasury}>
              {busy ? "Verifying transfer…" : "Add to balance"}
            </Button>
          </div>
        </li>
      </ol>
      {msg ? <div className="mt-6"><Notice tone={msg.tone}>{msg.text}</Notice></div> : null}
    </div>
  );
}
