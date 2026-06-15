"use client";
import React, { useMemo, useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Badge, StatusBadge, Select, Button, TextInput, useSort, Th } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import type { Database, Task, TaskCategory, TaskOwner, TaskPriority, TaskStatus } from "@/lib/types";
import { dateFr } from "@/lib/format";
import { EntityLink } from "@/components/inspector/links";

const CATS: TaskCategory[] = ["utilisateur", "licence", "DNS", "MFA", "nettoyage", "boîte partagée", "liste distribution", "support", "communication"];
const OWNERS: TaskOwner[] = ["Julien", "BeCloud", "utilisateur", "direction", "autre"];
const PRIOS: TaskPriority[] = ["basse", "normale", "haute", "critique"];
const STATUSES: TaskStatus[] = ["à faire", "en cours", "bloqué", "terminé", "annulé"];

export default function TasksPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { upsertTask, deleteTask } = useData();
  const [fCat, setFCat] = useState("toutes");
  const [fStatus, setFStatus] = useState("tous");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const filtered = useMemo(
    () => db.tasks.filter((t) => (fCat === "toutes" || t.category === fCat) && (fStatus === "tous" || t.status === fStatus)),
    [db.tasks, fCat, fStatus]
  );
  const { sorted, toggle, key, dir } = useSort(filtered, "priority");
  const sort = { key, dir, toggle };

  const patch = (t: Task, p: Partial<Task>) => upsertTask({ ...t, ...p });
  const addTask = () => {
    if (!title.trim()) return;
    upsertTask({
      id: `t${Date.now()}`, title: title.trim(), description: "", category: "utilisateur",
      owner: "Julien", priority: "normale", status: "à faire", dueDate: null, doneDate: null,
      linkedEntity: null, comment: "", reference: "",
    });
    setTitle(""); setAdding(false);
  };

  const open = db.tasks.filter((t) => t.status !== "terminé" && t.status !== "annulé").length;
  const late = db.tasks.filter((t) => t.dueDate && t.status !== "terminé" && t.status !== "annulé" && new Date(t.dueDate) < new Date()).length;

  return (
    <>
      <PageTitle
        title="Tâches de migration"
        subtitle={`${open} ouverte(s) · ${late} en retard`}
        actions={<Button variant="primary" onClick={() => setAdding((s) => !s)}>+ Nouvelle tâche</Button>}
      />

      {adding && (
        <Card className="mb-3">
          <div className="flex items-center gap-2">
            <TextInput value={title} onChange={setTitle} placeholder="Titre de la tâche…" className="flex-1" />
            <Button variant="primary" onClick={addTask}>Ajouter</Button>
            <Button onClick={() => setAdding(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xms text-slate-500">Catégorie</label>
          <Select value={fCat} options={["toutes", ...CATS]} onChange={setFCat} />
          <label className="text-xms text-slate-500">Statut</label>
          <Select value={fStatus} options={["tous", ...STATUSES]} onChange={setFStatus} />
          <span className="ml-auto text-xms text-slate-500">{sorted.length} tâche(s)</span>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="grid-table">
          <thead>
            <tr>
              <Th label="Titre" sortKey="title" sort={sort} className="sticky-col" />
              <Th label="Catégorie" sortKey="category" sort={sort} />
              <Th label="Responsable" sortKey="owner" sort={sort} />
              <Th label="Priorité" sortKey="priority" sort={sort} />
              <Th label="Statut" sortKey="status" sort={sort} />
              <th>Échéance</th>
              <th>Entité liée</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const isLate = t.dueDate && t.status !== "terminé" && t.status !== "annulé" && new Date(t.dueDate) < new Date();
              return (
                <tr key={t.id}>
                  <td className="sticky-col font-medium text-navy-800">{t.title}</td>
                  <td><Select value={t.category} options={CATS} onChange={(v) => patch(t, { category: v })} /></td>
                  <td><Select value={t.owner} options={OWNERS} onChange={(v) => patch(t, { owner: v })} /></td>
                  <td><Select value={t.priority} options={PRIOS} onChange={(v) => patch(t, { priority: v })} /></td>
                  <td><Select value={t.status} options={STATUSES} onChange={(v) => patch(t, { status: v, doneDate: v === "terminé" ? new Date().toISOString() : null })} /></td>
                  <td className={isLate ? "font-semibold text-statusRed" : "text-slate-500"}>
                    <input type="date" value={t.dueDate ? t.dueDate.slice(0, 10) : ""} onChange={(e) => patch(t, { dueDate: e.target.value || null })} className="cell-input" />
                  </td>
                  <td className="text-slate-500"><EntityLink value={t.linkedEntity} /></td>
                  <td><Button variant="ghost" onClick={() => deleteTask(t.id)}>✕</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
