#!/usr/bin/env tsx
/**
 * Read-only: fetch the production ledger straight from KV and print the fields
 * that decide the volume ceiling. Reads only; never writes.
 */
import { readFileSync } from "fs";

const url = (process.env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
const token = (process.env.KV_REST_API_TOKEN || "").trim();
if (!url || !token) {
  console.error("KV env missing");
  process.exit(1);
}

async function cmd(args: string[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const j = await res.json();
  return j.result;
}

const raw = await cmd(["GET", "lab:accounts-db"]);
if (!raw) {
  console.error("lab:accounts-db not found in KV");
  process.exit(1);
}
const db = JSON.parse(raw);

const stats = db.networkStats || {};
console.log("=== KV ledger: lab:accounts-db ===");
console.log(`networkStats.volumeUsd : ${stats.volumeUsd}`);
console.log(`networkStats.feesUsd   : ${stats.feesUsd}`);
console.log(`houseBidPoolUsd        : ${db.houseBidPoolUsd ?? "n/a"}`);

let cash = 0;
let credits = 0;
let n = 0;
const accts = db.accounts || {};
for (const [key, a] of Object.entries<any>(accts)) {
  if (!key.startsWith("pulse-")) continue;
  cash += Number(a.usdc || 0) + Number(a.usdg || 0);
  credits += Number(a.credits || 0);
  n++;
}
const r2 = (x: number) => Math.round(x * 100) / 100;
console.log("");
console.log(`pulse accounts         : ${n}`);
console.log(`pulse ledger cash      : $${r2(cash)}`);
console.log(`pulse ledger credits   : $${r2(credits)}`);
console.log(`pulse TOTAL FLOAT      : $${r2(cash + credits)}`);

const tape = db.tape || [];
console.log("");
console.log(`tape rows in KV        : ${tape.length}`);
if (tape.length) {
  console.log(`newest tape timestamp  : ${tape[0]?.at ?? tape[tape.length - 1]?.at}`);
}
