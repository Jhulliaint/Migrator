"use client";
import React, { useMemo, useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, KpiCard, Badge, Select, useSort, Th, TextInput, Checkbox } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import { UserLink } from "@/components/inspector/links";
import type { Database, MailMigrationStatus } from "@/lib/types";
import { readinessKpis } from "@/lib/domain/timeline";
import { dateFr } from "@/lib/format";

const STEPS: MailMigrationStatus[] = ["non commencé", "copie lancée", "copié", "basculé", "reconnecté", "validé", "problème"];

export default function MigrationPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { patchUser } = useData();
  const k = readinessKpis(db.users, db.licenseTypes);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("tous");

  const filtered = useMemo(
    () => db.users.filter((u) =>
      (!q || `${u.firstName} ${u.lastName} ${u.googleEmail}`.toLowerCase().includes(q.toLowerCase())) &&
      (fStatus === "tous" || u.mailStatus === fStatus)
    ),
    [db.users, q, fStatus]
  );
  const { sorted, toggle, key, dir } = useSort(filtered, "lastName");
  const sort = { key, dir, toggle };

  const counts = STEPS.map((s) => ({ s, n: db.users.filter((u) => u.mailStatus === s).length }));

  return (
    <>
      <PageTitle title="Migration mail" subtitle="Avancement copie → bascule → reconnexion → validation" />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Utilisateurs prêts (validés)" value={k.usersReady} tone="green" />
        <KpiCard label="Boîtes à nettoyer" value={k.mailboxesToClean} tone={k.mailboxesToClean ? "orange" : "green"} />
        <KpiCard label="MFA non réalisées" value={k.mfaNotDone} tone={k.mfaNotDone ? "orange" : "green"} />
        <KpiCard label="Boîtes > 50 Go" value={k.over50} tone={k.over50 ? "orange" : "green"} />
        <KpiCard label="Boîtes > 100 Go" value={k.over100} tone={k.over100 ? "red" : "green"} />
        <KpiCard label="Licences à désattribuer" value={k.licensesToUnassign} tone="navy" />
      </div>

      <Card title="Répartition par statut de migration" className="mb-3">
        <div className="flex flex-wrap gap-2">
          {counts.map(({ s, n }) => (
            <button key={s} onClick={() => setFStatus(fStatus === s ? "tous" : s)}
              className={`rounded border px-3 py-1.5 text-xms ${fStatus === s ? "border-navy-600 bg-navy-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <span className="font-semibold text-navy-900">{n}</span> <span className="text-slate-500">{s}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <TextInput value={q} onChange={setQ} placeholder="🔍 Rechercher…" className="w-56" />
          <label className="text-xms text-slate-500">Statut</label>
          <Select value={fStatus} options={["tous", ...STEPS]} onChange={setFStatus} />
          <span className="ml-auto text-xms text-slate-500">{sorted.length} compte(s)</span>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="grid-table">
          <thead>
            <tr>
              <Th label="Prénom" sortKey="firstName" sort={sort} className="sticky-col" />
              <Th label="Nom" sortKey="lastName" sort={sort} />
              <th>Email</th>
              <Th label="Go" sortKey="mailboxSizeGB" sort={sort} className="text-right" />
              <th className="text-center">Nettoyé</th>
              <th>Statut migration</th>
              <th className="text-center">Reconnecté</th>
              <th className="text-center">Validé</th>
              <th>Communication</th>
              <th>Dern. cnx Google</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.id}>
                <td className="sticky-col font-medium text-navy-800"><UserLink id={u.id}>{u.firstName}</UserLink></td>
                <td>{u.lastName}</td>
                <td className="text-slate-500">{u.googleEmail}</td>
                <td className="text-right">{u.mailboxSizeGB}</td>
                <td className="text-center"><Checkbox checked={u.cleanupDone} onChange={(b) => patchUser(u.id, { cleanupDone: b })} /></td>
                <td><Select value={u.mailStatus} options={STEPS} onChange={(v) => patchUser(u.id, { mailStatus: v })} /></td>
                <td className="text-center">{u.mailStatus === "reconnecté" || u.mailStatus === "validé" ? <Badge tone="green">✓</Badge> : <Badge tone="gray">—</Badge>}</td>
                <td className="text-center">{u.mailStatus === "validé" ? <Badge tone="green">✓</Badge> : <Badge tone="gray">—</Badge>}</td>
                <td><Badge tone={u.commStatus === "confirmé" ? "green" : u.commStatus === "non démarré" ? "gray" : "blue"}>{u.commStatus}</Badge></td>
                <td className="text-slate-500">{dateFr(u.lastGoogleSignIn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
