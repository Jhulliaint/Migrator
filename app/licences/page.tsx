"use client";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Badge, Button } from "@/components/ui/primitives";
import { eur, num } from "@/lib/format";
import {
  summarizeByProfile,
  parkTotals,
  scenarioComparison,
  googleComparison,
  monthlyLicenseCost,
  packBeCloudCost,
  userMonthlyTotal,
  priceKey,
  findLicense,
} from "@/lib/domain/licensing";
import { userIssues, hasError } from "@/lib/domain/validation";
import { UserLink, LicenseLink } from "@/components/inspector/links";
import Link from "next/link";

export default function LicencesPage() {
  return (
    <WithDb>
      {(db) => {
        const byProfile = summarizeByProfile(db.users, db.licenseTypes);
        const totals = parkTotals(db.users, db.licenseTypes);
        const scenarios = scenarioComparison(db.users, db.licenseTypes);
        const google = googleComparison(db.users, db.licenseTypes, db.settings);
        const arbitrer = db.users.filter((u) => u.status === "à arbitrer");
        const sorted = [...db.users].sort((a, b) => a.licenseProfile.localeCompare(b.licenseProfile) || b.mailboxSizeGB - a.mailboxSizeGB);

        return (
          <>
            <PageTitle
              title="Suivi licences"
              subtitle="Référentiel · ventilation · coûts · scénarios — logique de l'onglet Excel « Suivi Licences »"
              actions={<Link href="/parametres"><Button>⚙ Modifier les prix</Button></Link>}
            />

            {/* Référentiel */}
            <Card title="Référentiel profils × engagement × paiement (€ HT / mois / user)" className="mb-3">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Profil</th><th>Stockage</th>
                    <th className="text-right">EA-PA<br /><span className="font-normal opacity-70">annuel/annuel</span></th>
                    <th className="text-right">EA-PM<br /><span className="font-normal opacity-70">annuel/mensuel</span></th>
                    <th className="text-right">EM-PM<br /><span className="font-normal opacity-70">mensuel/mensuel</span></th>
                    <th className="text-right">Pack BeCloud</th>
                  </tr>
                </thead>
                <tbody>
                  {db.licenseTypes.map((lt) => (
                    <tr key={lt.code}>
                      <td><LicenseLink code={lt.code} /></td>
                      <td>{lt.label}</td>
                      <td>{lt.code === "SHARED" ? "≤ 50 Go (gratuit)" : `${lt.storageGB} Go`}</td>
                      <td className="text-right">{lt.price.EA_PA ? eur(lt.price.EA_PA) : "—"}</td>
                      <td className="text-right">{lt.price.EA_PM ? eur(lt.price.EA_PM) : "—"}</td>
                      <td className="text-right">{lt.price.EM_PM ? eur(lt.price.EM_PM) : "—"}</td>
                      <td className="text-right">{lt.packBeCloud ? eur(lt.packBeCloud) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xms text-slate-500">Le Pack BeCloud (42,50 €) s'applique uniquement aux Business Premium. Les boîtes partagées sont gratuites et non comptées dans les licences.</p>
            </Card>

            {/* Récap + KPIs */}
            <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Card title="Récapitulatif par profil">
                <table className="grid-table">
                  <thead><tr><th>Code</th><th>Profil</th><th className="text-right">Nb</th><th className="text-right">€/mois</th><th className="text-right">€/an</th></tr></thead>
                  <tbody>
                    {byProfile.map((r) => (
                      <tr key={r.code}><td><LicenseLink code={r.code} /></td><td>{r.label.slice(0, 26)}</td><td className="text-right">{r.count}</td><td className="text-right">{num(r.monthly)}</td><td className="text-right">{num(r.annual)}</td></tr>
                    ))}
                    <tr className="bg-navy-50 font-bold">
                      <td colSpan={2}>TOTAL</td>
                      <td className="text-right">{totals.licensedCount}</td>
                      <td className="text-right">{num(totals.totalMonthly)}</td>
                      <td className="text-right">{num(totals.totalAnnual)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-1 text-xms text-slate-500">⚠ À arbitrer : <strong>{arbitrer.length}</strong> compte(s)</p>
              </Card>

              <Card title="Comparatif scénarios (€/an)">
                <table className="grid-table">
                  <thead><tr><th>Scénario</th><th className="text-right">Lic. €/mois</th><th className="text-right">Pack €/mois</th><th className="text-right">Total €/an</th></tr></thead>
                  <tbody>
                    {scenarios.rows.map((r) => (
                      <tr key={r.key}><td className="font-semibold" title={r.description}>{r.label}</td><td className="text-right">{num(r.licensesMonthly)}</td><td className="text-right">{num(r.packMonthly)}</td><td className="text-right font-semibold">{num(r.totalAnnual)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xms">Économie max EA-PA vs EM-PM : <strong className="text-statusGreen">{eur(scenarios.maxSaving)}/an</strong></p>
              </Card>

              <Card title="Comparatif Google / Dropbox">
                <dl className="space-y-1.5 text-xms">
                  <Row label="Google Workspace /mois" value={eur(google.googleMonthly)} />
                  <Row label="Dropbox /mois" value={eur(google.dropboxMonthly)} />
                  <Row label="Total actuel /mois" value={eur(google.currentMonthly)} bold />
                  <Row label="Cible Microsoft /mois" value={eur(google.microsoftMonthly)} bold />
                  <div className="my-1 border-t border-slate-200" />
                  <Row label="Économie /mois" value={eur(google.monthlySaving)} tone={google.monthlySaving >= 0 ? "green" : "red"} bold />
                  <Row label="Économie /an" value={eur(google.annualSaving)} tone={google.annualSaving >= 0 ? "green" : "red"} bold />
                </dl>
              </Card>
            </div>

            {/* Ventilation détaillée */}
            <Card title="Ventilation des utilisateurs">
              <div className="overflow-x-auto">
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Prénom</th><th>Nom</th><th>Email</th><th className="text-right">Go</th><th>Profil</th>
                      <th>Engag.</th><th>Paiem.</th><th className="text-right">Licence €</th><th className="text-right">Pack €</th><th className="text-right">Total €</th><th>Alerte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((u) => {
                      const issues = userIssues(u, db.licenseTypes, db.users);
                      const err = hasError(issues);
                      return (
                        <tr key={u.id}>
                          <td>{u.firstName}</td>
                          <td className="font-medium"><UserLink id={u.id}>{u.lastName}</UserLink></td>
                          <td className="text-slate-500">{u.googleEmail}</td>
                          <td className="text-right">{u.mailboxSizeGB}</td>
                          <td><LicenseLink code={u.licenseProfile} /></td>
                          <td>{u.engagement}</td>
                          <td>{u.payment} <span className="text-[0.6rem] text-slate-400">({priceKey(u.engagement, u.payment).replace("_", "-")})</span></td>
                          <td className="text-right">{num(monthlyLicenseCost(u, db.licenseTypes))}</td>
                          <td className="text-right">{num(packBeCloudCost(u, db.licenseTypes))}</td>
                          <td className="text-right font-semibold">{num(userMonthlyTotal(u, db.licenseTypes))}</td>
                          <td>{err ? <span className="text-statusRed" title={issues.filter((i) => i.level === "error").map((i) => i.message).join("\n")}>⚠ {issues.find((i) => i.level === "error")?.code}</span> : issues.length ? <span className="text-statusOrange" title={issues.map((i) => i.message).join("\n")}>● à vérifier</span> : <span className="text-slate-300">ok</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        );
      }}
    </WithDb>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: "green" | "red" }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd className={`${bold ? "font-bold" : ""} ${tone === "green" ? "text-statusGreen" : tone === "red" ? "text-statusRed" : "text-navy-900"}`}>{value}</dd>
    </div>
  );
}
