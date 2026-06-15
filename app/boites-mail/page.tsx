"use client";
import React, { useMemo, useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Badge, Select, useSort, Th, TextInput, Checkbox } from "@/components/ui/primitives";
import { LicenseLink } from "@/components/inspector/links";
import { useData } from "@/lib/store-client";
import { useInspector } from "@/lib/inspector";
import type { Database, User } from "@/lib/types";
import { storageStatus, applicableThreshold } from "@/lib/domain/storage";

function recommendedAction(u: User): { tone: "red" | "orange" | "blue" | "green" | "gray"; text: string } {
  if (u.mailboxSizeGB > 100) return { tone: "red", text: "Critique : nettoyer/archiver ou Exchange Plan 2 (100 Go)" };
  if (u.mailboxSizeGB > 50) return { tone: "orange", text: "Nettoyer < 45 Go ou licence à capacité supérieure" };
  if (u.mailbox.scanToMail) return { tone: "blue", text: "Conserver licence Exchange (scan-to-mail)" };
  if (u.mailbox.autoSend) return { tone: "blue", text: "Conserver licence (envoi automatique)" };
  if (!u.physicalUser && u.licenseProfile !== "SHARED") return { tone: "blue", text: "Étudier passage en boîte partagée" };
  if (u.mailbox.typeTarget === "à archiver") return { tone: "gray", text: "Archiver (PST) puis désattribuer" };
  return { tone: "green", text: "RAS" };
}

export default function MailboxesPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { patchUser } = useData();
  const { inspectUser } = useInspector();
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("tous");

  const filtered = useMemo(
    () => db.users.filter((u) =>
      (!q || `${u.firstName} ${u.lastName} ${u.googleEmail}`.toLowerCase().includes(q.toLowerCase())) &&
      (fType === "tous" || u.mailbox.typeTarget === fType)
    ),
    [db.users, q, fType]
  );
  const { sorted, toggle, key, dir } = useSort(filtered, "mailboxSizeGB");
  const sort = { key, dir, toggle };

  return (
    <>
      <PageTitle title="Boîtes mail" subtitle="Type, taille, seuil, licence et action recommandée par boîte" />
      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <TextInput value={q} onChange={setQ} placeholder="🔍 Rechercher…" className="w-56" />
          <label className="text-xms text-slate-500">Type cible</label>
          <Select value={fType} options={["tous", "utilisateur Microsoft", "boîte partagée", "liste de distribution", "boîte ressource", "à supprimer", "à archiver"]} onChange={setFType} />
          <span className="ml-auto text-xms text-slate-500">{sorted.length} boîte(s)</span>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="grid-table">
          <thead>
            <tr>
              <Th label="Email" sortKey="googleEmail" sort={sort} className="sticky-col" />
              <Th label="Nom affiché" sortKey="lastName" sort={sort} />
              <th>Type actuel</th>
              <th>Type cible</th>
              <Th label="Go" sortKey="mailboxSizeGB" sort={sort} className="text-right" />
              <th className="text-right">Cible Go</th>
              <th>Seuil</th>
              <th>Stockage</th>
              <th>Licence cible</th>
              <th className="text-center">Auto</th>
              <th className="text-center">Scan</th>
              <th className="text-center">MFA</th>
              <th>Action recommandée</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const ss = storageStatus(u.mailboxSizeGB);
              const action = recommendedAction(u);
              return (
                <tr key={u.id}>
                  <td className="sticky-col cursor-pointer font-medium text-navy-800" onClick={() => inspectUser(u.id)}>{u.googleEmail}</td>
                  <td>{u.firstName} {u.lastName}</td>
                  <td>{u.mailbox.typeCurrent}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Select value={u.mailbox.typeTarget} options={["utilisateur Microsoft", "boîte partagée", "liste de distribution", "boîte ressource", "à supprimer", "à archiver"] as const} onChange={(v) => patchUser(u.id, { mailbox: { ...u.mailbox, typeTarget: v } })} />
                  </td>
                  <td className="text-right">{u.mailboxSizeGB}</td>
                  <td className="text-right text-slate-500">{u.targetSizeGB ?? "—"}</td>
                  <td>{applicableThreshold(u.mailboxSizeGB)}</td>
                  <td><Badge tone={ss === "critique" ? "red" : ss === "élevé" ? "orange" : ss === "à surveiller" ? "orange" : "green"}>{ss}</Badge></td>
                  <td><LicenseLink code={u.licenseProfile} /></td>
                  <td className="text-center"><Checkbox checked={u.mailbox.autoSend} onChange={(b) => patchUser(u.id, { mailbox: { ...u.mailbox, autoSend: b } })} /></td>
                  <td className="text-center"><Checkbox checked={u.mailbox.scanToMail} onChange={(b) => patchUser(u.id, { mailbox: { ...u.mailbox, scanToMail: b } })} /></td>
                  <td className="text-center">{u.mailbox.mfaException ? <Badge tone="gray">N/A</Badge> : <Badge tone={u.mfa.configured ? "green" : "orange"}>{u.mfa.configured ? "✓" : "…"}</Badge>}</td>
                  <td><Badge tone={action.tone}>{action.text}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
