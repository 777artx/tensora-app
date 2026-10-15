export type TensoraProject = {
  id: string;
  name: string;
  createdAt: string;
};

const PROJECTS_KEY = "gd-projects";
const ACTIVE_KEY = "gd-active-project";

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function seedDefault(): TensoraProject {
  return {
    id: "proj_default",
    name: "New project",
    createdAt: new Date().toISOString(),
  };
}

function migrateLegacyNames(projects: TensoraProject[]): TensoraProject[] {
  let changed = false;
  const next = projects.map((p) => {
    if (p.id === "proj_default" && p.name === "Research Agent") {
      changed = true;
      return { ...p, name: "New project" };
    }
    return p;
  });
  if (changed && canUseStorage()) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
  }
  return next;
}

export function listProjects(): TensoraProject[] {
  if (!canUseStorage()) return [seedDefault()];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) {
      return migrateLegacyNames(parsed as TensoraProject[]);
    }
  } catch {
    /* ignore */
  }
  const def = seedDefault();
  localStorage.setItem(PROJECTS_KEY, JSON.stringify([def]));
  localStorage.setItem(ACTIVE_KEY, def.id);
  return [def];
}

export function getActiveProject(): TensoraProject {
  const projects = listProjects();
  if (!canUseStorage()) return projects[0];
  const activeId = localStorage.getItem(ACTIVE_KEY);
  return projects.find((p) => p.id === activeId) || projects[0];
}

export function setActiveProject(id: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(ACTIVE_KEY, id);
  window.dispatchEvent(new CustomEvent("tensora-project-change"));
}

export function createProject(name: string): TensoraProject {
  const projects = listProjects();
  const project: TensoraProject = {
    id: `proj_${Date.now().toString(36)}`,
    name: name.trim() || "Untitled project",
    createdAt: new Date().toISOString(),
  };
  const next = [...projects, project];
  if (canUseStorage()) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    localStorage.setItem(ACTIVE_KEY, project.id);
    window.dispatchEvent(new CustomEvent("tensora-project-change"));
  }
  return project;
}

/** Append a real user action for Activity / Home LIVE feed. */
export function pushActivity(event: {
  kind: string;
  title: string;
  detail?: string;
  amount?: string;
  provider?: string;
  resource?: string;
  explorerUrl?: string;
  status?: string;
}) {
  if (!canUseStorage()) return;
  try {
    const raw = localStorage.getItem("gd-billing-history");
    const history = raw ? JSON.parse(raw) : [];
    const row = {
      id: `evt_${Date.now().toString(36)}`,
      date: new Date().toISOString(),
      kind: event.kind,
      description: event.title,
      title: event.title,
      detail: event.detail || "",
      amount: event.amount || "",
      provider: event.provider || "",
      resource: event.resource || event.title,
      explorerUrl: event.explorerUrl || "",
      status: event.status || "ok",
      projectId: getActiveProject().id,
    };
    const next = [row, ...(Array.isArray(history) ? history : [])].slice(0, 200);
    localStorage.setItem("gd-billing-history", JSON.stringify(next));
    window.dispatchEvent(new Event("tensora-credits-change"));
  } catch {
    /* ignore */
  }
}
