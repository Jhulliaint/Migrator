"use client";
import React from "react";
import { useData } from "@/lib/store-client";
import type { Database } from "@/lib/types";

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="text-xms text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Rend le contenu uniquement lorsque la base est chargée. */
export function WithDb({ children }: { children: (db: Database) => React.ReactNode }) {
  const { db, loading, error } = useData();
  if (error && !db) return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">Erreur : {error}</div>;
  if (loading && !db) return <div className="p-8 text-center text-slate-400">Chargement des données…</div>;
  if (!db) return null;
  return <>{children(db)}</>;
}
