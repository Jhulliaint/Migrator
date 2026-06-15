"use client";
import React, { useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Badge, Select, Button, TextInput, Field } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import type { Database, DistributionList } from "@/lib/types";

export default function DLPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { upsertDL, deleteDL } = useData();
  const [editId, setEditId] = useState<string | null>(null);

  const blank = (): DistributionList => ({
    id: `dl${Date.now()}`, name: "", address: "", internalMembers: [], externalMembers: [],
    allowExternalSenders: false, usage: "", creationStatus: "à créer", remarks: "",
  });

  return (
    <>
      <PageTitle title="Listes de distribution" subtitle="Groupes d'envoi — membres internes/externes, expéditeurs externes, statut de création"
        actions={<Button variant="primary" onClick={() => { const dl = blank(); upsertDL(dl); setEditId(dl.id); }}>+ Nouvelle liste</Button>} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="grid-table">
          <thead>
            <tr><th className="sticky-col">Nom</th><th>Adresse</th><th>Membres internes</th><th>Membres externes</th><th className="text-center">Exp. externes</th><th>Usage</th><th>Statut</th><th></th></tr>
          </thead>
          <tbody>
            {db.distributionLists.map((dl) => (
              <tr key={dl.id}>
                <td className="sticky-col font-medium text-navy-800">{dl.name || <span className="text-slate-400">(sans nom)</span>}</td>
                <td className="text-slate-500">{dl.address}</td>
                <td>{dl.internalMembers.length}</td>
                <td>{dl.externalMembers.length || "—"}</td>
                <td className="text-center"><Badge tone={dl.allowExternalSenders ? "orange" : "gray"}>{dl.allowExternalSenders ? "Oui" : "Non"}</Badge></td>
                <td className="max-w-xs truncate text-slate-600" title={dl.usage}>{dl.usage}</td>
                <td><Badge tone={dl.creationStatus === "créée" ? "green" : dl.creationStatus === "en cours" ? "blue" : "orange"}>{dl.creationStatus}</Badge></td>
                <td className="whitespace-nowrap">
                  <Button variant="ghost" onClick={() => setEditId(dl.id)}>Éditer</Button>
                  <Button variant="ghost" onClick={() => deleteDL(dl.id)}>✕</Button>
                </td>
              </tr>
            ))}
            {db.distributionLists.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400">Aucune liste de distribution.</td></tr>}
          </tbody>
        </table>
      </div>

      {editId && <EditPanel dl={db.distributionLists.find((d) => d.id === editId)!} onSave={(d) => { upsertDL(d); setEditId(null); }} onClose={() => setEditId(null)} />}
    </>
  );
}

function EditPanel({ dl, onSave, onClose }: { dl: DistributionList; onSave: (d: DistributionList) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<DistributionList>(dl);
  const set = <K extends keyof DistributionList>(k: K, v: DistributionList[K]) => setDraft({ ...draft, [k]: v });
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold text-navy-800">Liste de distribution</h3>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nom"><TextInput value={draft.name} onChange={(v) => set("name", v)} className="w-full" /></Field>
          <Field label="Adresse"><TextInput value={draft.address} onChange={(v) => set("address", v)} className="w-full" /></Field>
        </div>
        <Field label="Membres internes (séparés par ;)"><TextInput value={draft.internalMembers.join("; ")} onChange={(v) => set("internalMembers", v.split(";").map((s) => s.trim()).filter(Boolean))} className="w-full" /></Field>
        <Field label="Membres externes (séparés par ;)"><TextInput value={draft.externalMembers.join("; ")} onChange={(v) => set("externalMembers", v.split(";").map((s) => s.trim()).filter(Boolean))} className="w-full" /></Field>
        <Field label="Usage métier"><TextInput value={draft.usage} onChange={(v) => set("usage", v)} className="w-full" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Expéditeurs externes autorisés"><Select value={draft.allowExternalSenders ? "Oui" : "Non"} options={["Oui", "Non"]} onChange={(v) => set("allowExternalSenders", v === "Oui")} className="w-full" /></Field>
          <Field label="Statut de création"><Select value={draft.creationStatus} options={["à créer", "en cours", "créée"] as const} onChange={(v) => set("creationStatus", v)} className="w-full" /></Field>
        </div>
        <Field label="Remarques"><TextInput value={draft.remarks} onChange={(v) => set("remarks", v)} className="w-full" /></Field>
        <div className="mt-3 flex justify-end gap-2">
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => onSave(draft)}>Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}
