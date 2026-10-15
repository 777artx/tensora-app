"use client";

import { useEffect, useRef, useState } from "react";
import {
  createProject,
  getActiveProject,
  listProjects,
  setActiveProject,
  type TensoraProject,
} from "@/lib/lab/projects";

export function ProjectSelector() {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [projects, setProjects] = useState<TensoraProject[]>([]);
  const [active, setActive] = useState<TensoraProject | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function refresh() {
    setProjects(listProjects());
    setActive(getActiveProject());
  }

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("tensora-project-change", onChange);
    return () => window.removeEventListener("tensora-project-change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setDraftName("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  function startCreate() {
    setCreating(true);
    setDraftName("");
  }

  function submitCreate() {
    const name = draftName.trim() || "New project";
    createProject(name);
    refresh();
    setCreating(false);
    setDraftName("");
    setOpen(false);
  }

  if (!active) return null;

  return (
    <div className="relative px-3 pb-3 pt-2" ref={rootRef}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--panel-2)]"
        onClick={() => {
          setOpen((v) => !v);
          setCreating(false);
        }}
        aria-expanded={open}
      >
        <span className="truncate">{active.name}</span>
        <span className="text-[var(--muted-3)]">▾</span>
      </button>
      {open ? (
        <div className="absolute left-3 right-3 z-50 mt-1 overflow-hidden rounded-[var(--lab-radius)] border border-[var(--border)] bg-white shadow-lg">
          <ul className="m-0 max-h-48 list-none overflow-y-auto p-0">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--panel-2)] ${
                    p.id === active.id
                      ? "font-medium text-[var(--foreground)]"
                      : "text-[var(--muted)]"
                  }`}
                  onClick={() => {
                    setActiveProject(p.id);
                    refresh();
                    setOpen(false);
                    setCreating(false);
                  }}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
          {creating ? (
            <div className="border-t border-[var(--border)] p-2">
              <input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCreate();
                  }
                  if (e.key === "Escape") {
                    setCreating(false);
                    setDraftName("");
                  }
                }}
                placeholder="Project name"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--orange)]/50"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-md bg-[var(--foreground)] px-2 py-1.5 text-xs font-medium text-white"
                  onClick={submitCreate}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="rounded-md px-2 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                  onClick={() => {
                    setCreating(false);
                    setDraftName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="block w-full border-t border-[var(--border)] px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] hover:bg-[var(--panel-2)]"
              onClick={startCreate}
            >
              + New project
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
