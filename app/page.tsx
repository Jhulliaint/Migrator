"use client";
import { WithDb, PageTitle } from "@/components/ui/page";
import { KpiCard, Card, Badge } from "@/components/ui/primitives";
import { Donut, BarList, colorAt } from "@/components/ui/charts";
import { eur, eur0, num } from "@/lib/format";
import {
  parkTotals,
  summarizeByProfile,
  googleComparison,
  scenarioComparison,
} from "@/lib/domain/licensing";
import { computeAutoRisks } from "@/lib/domain/risks";
import { readinessKpis } from "@/lib/domain/timeline";
import { useInspector } from "@/lib/inspector";
import Link from "next/link";

export default function DashboardPage() {
  const { inspectLicense } = useInspector();
  return (
    <WithDb>
      {(db) => {
        const totals = parkTotals(db.users, db.licenseTypes);
        const byProfile = summarizeByProfile(db.users, db.licenseTypes);
        const google = googleComparison(db.users, db.licenseTypes, db.settings);
        const scenarios = scenarioComparison(db.users, db.licenseTypes);
        const kpis = readinessKpis(db.users, db.licenseTypes);
        const autoRisks = computeAutoRisks(db.users, db.licenseTypes, db.milestones);
        const allRisks = [...db.risks, ...autoRisks];
        const criticalOpen = allRisks.filter((r) => r.severity === "critique" && r.status !== "clos").length;

        const total = db.users.length;
        const physical = db.users.filter((u) => u.physicalUser).length;
        const technical = db.users.filter((u) => !u.physicalUser).length;
        const sharedTarget = db.users.filter((u) => u.mailbox.typeTarget === "boîte partagée").length;
        const count = (code: string) => db.users.filter((u) => u.licenseProfile === code).length;
        const mfaDone = db.users.filter((u) => u.mfa.configured).length;
        const reconnected = db.users.filter((u) => u.mailStatus === "reconnecté" || u.mailStatus === "validé").length;
        const lateTasks = db.tasks.filter(
          (t) => t.dueDate && t.status !== "terminé" && t.status !== "annulé" && new Date(t.dueDate) < new Date()
        ).length;

        const profileSlices = byProfile
          .filter((r) => r.count > 0)
          .map((r, i) => ({ label: `${r.code} · ${r.label.slice(0, 22)}`, value: r.count, color: colorAt(i) }));

        const migrationDist = ["non commencé", "copie lancée", "copié", "basculé", "reconnecté", "validé", "problème"].map((s, i) => ({
          label: s,
          value: db.users.filter((u) => u.mailStatus === s).length,
          color: colorAt(i),
        })).filter((x) => x.value > 0);

        const mfaDist = ["non démarrée", "à faire", "configurée Authenticator", "configurée SMS", "bloquée"].map((s, i) => ({
          label: s,
          value: db.users.filter((u) => u.mfa.status === s).length,
          color: colorAt(i),
        })).filter((x) => x.value > 0);

        const riskByCat = Array.from(
          allRisks.reduce((m, r) => m.set(r.category, (m.get(r.category) ?? 0) + 1), new Map<string, number>())
        ).map(([label, value], i) => ({ label, value, color: colorAt(i) }));

        return (
          <>
            <PageTitle
              title="Dashboard"
              subtitle="Vue de pilotage — migration Google Workspace → Microsoft 365 / Exchange Online"
            />

            {/* KPI parc & licences */}
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Comptes totaux" value={total} />
              <KpiCard label="Utilisateurs physiques" value={physical} tone="blue" />
              <KpiCard label="Boîtes techniques/service" value={technical} tone="gray" />
              <KpiCard label="Boîtes partagées (cible)" value={sharedTarget} tone="navy" />
              <KpiCard label="Business Premium" value={count("P1")} tone="navy" />
              <KpiCard label="F3 (P3)" value={count("P3")} tone="blue" />
            </div>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="F3 + Exchange (P2)" value={count("P2")} tone="blue" />
              <KpiCard label="Exchange Plan 1 (P4a)" value={count("P4a")} tone="blue" />
              <KpiCard label="Kiosk (P4b)" value={count("P4b")} tone="gray" />
              <KpiCard label="Boîtes > 50 Go" value={kpis.over50} tone={kpis.over50 ? "orange" : "green"} />
              <KpiCard label="Boîtes > 100 Go" value={kpis.over100} tone={kpis.over100 ? "red" : "green"} />
              <KpiCard label="MFA réalisées" value={`${mfaDone}/${physical}`} tone={mfaDone < physical ? "orange" : "green"} />
            </div>

            {/* KPI financiers & avancement */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Utilisateurs reconnectés" value={`${reconnected}/${physical}`} tone="blue" />
              <KpiCard label="Coût mensuel Microsoft" value={eur(totals.licenseMonthly)} sub="licences seules" tone="navy" />
              <KpiCard label="Coût mensuel BeCloud" value={eur(totals.packMonthly)} sub="Pack Business Premium" tone="navy" />
              <KpiCard label="Coût mensuel total" value={eur(totals.totalMonthly)} sub={`${eur0(totals.totalAnnual)} / an`} tone="navy" />
              <KpiCard label="Économie vs Google/Dropbox" value={eur(google.monthlySaving)} sub={`${eur0(google.annualSaving)} / an`} tone={google.monthlySaving >= 0 ? "green" : "red"} />
              <KpiCard label="Risques critiques ouverts" value={criticalOpen} tone={criticalOpen ? "red" : "green"} />
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Card title="Répartition des licences">
                <Donut slices={profileSlices} />
              </Card>
              <Card title="Coût mensuel par profil (€)">
                <BarList items={byProfile.filter((r) => r.monthly > 0).map((r, i) => ({ label: r.code, value: r.monthly, color: colorAt(i), suffix: " €", onClick: () => inspectLicense(r.code) }))} />
              </Card>
              <Card title="Tâches en retard / à faire">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${lateTasks ? "text-statusRed" : "text-statusGreen"}`}>{lateTasks}</span>
                  <span className="text-xms text-slate-500">tâches en retard</span>
                </div>
                <ul className="mt-2 space-y-1 text-xms">
                  {db.tasks.filter((t) => t.status !== "terminé" && t.status !== "annulé").slice(0, 6).map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <Badge tone={t.priority === "critique" ? "red" : t.priority === "haute" ? "orange" : "gray"}>{t.priority}</Badge>
                      <span className="truncate text-slate-700">{t.title}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/taches" className="mt-2 inline-block text-xms text-navy-700 underline">Voir toutes les tâches →</Link>
              </Card>

              <Card title="Statut de migration mail">
                <BarList items={migrationDist.map((d) => ({ label: d.label, value: d.value, color: d.color }))} />
              </Card>
              <Card title="Statut MFA">
                <BarList items={mfaDist.map((d) => ({ label: d.label, value: d.value, color: d.color }))} />
              </Card>
              <Card title="Risques par catégorie">
                <BarList items={riskByCat} />
              </Card>
            </div>

            {/* Comparatif scénarios */}
            <Card title="Comparatif des 3 scénarios d'engagement (€ / an)" className="mt-3">
              <table className="grid-table">
                <thead>
                  <tr><th>Scénario</th><th>Description</th><th className="text-right">Licences €/mois</th><th className="text-right">Pack €/mois</th><th className="text-right">Total €/an</th></tr>
                </thead>
                <tbody>
                  {scenarios.rows.map((r) => (
                    <tr key={r.key}>
                      <td className="font-semibold">{r.label}</td>
                      <td>{r.description}</td>
                      <td className="text-right">{num(r.licensesMonthly)}</td>
                      <td className="text-right">{num(r.packMonthly)}</td>
                      <td className="text-right font-semibold">{num(r.totalAnnual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xms text-slate-500">
                Économie maximale (EA-PA vs EM-PM) : <strong className="text-statusGreen">{eur(scenarios.maxSaving)} / an</strong>.
              </p>
            </Card>
          </>
        );
      }}
    </WithDb>
  );
}
