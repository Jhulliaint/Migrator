"use client";
import React, { useMemo, useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, KpiCard, Badge, StatusBadge, Select, Button, TextInput, useSort, Th } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import type { Database, Risk, RiskCategory, RiskSeverity, RiskStatus } from "@/lib/types";
import { computeAutoRisks } from "@/lib/domain/risks";
import { dateFr } from "@/lib/format";
import { EntityLink } from "@/components/inspector/links";

const CATS: RiskCategory[] = ["stockage", "licence", "MFA", "DNS", "utilisateur VIP", "boîte technique", "scan-to-mail", "communication", "support", "migration documentaire", "sécurité"];
const SEVS: RiskSeverity[] = ["faible", "moyen", "élevé", "critique"];
const STATUSES: RiskStatus[] = ["ouvert", "en cours", "maîtrisé", "clos"];
const SEV_WEIGHT: Record<RiskSeverity, number> = { faible: 1, moyen: 2, élevé: 3, critique: 4 };

export default function RisksPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { upsertRisk, deleteRisk } = useData();
  const auto = useMemo(() => computeAutoRisks(db.users, db.licenseTypes, db.milestones), [db]);
  const all = useMemo(() => [...auto, ...db.risks].sort((a, b) => b.score - a.score), [auto, db.risks]);

  const [fCat, setFCat] = useState("toutes");
  const [fSev, setFSev] = useState("toutes");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const filtered = useMemo(
    () => all.filter((r) => (fCat === "toutes" || r.category === fCat) && (fSev === "toutes" || r.severity === fSev)),
    [all, fCat, fSev]
  );
  const { sorted, toggle, key, dir } = useSort(filtered, "score");
  const sort = { key, dir, toggle };

  const crit = all.filter((r) => r.severity === "critique" && r.status !== "clos").length;
  const high = all.filter((r) => r.severity === "élevé" && r.status !== "clos").length;

  const addRisk = () => {
    if (!title.trim()) return;
    upsertRisk({
      id: `r${Date.now()}`, title: title.trim(), category: "stockage", severity: "moyen",
      probability: 3, score: SEV_WEIGHT["moyen"] * 3, status: "ouvert", owner: "Julien",
      corrective: "", dueDate: null, linkedEntity: null, auto: false,
    });
    setTitle(""); setAdding(false);
  };
  const patch = (r: Risk, p: Partial<Risk>) => {
    const merged = { ...r, ...p };
    merged.score = SEV_WEIGHT[merged.severity] * merged.probability;
    upsertRisk(merged);
  };

  return (
    <>
      <PageTitle
        title="Registre des risques"
        subtitle="Règles automatiques + risques saisis manuellement"
        actions={<Button variant="primary" onClick={() => setAdding((s) => !s)}>+ Risque manuel</Button>}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Risques (total)" value={all.length} tone="navy" />
        <KpiCard label="Critiques ouverts" value={crit} tone={crit ? "red" : "green"} />
        <KpiCard label="Élevés ouverts" value={high} tone={high ? "orange" : "green"} />
        <KpiCard label="Auto-générés" value={auto.length} tone="blue" />
      </div>

      {adding && (
        <Card className="mb-3">
          <div className="flex items-center gap-2">
            <TextInput value={title} onChange={setTitle} placeholder="Intitulé du risque…" className="flex-1" />
            <Button variant="primary" onClick={addRisk}>Ajouter</Button>
            <Button onClick={() => setAdding(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xms text-slate-500">Catégorie</label>
          <Select value={fCat} options={["toutes", ...CATS]} onChange={setFCat} />
          <label className="text-xms text-slate-500">Gravité</label>
          <Select value={fSev} options={["toutes", ...SEVS]} onChange={setFSev} />
          <span className="ml-auto text-xms text-slate-500">{sorted.length} risque(s)</span>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="grid-table">
          <thead>
            <tr>
              <Th label="Titre" sortKey="title" sort={sort} className="sticky-col" />
              <Th label="Catégorie" sortKey="category" sort={sort} />
              <Th label="Gravité" sortKey="severity" sort={sort} />
              <Th label="Prob." sortKey="probability" sort={sort} className="text-center" />
              <Th label="Score" sortKey="score" sort={sort} className="text-center" />
              <Th label="Statut" sortKey="status" sort={sort} />
              <th>Responsable</th>
              <th>Action corrective</th>
              <th>Entité</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td className="sticky-col font-medium text-navy-800">
                  {r.auto && <Badge tone="blue" title="Généré automatiquement">auto</Badge>} {r.title}
                </td>
                <td><StatusBadge value={r.category} /></td>
                <td>{r.auto ? <Badge tone={r.severity === "critique" ? "red" : r.severity === "élevé" ? "orange" : "blue"}>{r.severity}</Badge> : <Select value={r.severity} options={SEVS} onChange={(v) => patch(r, { severity: v })} />}</td>
                <td className="text-center">{r.auto ? r.probability : <input type="number" min={1} max={5} value={r.probability} onChange={(e) => patch(r, { probability: Number(e.target.value) || 1 })} className="cell-input w-12 text-center" />}</td>
                <td className="text-center"><Badge tone={r.score >= 16 ? "red" : r.score >= 9 ? "orange" : "gray"}>{r.score}</Badge></td>
                <td>{r.auto ? <StatusBadge value={r.status} /> : <Select value={r.status} options={STATUSES} onChange={(v) => patch(r, { status: v })} />}</td>
                <td className="text-slate-600">{r.owner}</td>
                <td className="max-w-xs truncate text-slate-600" title={r.corrective}>{r.corrective}</td>
                <td className="text-slate-500"><EntityLink value={r.linkedEntity} /></td>
                <td>{!r.auto && <Button variant="ghost" onClick={() => deleteRisk(r.id)}>✕</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
