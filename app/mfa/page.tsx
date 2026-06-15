"use client";
import React, { useMemo, useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, KpiCard, Badge, Select, Checkbox, useSort, Th, TextInput } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import { UserLink } from "@/components/inspector/links";
import type { Database, MfaStatus } from "@/lib/types";

const MFA_STATUSES: MfaStatus[] = ["non démarrée", "à faire", "configurée Authenticator", "configurée SMS", "bloquée"];

export default function MfaPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { patchUser } = useData();
  const physical = db.users.filter((u) => u.physicalUser && !u.mailbox.mfaException);
  const [q, setQ] = useState("");
  const [onlyBlocked, setOnlyBlocked] = useState(false);

  const filtered = useMemo(
    () => physical.filter((u) =>
      (!q || `${u.firstName} ${u.lastName} ${u.googleEmail}`.toLowerCase().includes(q.toLowerCase())) &&
      (!onlyBlocked || u.mfa.blocked)
    ),
    [physical, q, onlyBlocked]
  );
  const { sorted, toggle, key, dir } = useSort(filtered, "lastName");
  const sort = { key, dir, toggle };

  const configured = physical.filter((u) => u.mfa.configured).length;
  const blocked = physical.filter((u) => u.mfa.blocked).length;
  const todo = physical.filter((u) => !u.mfa.configured && !u.mfa.blocked).length;

  return (
    <>
      <PageTitle title="Suivi MFA" subtitle="Authentification à plusieurs facteurs des utilisateurs physiques" />

      <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xms text-blue-900">
        🔐 La MFA ajoute une couche de sécurité : en plus du mot de passe, une seconde preuve d'identité est demandée
        (application <strong>Microsoft Authenticator</strong> ou code <strong>SMS</strong>). Elle doit être configurée
        <strong> avant la reconnexion</strong> de l'utilisateur.
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Concernés (physiques)" value={physical.length} tone="navy" />
        <KpiCard label="MFA configurées" value={configured} tone="green" />
        <KpiCard label="À faire" value={todo} tone={todo ? "orange" : "green"} />
        <KpiCard label="Bloqués" value={blocked} tone={blocked ? "red" : "green"} />
      </div>

      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <TextInput value={q} onChange={setQ} placeholder="🔍 Rechercher…" className="w-56" />
          <label className="flex items-center gap-1 text-xms text-slate-600"><Checkbox checked={onlyBlocked} onChange={setOnlyBlocked} /> Bloqués uniquement</label>
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
              <th>Statut MFA</th>
              <th>Méthode</th>
              <th className="text-center">Configurée</th>
              <th className="text-center">Bloqué</th>
              <th className="text-center">Assistance</th>
              <th className="text-center">Instruction envoyée</th>
              <th className="text-center">1ère connexion</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.id}>
                <td className="sticky-col font-medium text-navy-800"><UserLink id={u.id}>{u.firstName}</UserLink></td>
                <td>{u.lastName}</td>
                <td className="text-slate-500">{u.googleEmail}</td>
                <td>
                  <Select value={u.mfa.status} options={MFA_STATUSES} onChange={(v) => patchUser(u.id, { mfa: { ...u.mfa, status: v, configured: v.startsWith("configurée"), blocked: v === "bloquée", method: v === "configurée SMS" ? "SMS" : v === "configurée Authenticator" ? "Authenticator" : u.mfa.method } })} />
                </td>
                <td><Badge tone={u.mfa.method === "non défini" ? "gray" : "blue"}>{u.mfa.method}</Badge></td>
                <td className="text-center">{u.mfa.configured ? <Badge tone="green">✓</Badge> : <Badge tone="gray">—</Badge>}</td>
                <td className="text-center"><Checkbox checked={u.mfa.blocked} onChange={(b) => patchUser(u.id, { mfa: { ...u.mfa, blocked: b, status: b ? "bloquée" : u.mfa.status } })} /></td>
                <td className="text-center"><Checkbox checked={u.mfa.needsAssistance} onChange={(b) => patchUser(u.id, { mfa: { ...u.mfa, needsAssistance: b } })} /></td>
                <td className="text-center"><Checkbox checked={u.mfa.instructionSent} onChange={(b) => patchUser(u.id, { mfa: { ...u.mfa, instructionSent: b } })} /></td>
                <td className="text-center"><Checkbox checked={u.mfa.firstSignInDone} onChange={(b) => patchUser(u.id, { mfa: { ...u.mfa, firstSignInDone: b } })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
