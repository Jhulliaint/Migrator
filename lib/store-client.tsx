"use client";
// =============================================================================
//  Provider de données côté client.
//  Le serveur est la source de vérité : chaque mutation renvoie l'état complet,
//  que l'on remplace dans le state React. Simple et robuste à cette échelle.
// =============================================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type {
  Database,
  User,
  Task,
  Risk,
  DistributionList,
  Milestone,
  LicenseType,
  Settings,
} from "@/lib/types";

interface DataCtx {
  db: Database | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
  patchUser: (id: string, patch: Partial<User>) => Promise<void>;
  createUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  patchLicenseType: (code: string, patch: Partial<LicenseType>) => Promise<void>;
  patchSettings: (patch: Partial<Settings>) => Promise<void>;
  upsertTask: (t: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  upsertRisk: (r: Risk) => Promise<void>;
  deleteRisk: (id: string) => Promise<void>;
  upsertDL: (d: DistributionList) => Promise<void>;
  deleteDL: (id: string) => Promise<void>;
  patchMilestone: (id: string, patch: Partial<Milestone>) => Promise<void>;
  importUsers: (users: User[], mode: "merge" | "replace") => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

async function call(url: string, method: string, body?: unknown): Promise<Database> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error((msg as { error?: string }).error || `Erreur ${res.status}`);
  }
  return (await res.json()) as Database;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      setDb((await res.json()) as Database);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(
    async (p: Promise<Database>) => {
      try {
        setDb(await p);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
        await refresh();
      }
    },
    [refresh]
  );

  const value: DataCtx = {
    db,
    loading,
    error,
    refresh,
    reset: () => run(call("/api/reset", "POST")),
    patchUser: (id, patch) => run(call(`/api/users/${id}`, "PATCH", patch)),
    createUser: (u) => run(call("/api/users", "POST", u)),
    deleteUser: (id) => run(call(`/api/users/${id}`, "DELETE")),
    patchLicenseType: (code, patch) => run(call(`/api/license-types/${code}`, "PATCH", patch)),
    patchSettings: (patch) => run(call("/api/settings", "PATCH", patch)),
    upsertTask: (t) => run(call(`/api/tasks/${t.id}`, "PATCH", t)),
    deleteTask: (id) => run(call(`/api/tasks/${id}`, "DELETE")),
    upsertRisk: (r) => run(call(`/api/risks/${r.id}`, "PATCH", r)),
    deleteRisk: (id) => run(call(`/api/risks/${id}`, "DELETE")),
    upsertDL: (d) => run(call(`/api/distribution-lists/${d.id}`, "PATCH", d)),
    deleteDL: (id) => run(call(`/api/distribution-lists/${id}`, "DELETE")),
    patchMilestone: (id, patch) => run(call(`/api/milestones/${id}`, "PATCH", patch)),
    importUsers: (users, mode) => run(call("/api/import", "POST", { users, mode })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData doit être utilisé dans <DataProvider>");
  return ctx;
}
