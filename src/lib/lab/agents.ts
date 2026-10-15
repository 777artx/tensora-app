import { randomBytes, randomUUID } from "crypto";
import {
  allowMissRefresh,
  getOrCreateAccount,
  hashApiKey,
  ledgerPushHistory,
  ledgerRead,
  ledgerRound2 as round2,
  ledgerSave,
  type AgentRecord,
  type AgentUsageEvent,
} from "@/lib/lab/account-store";

export const MAX_AGENTS_PER_OWNER = 25;

export type AgentPublic = Omit<AgentRecord, "keyHash"> & {
  spentTodayUsd: number;
  spentTotalUsd: number;
};

function spentSince(agent: AgentRecord, sinceMs: number) {
  return round2(
    agent.usage
      .filter((u) => u.kind !== "topup" && new Date(u.at).getTime() >= sinceMs)
      .reduce((s, u) => s + u.cost, 0)
  );
}

function startOfUtcDay() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function toPublic(agent: AgentRecord): AgentPublic {
  const { keyHash: _hash, ...rest } = agent;
  void _hash;
  return {
    ...rest,
    usage: agent.usage.slice(0, 200),
    spentTodayUsd: spentSince(agent, startOfUtcDay()),
    spentTotalUsd: spentSince(agent, 0),
  };
}

async function agentsDb() {
  const db = await ledgerRead();
  if (!db.agents) db.agents = {};
  if (!db.agentKeyIndex) db.agentKeyIndex = {};
  return db as typeof db & {
    agents: Record<string, AgentRecord>;
    agentKeyIndex: Record<string, string>;
  };
}

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 50);
}

function cleanCap(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return round2(Math.min(n, 10_000));
}

export async function listAgents(ownerUserId: string): Promise<AgentPublic[]> {
  const db = await agentsDb();
  return Object.values(db.agents)
    .filter((a) => a.ownerUserId === ownerUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toPublic);
}

export async function getOwnedAgent(ownerUserId: string, agentId: string) {
  const db = await agentsDb();
  const agent = db.agents[agentId];
  if (!agent || agent.ownerUserId !== ownerUserId) return null;
  return agent;
}

export async function createAgent(
  ownerUserId: string,
  input: {
    name?: string;
    dailyCapUsd?: number;
    perCallCapUsd?: number;
    allowedModels?: string[];
    allowedTools?: string[];
  }
) {
  const db = await agentsDb();
  const owned = Object.values(db.agents).filter((a) => a.ownerUserId === ownerUserId);
  if (owned.length >= MAX_AGENTS_PER_OWNER) {
    throw new Error(`Limit is ${MAX_AGENTS_PER_OWNER} agents per account.`);
  }
  await getOrCreateAccount(ownerUserId);
  const now = new Date().toISOString();
  const agent: AgentRecord = {
    id: `agt_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    ownerUserId,
    name: String(input.name || "").trim().slice(0, 60) || "Untitled agent",
    credits: 0,
    usdc: 0,
    dailyCapUsd: cleanCap(input.dailyCapUsd, 5),
    perCallCapUsd: cleanCap(input.perCallCapUsd, 0.5),
    allowedModels: cleanList(input.allowedModels),
    allowedTools: cleanList(input.allowedTools),
    paused: false,
    keyHash: null,
    keyPrefix: null,
    usage: [],
    createdAt: now,
    updatedAt: now,
  };
  db.agents[agent.id] = agent;
  const issued = issueKey(db, agent);
  await ledgerSave();
  return { agent: toPublic(agent), secret: issued };
}

function issueKey(
  db: { agentKeyIndex: Record<string, string> },
  agent: AgentRecord
) {
  if (agent.keyHash) delete db.agentKeyIndex[agent.keyHash];
  const secret = `tsa_${randomBytes(24).toString("hex")}`;
  const hash = hashApiKey(secret);
  agent.keyHash = hash;
  agent.keyPrefix = secret.slice(0, 10);
  agent.updatedAt = new Date().toISOString();
  db.agentKeyIndex[hash] = agent.id;
  return secret;
}

export async function rotateAgentKey(ownerUserId: string, agentId: string) {
  const db = await agentsDb();
  const agent = db.agents[agentId];
  if (!agent || agent.ownerUserId !== ownerUserId) throw new Error("Agent not found");
  const secret = issueKey(db, agent);
  await ledgerSave();
  return { agent: toPublic(agent), secret };
}

export async function updateAgent(
  ownerUserId: string,
  agentId: string,
  patch: {
    name?: string;
    dailyCapUsd?: number;
    perCallCapUsd?: number;
    topUpCapUsd?: number;
    allowedModels?: string[];
    allowedTools?: string[];
    paused?: boolean;
  }
) {
  const db = await agentsDb();
  const agent = db.agents[agentId];
  if (!agent || agent.ownerUserId !== ownerUserId) throw new Error("Agent not found");
  if (patch.name != null) agent.name = String(patch.name).trim().slice(0, 60) || agent.name;
  if (patch.dailyCapUsd != null) agent.dailyCapUsd = cleanCap(patch.dailyCapUsd, agent.dailyCapUsd);
  if (patch.perCallCapUsd != null) agent.perCallCapUsd = cleanCap(patch.perCallCapUsd, agent.perCallCapUsd);
  if (patch.topUpCapUsd != null) agent.topUpCapUsd = cleanCap(patch.topUpCapUsd, agent.topUpCapUsd ?? 0);
  if (patch.allowedModels != null) agent.allowedModels = cleanList(patch.allowedModels);
  if (patch.allowedTools != null) agent.allowedTools = cleanList(patch.allowedTools);
  if (typeof patch.paused === "boolean") agent.paused = patch.paused;
  agent.updatedAt = new Date().toISOString();
  await ledgerSave();
  return toPublic(agent);
}

/** Move credits between the owner account and an agent. Positive = fund, negative = drain. */
export async function transferAgentCredits(
  ownerUserId: string,
  agentId: string,
  amountUsd: number,
  opts: { label?: string } = {}
) {
  const amt = round2(Math.abs(Number(amountUsd) || 0));
  if (amt <= 0) throw new Error("Amount must be positive.");
  const db = await agentsDb();
  const agent = db.agents[agentId];
  if (!agent || agent.ownerUserId !== ownerUserId) throw new Error("Agent not found");
  const owner = await getOrCreateAccount(ownerUserId);
  const fund = Number(amountUsd) > 0;
  if (fund) {
    if (owner.credits < amt) throw new Error(`You have $${owner.credits.toFixed(2)} in credits.`);
    owner.credits = round2(owner.credits - amt);
    agent.credits = round2(agent.credits + amt);
  } else {
    if (agent.credits < amt) throw new Error(`Agent holds $${agent.credits.toFixed(2)}.`);
    agent.credits = round2(agent.credits - amt);
    owner.credits = round2(owner.credits + amt);
  }
  ledgerPushHistory(owner, {
    kind: "agent",
    description: `${fund ? "Funded" : "Drained"} agent ${agent.name}`,
    amount: `${fund ? "-" : "+"}$${amt.toFixed(2)}`,
    resource: agent.id,
  });
  pushAgentUsage(agent, {
    kind: "topup",
    resource: opts.label || (fund ? "owner fund" : "owner drain"),
    cost: fund ? amt : -amt,
  });
  agent.updatedAt = new Date().toISOString();
  owner.updatedAt = agent.updatedAt;
  await ledgerSave();
  return { agent: toPublic(agent), ownerCredits: owner.credits };
}

export async function deleteAgent(ownerUserId: string, agentId: string) {
  const db = await agentsDb();
  const agent = db.agents[agentId];
  if (!agent || agent.ownerUserId !== ownerUserId) throw new Error("Agent not found");
  const owner = await getOrCreateAccount(ownerUserId);
  const refund = round2(agent.credits);
  if (refund > 0) {
    owner.credits = round2(owner.credits + refund);
    ledgerPushHistory(owner, {
      kind: "agent",
      description: `Deleted agent ${agent.name} (balance returned)`,
      amount: `+$${refund.toFixed(2)}`,
      resource: agent.id,
    });
  }
  if (agent.usdc > 0) owner.usdc = round2(owner.usdc + agent.usdc);
  if (agent.keyHash) delete db.agentKeyIndex[agent.keyHash];
  delete db.agents[agentId];
  await ledgerSave();
  return { ownerCredits: owner.credits };
}

function pushAgentUsage(agent: AgentRecord, e: Omit<AgentUsageEvent, "id" | "at">) {
  agent.usage = [
    { id: `au_${randomUUID().slice(0, 8)}`, at: new Date().toISOString(), ...e },
    ...agent.usage,
  ].slice(0, 500);
}

export async function resolveAgentFromKey(secret: string): Promise<AgentRecord | null> {
  if (!secret.startsWith("tsa_")) return null;
  const hash = hashApiKey(secret);
  let db = await agentsDb();
  let id = db.agentKeyIndex[hash];
  if (!id && allowMissRefresh()) {
    await ledgerRead({ fresh: true });
    db = await agentsDb();
    id = db.agentKeyIndex[hash];
  }
  if (!id) return null;
  const agent = db.agents[id];
  if (!agent || agent.keyHash !== hash) return null;
  return agent;
}

export type AgentGate =
  | { ok: true }
  | { ok: false; status: number; error: string };

function matchesAllow(list: string[], value: string) {
  if (list.length === 0) return true;
  return list.some((p) => (p.endsWith("*") ? value.startsWith(p.slice(0, -1)) : p === value));
}

/** Check pause, allow lists, and caps before spending. `estimateUsd` is the most this call can cost. */
export function checkAgentSpend(
  agent: AgentRecord,
  opts: { kind: "inference" | "tool"; resource: string; estimateUsd: number }
): AgentGate {
  if (agent.paused) return { ok: false, status: 403, error: "This agent is paused by its owner." };
  const list = opts.kind === "inference" ? agent.allowedModels : agent.allowedTools;
  if (!matchesAllow(list, opts.resource)) {
    return { ok: false, status: 403, error: `This agent is not allowed to use ${opts.resource}.` };
  }
  const est = round2(opts.estimateUsd);
  if (agent.perCallCapUsd > 0 && est > agent.perCallCapUsd) {
    return { ok: false, status: 402, error: `Call exceeds the per-call cap of $${agent.perCallCapUsd.toFixed(2)}.` };
  }
  if (agent.dailyCapUsd > 0 && spentSince(agent, startOfUtcDay()) + est > agent.dailyCapUsd) {
    return { ok: false, status: 402, error: `Daily cap of $${agent.dailyCapUsd.toFixed(2)} reached.` };
  }
  if (agent.credits < Math.max(0.001, est)) {
    return {
      ok: false,
      status: 402,
      error: "Agent is out of credits. Refill with POST /api/v1/agents/topup or pay via /api/v1/topup/x402.",
    };
  }
  return { ok: true };
}

/** Debit an agent after a successful call. Never goes below zero. */
export async function debitAgent(
  agentId: string,
  opts: { kind: "inference" | "tool"; resource: string; cost: number }
) {
  const db = await agentsDb();
  const agent = db.agents[agentId];
  if (!agent) return { ok: false as const, credits: 0 };
  const cost = Math.max(0, Math.round(opts.cost * 1e6) / 1e6);
  const charged = Math.min(agent.credits, cost);
  // Keep micro-dollar precision so sub-cent calls add up correctly.
  agent.credits = Math.round((agent.credits - charged) * 1e6) / 1e6;
  pushAgentUsage(agent, { kind: opts.kind, resource: opts.resource, cost });
  agent.updatedAt = new Date().toISOString();
  await ledgerSave();
  return { ok: true as const, credits: agent.credits };
}

/** Credit an agent from a verified purchase (order book buy, x402 payment). */
export async function creditAgent(agentId: string, amountUsd: number, resource: string) {
  const db = await agentsDb();
  const agent = db.agents[agentId];
  if (!agent) throw new Error("Agent not found");
  const amt = round2(amountUsd);
  agent.credits = round2(agent.credits + amt);
  // For topups, cost is the signed amount moved in (+) or out (-).
  pushAgentUsage(agent, { kind: "topup", resource, cost: amt });
  agent.updatedAt = new Date().toISOString();
  await ledgerSave();
  return agent;
}

/** Owner-funded top-ups the agent already made today. */
export function ownerTopUpsToday(agent: AgentRecord) {
  const since = startOfUtcDay();
  return round2(
    agent.usage
      .filter((u) => u.kind === "topup" && u.resource.startsWith("order book") && new Date(u.at).getTime() >= since)
      .reduce((s, u) => s + Math.max(0, u.cost), 0)
  );
}

/** Mark an onchain payment as used so it cannot be claimed twice. Returns false if already used. */
export async function claimPaymentTx(key: string, ownerUserId: string, amountUsd: number) {
  const db = await ledgerRead({ fresh: true });
  if (!db.claimedTxs) db.claimedTxs = {};
  const k = key.toLowerCase();
  if (db.claimedTxs[k]) return false;
  db.claimedTxs[k] = { userId: ownerUserId, at: new Date().toISOString(), amountUsd: round2(amountUsd) };
  await ledgerSave();
  return true;
}
