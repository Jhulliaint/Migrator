"use client";
import React from "react";
import type { Database } from "@/lib/types";
import { SidePanel, Badge } from "@/components/ui/primitives";
import { UserLink, LicenseLink, SiteLink } from "@/components/inspector/links";
import { eur, num } from "@/lib/format";
import {
  findLicense,
  monthlyLicenseCost,
  userMonthlyTotal,
  monthlyVsAnnualDelta,
  packBeCloudCost,
} from "@/lib/domain/licensing";
import { storageStatus } from "@/lib/domain/storage";

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "green" | "red" | "orange" }) {
  const c = tone === "green" ? "text-statusGreen" : tone === "red" ? "text-statusRed" : tone === "orange" ? "text-statusOrange" : "text-navy-900";
  return (
    <div className="rounded border border-slate-200 bg-white px-2 py-1.5 text-center">
      <div className={`text-base font-bold ${c}`}>{value}</div>
      <div className="text-[0.68rem] text-slate-500">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Fiche LICENCE
// ---------------------------------------------------------------------------
export function LicenseFiche({ db, code, onClose, onBack }: { db: Database; code: string; onClose: () => void; onBack?: () => void }) {
  const lt = findLicense(code as never, db.licenseTypes);
  if (!lt) return <SidePanel open title={`Licence ${code}`} onClose={onClose} onBack={onBack}><p className="text-sm text-slate-500">Profil inconnu.</p></SidePanel>;

  const holders = db.users.filter((u) => u.licenseProfile === code);
  const monthly = holders.reduce((s, u) => s + userMonthlyTotal(u, db.licenseTypes), 0);
  const pack = holders.reduce((s, u) => s + packBeCloudCost(u, db.licenseTypes), 0);
  const delta = monthlyVsAnnualDelta(code as never, db.licenseTypes);

  return (
    <SidePanel open title={`Licence ${lt.code} · ${lt.label}`} onClose={onClose} onBack={onBack}>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Porteurs" value={holders.length} />
        <Stat label="€ / mois" value={num(monthly)} />
        <Stat label="€ / an" value={num(monthly * 12)} />
      </div>

      <h4 className="mb-1 text-xms font-semibold uppercase tracking-wide text-navy-700">Référentiel</h4>
      <table className="grid-table mb-3">
        <tbody>
          <tr><td className="font-medium">Stockage inclus</td><td>{code === "SHARED" ? "≤ 50 Go (gratuit)" : `${lt.storageGB} Go`}</td></tr>
          <tr><td className="font-medium">EA-PA (annuel/annuel)</td><td>{lt.price.EA_PA ? eur(lt.price.EA_PA) : "—"}</td></tr>
          <tr><td className="font-medium">EA-PM (annuel/mensuel)</td><td>{lt.price.EA_PM ? eur(lt.price.EA_PM) : "—"}</td></tr>
          <tr><td className="font-medium">EM-PM (mensuel/mensuel)</td><td>{lt.price.EM_PM ? eur(lt.price.EM_PM) : "—"}</td></tr>
          <tr><td className="font-medium">Pack BeCloud</td><td>{lt.packBeCloud ? eur(lt.packBeCloud) : "—"}</td></tr>
          <tr><td className="font-medium">Comptée dans les licences</td><td>{lt.countedInLicenses ? "Oui" : "Non"}</td></tr>
          {delta !== 0 && <tr><td className="font-medium">Surcoût mensuel vs annuel</td><td>{eur(delta)} / an / user</td></tr>}
        </tbody>
      </table>

      <h4 className="mb-1 text-xms font-semibold uppercase tracking-wide text-navy-700">Porteurs ({holders.length})</h4>
      {holders.length === 0 ? (
        <p className="text-xms text-slate-400">Aucun utilisateur sur ce profil.</p>
      ) : (
        <table className="grid-table">
          <thead><tr><th>Utilisateur</th><th>Site</th><th className="text-right">Go</th><th className="text-right">€/mois</th></tr></thead>
          <tbody>
            {holders.map((u) => (
              <tr key={u.id}>
                <td><UserLink id={u.id} /></td>
                <td><SiteLink site={u.site} /></td>
                <td className="text-right">{u.mailboxSizeGB}</td>
                <td className="text-right">{num(userMonthlyTotal(u, db.licenseTypes))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SidePanel>
  );
}

// ---------------------------------------------------------------------------
//  Fiche SITE / PAYS
// ---------------------------------------------------------------------------
export function SiteFiche({ db, site, onClose, onBack }: { db: Database; site: string; onClose: () => void; onBack?: () => void }) {
  const users = db.users.filter((u) => u.site === site);
  const monthly = users.reduce((s, u) => s + userMonthlyTotal(u, db.licenseTypes), 0);
  const over50 = users.filter((u) => u.mailboxSizeGB > 50).length;
  const over100 = users.filter((u) => u.mailboxSizeGB > 100).length;
  const byProfile = Array.from(users.reduce((m, u) => m.set(u.licenseProfile, (m.get(u.licenseProfile) ?? 0) + 1), new Map<string, number>()));

  return (
    <SidePanel open title={`Site · ${site}`} onClose={onClose} onBack={onBack}>
      <div className="mb-3 grid grid-cols-4 gap-2">
        <Stat label="Comptes" value={users.length} />
        <Stat label="€/mois" value={num(monthly)} />
        <Stat label="> 50 Go" value={over50} tone={over50 ? "orange" : undefined} />
        <Stat label="> 100 Go" value={over100} tone={over100 ? "red" : undefined} />
      </div>

      <h4 className="mb-1 text-xms font-semibold uppercase tracking-wide text-navy-700">Répartition des profils</h4>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {byProfile.map(([code, n]) => (
          <span key={code} className="inline-flex items-center gap-1"><LicenseLink code={code} /><span className="text-xms text-slate-500">×{n}</span></span>
        ))}
      </div>

      <h4 className="mb-1 text-xms font-semibold uppercase tracking-wide text-navy-700">Utilisateurs ({users.length})</h4>
      <table className="grid-table">
        <thead><tr><th>Utilisateur</th><th>Profil</th><th className="text-right">Go</th><th>Migration</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><UserLink id={u.id} /></td>
              <td><LicenseLink code={u.licenseProfile} /></td>
              <td className="text-right"><span className={storageStatus(u.mailboxSizeGB) === "critique" ? "font-bold text-statusRed" : storageStatus(u.mailboxSizeGB) === "élevé" ? "text-statusOrange" : ""}>{u.mailboxSizeGB}</span></td>
              <td><Badge tone={u.mailStatus === "validé" ? "green" : u.mailStatus === "problème" ? "red" : "gray"}>{u.mailStatus}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </SidePanel>
  );
}
