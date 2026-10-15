import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { ENVIRONMENTS_CATALOG } from "./environments-catalog";

export type LabEnvironment = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  taskCount: number;
  rewardType: string;
  exampleTask: string;
  exampleAnswer: string;
  author: string;
  stars: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  updatedAt: string;
  tags: string[];
  usageCount: number;
  userCreated?: boolean;
};

export type LabModel = {
  id: string;
  displayName: string;
  provider: string;
  trainable: boolean;
  evaluationOnly: boolean;
  parameterSize: string;
};

export type EvalSample = {
  task: string;
  response: string;
  reward: number;
  durationMs: number;
};

export type EvaluationRun = {
  id: string;
  environmentId: string;
  environmentName: string;
  modelId: string;
  modelName: string;
  taskCount: number;
  completed: number;
  averageReward: number;
  successRate: number;
  samples: EvalSample[];
  createdAt: string;
};

export type TrainingMetric = {
  step: number;
  reward: number;
  loss: number;
  at: string;
};

export type Checkpoint = {
  id: string;
  step: number;
  reward: number;
  createdAt: string;
};

export type BeforeAfter = {
  before: { averageReward: number; successRate: number };
  after: { averageReward: number; successRate: number };
};

export type TrainingRun = {
  id: string;
  modelId: string;
  modelName: string;
  environmentId: string;
  environmentName: string;
  preset: "fast" | "standard" | "extended";
  maxBudget: number;
  status:
    | "queued"
    | "provisioning"
    | "preparing_environment"
    | "loading_model"
    | "running"
    | "checkpointing"
    | "completed"
    | "failed"
    | "cancelled";
  provider: "mock";
  totalSteps: number;
  initialReward: number;
  improvement: number | null;
  estimatedCost: number;
  metrics: TrainingMetric[];
  logs: string[];
  checkpoints: Checkpoint[];
  beforeAfter: BeforeAfter | null;
  createdAt: string;
  updatedAt: string;
};

type LabDb = {
  evaluations: EvaluationRun[];
  trainingRuns: TrainingRun[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "lab-store.json");

/** In-process store so training/eval state survives across API routes in the same Next server. */
type GlobalLab = { memory: LabDb; hydrated: boolean; writeChain: Promise<void> };
const g = globalThis as typeof globalThis & { __gradientLabStore?: GlobalLab };
if (!g.__gradientLabStore) {
  g.__gradientLabStore = {
    memory: { evaluations: [], trainingRuns: [] },
    hydrated: false,
    writeChain: Promise.resolve(),
  };
}
const store = g.__gradientLabStore;

export const ENVIRONMENTS: LabEnvironment[] = ENVIRONMENTS_CATALOG;

export const MODELS: LabModel[] = [
  {
    id: "qwen2.5-7b",
    displayName: "Qwen2.5 7B",
    provider: "tensora",
    trainable: true,
    evaluationOnly: false,
    parameterSize: "7B",
  },
  {
    id: "llama-3.1-8b",
    displayName: "Llama 3.1 8B",
    provider: "tensora",
    trainable: true,
    evaluationOnly: false,
    parameterSize: "8B",
  },
  {
    id: "gemma-2-9b",
    displayName: "Gemma 2 9B",
    provider: "tensora",
    trainable: true,
    evaluationOnly: false,
    parameterSize: "9B",
  },
  {
    id: "gpt-oss-20b",
    displayName: "GPT-OSS 20B",
    provider: "tensora",
    trainable: false,
    evaluationOnly: true,
    parameterSize: "20B",
  },
];

/** @deprecated Use getLeaderboard() from @/lib/lab/leaderboard (Artificial Analysis). */
export const LEADERBOARD = [] as {
  rank: number;
  model: string;
  organization: string;
  arenaScore: number;
  votes: number;
}[];

const PRESET_STEPS = { fast: 40, standard: 100, extended: 200 } as const;

async function ensureDb(): Promise<LabDb> {
  if (store.hydrated) return store.memory;
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as LabDb;
    store.memory.evaluations = parsed.evaluations || [];
    store.memory.trainingRuns = parsed.trainingRuns || [];
  } catch {
    /* start empty */
  }
  store.hydrated = true;
  return store.memory;
}

async function saveDb(db: LabDb) {
  store.memory.evaluations = db.evaluations;
  store.memory.trainingRuns = db.trainingRuns;
  store.writeChain = store.writeChain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(store.memory, null, 2));
  });
  await store.writeChain;
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function envById(id: string) {
  return ENVIRONMENTS.find((e) => e.id === id);
}

function resolveEnvironment(
  id: string,
  userEnvironment?: Partial<LabEnvironment> & { id: string; name: string }
): LabEnvironment | undefined {
  const known = envById(id);
  if (known) return known;
  if (!id.startsWith("user-env-") || !userEnvironment || userEnvironment.id !== id) {
    return undefined;
  }
  return {
    id: userEnvironment.id,
    slug: userEnvironment.slug || userEnvironment.id,
    name: userEnvironment.name,
    description: userEnvironment.description || "Custom environment",
    category: userEnvironment.category || "Math",
    taskCount: userEnvironment.taskCount || 50,
    rewardType: userEnvironment.rewardType || "Custom Reward",
    exampleTask: userEnvironment.exampleTask || `Sample task for ${userEnvironment.name}`,
    exampleAnswer: userEnvironment.exampleAnswer || "-",
    author: userEnvironment.author || "you",
    stars: userEnvironment.stars ?? 0,
    difficulty: userEnvironment.difficulty || "Intermediate",
    updatedAt: userEnvironment.updatedAt || new Date().toISOString().slice(0, 10),
    tags: userEnvironment.tags || ["custom"],
    usageCount: userEnvironment.usageCount ?? 0,
    userCreated: true,
  };
}

function modelById(id: string) {
  return MODELS.find((m) => m.id === id);
}

function makeTasks(env: LabEnvironment, n: number, seedBase: string) {
  const tasks: string[] = [];
  for (let i = 0; i < n; i++) {
    const u = unit(hashSeed(seedBase + ":" + i));
    if (env.category === "Math") {
      const a = 10 + Math.floor(u * 40);
      const b = 10 + Math.floor(unit(hashSeed(seedBase + ":b:" + i)) * 40);
      tasks.push(`Solve ${a} × ${b}`);
    } else {
      tasks.push(`${env.exampleTask} (#${i + 1})`);
    }
  }
  return tasks;
}

export async function runEvaluation(input: {
  environmentId: string;
  modelId: string;
  taskCount: number;
  userEnvironment?: Partial<LabEnvironment> & { id: string; name: string };
}): Promise<EvaluationRun> {
  const env = resolveEnvironment(input.environmentId, input.userEnvironment);
  const model = modelById(input.modelId);
  if (!env) throw new Error("Environment unavailable");
  if (!model) throw new Error("Model unavailable");

  const taskCount = Math.min(Math.max(input.taskCount || 10, 5), 100);
  const tasks = makeTasks(env, taskCount, `${env.id}:${model.id}`);
  const base = 0.28 + (hashSeed(model.id) % 40) / 100;
  const samples: EvalSample[] = tasks.map((task, i) => {
    const r = unit(hashSeed(`${task}:${model.id}:${i}`));
    const reward = r < base + 0.15 ? 1 : r < base + 0.35 ? 0.5 : 0;
    const response =
      env.category === "Math" && task.startsWith("Solve")
        ? String(
            Number(task.match(/(\d+)/)?.[1] || 0) *
              Number(task.match(/×\s*(\d+)/)?.[1] || 0) *
              (reward === 1 ? 1 : reward === 0.5 ? 1 : 0) || "incorrect"
          )
        : reward > 0
          ? env.exampleAnswer
          : "I am not sure.";
    return {
      task,
      response: String(response),
      reward,
      durationMs: 120 + Math.floor(unit(hashSeed("d" + i)) * 800),
    };
  });

  const averageReward =
    samples.reduce((s, x) => s + x.reward, 0) / Math.max(samples.length, 1);
  const successRate = samples.filter((s) => s.reward >= 1).length / samples.length;

  const run: EvaluationRun = {
    id: randomUUID(),
    environmentId: env.id,
    environmentName: env.name,
    modelId: model.id,
    modelName: model.displayName,
    taskCount,
    completed: samples.length,
    averageReward,
    successRate,
    samples,
    createdAt: new Date().toISOString(),
  };

  const db = await ensureDb();
  db.evaluations.unshift(run);
  db.evaluations = db.evaluations.slice(0, 100);
  await saveDb(db);
  return run;
}

const timers = ((globalThis as typeof globalThis & {
  __gradientLabTimers?: Map<string, ReturnType<typeof setInterval>>;
}).__gradientLabTimers ||= new Map<string, ReturnType<typeof setInterval>>());

export async function startTraining(input: {
  modelId: string;
  environmentId: string;
  preset: "fast" | "standard" | "extended";
  maxBudget: number;
  userEnvironment?: Partial<LabEnvironment> & { id: string; name: string };
}): Promise<TrainingRun> {
  const env = resolveEnvironment(input.environmentId, input.userEnvironment);
  const model = modelById(input.modelId);
  if (!env) throw new Error("Environment unavailable");
  if (!model) throw new Error("Model unavailable");
  if (!model.trainable) throw new Error("Model is evaluation-only");

  const preset = input.preset || "standard";
  const totalSteps = PRESET_STEPS[preset];
  const initialReward = 0.25 + (hashSeed(model.id + env.id) % 20) / 100;
  const now = new Date().toISOString();

  const run: TrainingRun = {
    id: randomUUID(),
    modelId: model.id,
    modelName: model.displayName,
    environmentId: env.id,
    environmentName: env.name,
    preset,
    maxBudget: input.maxBudget || 25,
    status: "queued",
    provider: "mock",
    totalSteps,
    initialReward,
    improvement: null,
    estimatedCost: 0,
    metrics: [],
    logs: [`[${now}] Queued training job (provider=mock)`],
    checkpoints: [],
    beforeAfter: null,
    createdAt: now,
    updatedAt: now,
  };

  const db = await ensureDb();
  db.trainingRuns.unshift(run);
  await saveDb(db);
  scheduleMockTraining(run.id);
  return run;
}

async function updateRun(id: string, mut: (run: TrainingRun) => void) {
  const db = await ensureDb();
  const run = db.trainingRuns.find((r) => r.id === id);
  if (!run) return null;
  if (run.status === "cancelled") return run;
  mut(run);
  run.updatedAt = new Date().toISOString();
  await saveDb(db);
  return run;
}

function scheduleMockTraining(runId: string) {
  if (timers.has(runId)) return;

  let tick = 0;
  const phases: TrainingRun["status"][] = [
    "provisioning",
    "preparing_environment",
    "loading_model",
    "running",
  ];

  const handle = setInterval(async () => {
    tick += 1;
    const current = await getTraining(runId);
    if (!current || current.status === "cancelled" || current.status === "completed") {
      clearInterval(handle);
      timers.delete(runId);
      return;
    }

    if (tick <= 3) {
      const status = phases[tick - 1];
      await updateRun(runId, (run) => {
        run.status = status;
        run.logs.push(`[${new Date().toISOString()}] ${status.split("_").join(" ")}`);
      });
      return;
    }

    await updateRun(runId, (run) => {
      if (run.status !== "running" && run.status !== "checkpointing") {
        run.status = "running";
      }
      const step = (run.metrics[run.metrics.length - 1]?.step || 0) + 1;
      const progress = step / run.totalSteps;
      const reward = Math.min(
        0.95,
        run.initialReward + progress * (0.45 + unit(hashSeed(run.id)) * 0.2) + (unit(hashSeed(run.id + step)) - 0.5) * 0.04
      );
      const loss = Math.max(0.05, 1.8 - progress * 1.4 + unit(hashSeed("loss" + step)) * 0.1);
      run.metrics.push({
        step,
        reward: Number(reward.toFixed(4)),
        loss: Number(loss.toFixed(4)),
        at: new Date().toISOString(),
      });
      run.estimatedCost = Number(
        Math.min(run.maxBudget, (step / run.totalSteps) * (run.preset === "fast" ? 4 : run.preset === "standard" ? 12 : 28)).toFixed(2)
      );
      run.improvement = (reward - run.initialReward) / Math.max(run.initialReward, 0.01);
      run.logs.push(
        `[step ${step}/${run.totalSteps}] reward=${reward.toFixed(3)} loss=${loss.toFixed(3)}`
      );

      if (step === Math.floor(run.totalSteps / 2) || step === run.totalSteps) {
        run.status = "checkpointing";
        const ck: Checkpoint = {
          id: `ckpt-${run.id.slice(0, 8)}-${step}`,
          step,
          reward: Number(reward.toFixed(4)),
          createdAt: new Date().toISOString(),
        };
        run.checkpoints.push(ck);
        run.logs.push(`[${ck.createdAt}] Checkpoint ${ck.id} saved`);
        run.status = "running";
      }

      if (step >= run.totalSteps) {
        const finalReward = run.metrics[run.metrics.length - 1]?.reward || run.initialReward;
        run.status = "completed";
        run.beforeAfter = {
          before: {
            averageReward: Number(run.initialReward.toFixed(4)),
            successRate: Number(Math.min(0.95, run.initialReward).toFixed(4)),
          },
          after: {
            averageReward: Number(finalReward.toFixed(4)),
            successRate: Number(Math.min(0.98, finalReward + 0.05).toFixed(4)),
          },
        };
        run.logs.push(`[${new Date().toISOString()}] Training completed`);
        run.logs.push(
          `[eval] before=${run.beforeAfter.before.averageReward} after=${run.beforeAfter.after.averageReward}`
        );
        clearInterval(handle);
        timers.delete(runId);
      }
    });
  }, 700);

  timers.set(runId, handle);
}

export async function getTraining(id: string) {
  const db = await ensureDb();
  return db.trainingRuns.find((r) => r.id === id) || null;
}

export async function listTraining() {
  const db = await ensureDb();
  return db.trainingRuns;
}

export async function cancelTraining(id: string) {
  const run = await updateRun(id, (r) => {
    if (r.status === "completed" || r.status === "failed") return;
    r.status = "cancelled";
    r.logs.push(`[${new Date().toISOString()}] Cancelled by user`);
  });
  const t = timers.get(id);
  if (t) {
    clearInterval(t);
    timers.delete(id);
  }
  return run;
}

export async function listEvaluations() {
  const db = await ensureDb();
  return db.evaluations;
}
