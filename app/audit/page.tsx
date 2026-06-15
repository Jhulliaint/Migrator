"use client";
import React, { useMemo, useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Badge, TextInput } from "@/components/ui/primitives";
import type { Database } from "@/lib/types";

export default function AuditPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => db.auditLog.filter((a) => !q || `${a.entity} ${a.action} ${a.field} ${a.author}`.toLowerCase().includes(q.toLowerCase())),
    [db.auditLog, q]
  );
  return (
    <>
      <PageTitle title="Journal d'audit" subtitle="Traçabilité des créations, modifications de licence, statuts, imports…" />
      <Card className="mb-3">
        <TextInput value={q} onChange={setQ} placeholder="🔍 Rechercher (entité, action, auteur)…" className="w-72" />
        <span className="ml-3 text-xms text-slate-500">{rows.length} entrée(s)</span>
      </Card>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="grid-table">
          <thead>
            <tr><th>Date</th><th>Auteur</th><th>Action</th><th>Entité</th><th>Champ</th><th>Ancienne valeur</th><th>Nouvelle valeur</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap text-slate-500">{new Date(a.date).toLocaleString("fr-FR")}</td>
                <td><Badge tone="navy">{a.author}</Badge></td>
                <td><Badge tone={a.action === "suppression" ? "red" : a.action === "création" ? "green" : a.action === "import" ? "blue" : "gray"}>{a.action}</Badge></td>
                <td className="font-medium text-navy-800">{a.entity}</td>
                <td>{a.field}</td>
                <td className="max-w-[16rem] truncate text-slate-500" title={a.oldValue}>{a.oldValue || "—"}</td>
                <td className="max-w-[16rem] truncate text-slate-700" title={a.newValue}>{a.newValue || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400">Aucune entrée.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
