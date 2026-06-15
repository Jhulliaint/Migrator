"use client";
import React from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, KpiCard, Badge, Select } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import type { Database, Milestone } from "@/lib/types";
import { readinessKpis } from "@/lib/domain/timeline";
import { computeAutoRisks } from "@/lib/domain/risks";
import { dateFr } from "@/lib/format";

const STATUS_TONE: Record<Milestone["status"], "green" | "blue" | "orange" | "gray"> = {
  fait: "green", "en cours": "blue", "à risque": "orange", "à venir": "gray",
};

export default function CalendarPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { patchMilestone } = useData();
  const k = readinessKpis(db.users, db.licenseTypes);
  const autoRisks = computeAutoRisks(db.users, db.licenseTypes, db.milestones);
  const blockingCount = autoRisks.filter((r) => r.severity === "critique" || r.severity === "élevé").length;
  const sorted = [...db.milestones].sort((a, b) => a.step - b.step);

  return (
    <>
      <PageTitle title="Calendrier de migration" subtitle="Jalons projet, dépendances et indicateurs de préparation" />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Utilisateurs prêts" value={k.usersReady} tone="green" />
        <KpiCard label="Boîtes à nettoyer" value={k.mailboxesToClean} tone={k.mailboxesToClean ? "orange" : "green"} />
        <KpiCard label="MFA non réalisées" value={k.mfaNotDone} tone={k.mfaNotDone ? "orange" : "green"} />
        <KpiCard label="Boîtes > 50 Go" value={k.over50} tone={k.over50 ? "orange" : "green"} />
        <KpiCard label="Licences à désattribuer" value={k.licensesToUnassign} tone="navy" />
        <KpiCard label="Risques bloquants" value={blockingCount} tone={blockingCount ? "red" : "green"} />
      </div>

      <Card title="Jalons">
        <ol className="relative ml-3 border-l-2 border-slate-200">
          {sorted.map((m) => (
            <li key={m.id} className="mb-5 ml-5">
              <span className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-white ${
                m.status === "fait" ? "bg-statusGreen" : m.status === "en cours" ? "bg-blue-500" : m.status === "à risque" ? "bg-statusOrange" : "bg-slate-300"
              }`} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-navy-900">{m.title}</span>
                <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
                <span className="text-xms text-slate-500">{dateFr(m.date)} · {m.startTime}–{m.endTime}</span>
                <div className="ml-auto">
                  <Select value={m.status} options={["à venir", "en cours", "fait", "à risque"] as const} onChange={(v) => patchMilestone(m.id, { status: v })} />
                </div>
              </div>
              {m.dependencies.length > 0 && (
                <div className="mt-1 text-[0.7rem] text-slate-500">
                  Dépend de : {m.dependencies.map((d) => db.milestones.find((x) => x.id === d)?.title ?? d).join(", ")}
                </div>
              )}
              {m.blockingRisks && (
                <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[0.7rem] text-amber-800">
                  ⚠ Risques bloquants : {m.blockingRisks}
                </div>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
