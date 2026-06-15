"use client";
import React, { useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Button, TextInput, Field } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import type { Database, LicenseType, Settings } from "@/lib/types";
import { monthlyVsAnnualDelta } from "@/lib/domain/licensing";
import { eur } from "@/lib/format";

export default function SettingsPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { patchLicenseType, patchSettings } = useData();

  return (
    <>
      <PageTitle title="Paramètres" subtitle="Prix des licences & hypothèses de comparaison — les coûts se recalculent automatiquement" />

      <Card title="Référentiel des prix de licences (€ HT / mois / user)" className="mb-3">
        <div className="overflow-x-auto">
          <table className="grid-table">
            <thead>
              <tr><th>Code</th><th>Profil</th><th className="text-right">Stockage (Go)</th><th className="text-right">EA-PA</th><th className="text-right">EA-PM</th><th className="text-right">EM-PM</th><th className="text-right">Pack BeCloud</th><th className="text-right">Δ mensuel/annuel /an</th></tr>
            </thead>
            <tbody>
              {db.licenseTypes.map((lt) => (
                <PriceRow key={lt.code} lt={lt} onSave={(p) => patchLicenseType(lt.code, p)} delta={monthlyVsAnnualDelta(lt.code, db.licenseTypes)} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xms text-slate-500">Modifiez une valeur puis validez (Entrée ou hors champ). Le Pack BeCloud ne s'applique qu'au profil Business Premium (P1).</p>
      </Card>

      <Card title="Hypothèses de comparaison & défauts">
        <SettingsForm settings={db.settings} onSave={patchSettings} />
      </Card>
    </>
  );
}

function PriceRow({ lt, onSave, delta }: { lt: LicenseType; onSave: (p: Partial<LicenseType>) => void; delta: number }) {
  const [d, setD] = useState(lt);
  const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  const save = () => onSave({ price: d.price, packBeCloud: d.packBeCloud, storageGB: d.storageGB });
  return (
    <tr>
      <td className="font-semibold">{lt.code}</td>
      <td>{lt.label}</td>
      <td className="text-right"><input type="number" value={d.storageGB} onChange={(e) => setD({ ...d, storageGB: num(e.target.value) })} onBlur={save} className="cell-input w-16 text-right" /></td>
      <td className="text-right"><input type="number" step="0.01" value={d.price.EA_PA} onChange={(e) => setD({ ...d, price: { ...d.price, EA_PA: num(e.target.value) } })} onBlur={save} className="cell-input w-20 text-right" /></td>
      <td className="text-right"><input type="number" step="0.01" value={d.price.EA_PM} onChange={(e) => setD({ ...d, price: { ...d.price, EA_PM: num(e.target.value) } })} onBlur={save} className="cell-input w-20 text-right" /></td>
      <td className="text-right"><input type="number" step="0.01" value={d.price.EM_PM} onChange={(e) => setD({ ...d, price: { ...d.price, EM_PM: num(e.target.value) } })} onBlur={save} className="cell-input w-20 text-right" /></td>
      <td className="text-right"><input type="number" step="0.01" value={d.packBeCloud} onChange={(e) => setD({ ...d, packBeCloud: num(e.target.value) })} onBlur={save} className="cell-input w-20 text-right" /></td>
      <td className="text-right text-slate-500">{delta ? eur(delta) : "—"}</td>
    </tr>
  );
}

function SettingsForm({ settings, onSave }: { settings: Settings; onSave: (p: Partial<Settings>) => void }) {
  const [s, setS] = useState(settings);
  const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Google Workspace € / mois / user"><TextInput type="number" value={s.googleWorkspacePerUser} onChange={(v) => setS({ ...s, googleWorkspacePerUser: num(v) })} className="w-full" /></Field>
        <Field label="Nb comptes Google facturés"><TextInput type="number" value={s.googleWorkspaceUsers} onChange={(v) => setS({ ...s, googleWorkspaceUsers: num(v) })} className="w-full" /></Field>
        <Field label="Dropbox € / mois (total)"><TextInput type="number" value={s.dropboxMonthly} onChange={(v) => setS({ ...s, dropboxMonthly: num(v) })} className="w-full" /></Field>
        <Field label="Fournisseur DNS"><TextInput value={s.dnsProvider} onChange={(v) => setS({ ...s, dnsProvider: v })} className="w-full" /></Field>
        <Field label="Auteur par défaut (audit)"><TextInput value={s.defaultAuthor} onChange={(v) => setS({ ...s, defaultAuthor: v })} className="w-full" /></Field>
      </div>
      <Button variant="primary" onClick={() => onSave(s)}>Enregistrer les paramètres</Button>
    </div>
  );
}
