"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Badge, Select, Button } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import type { Database, User } from "@/lib/types";
import { makeUser, profileFromCheckboxes } from "@/lib/domain/factory";

type Mapping = Record<string, string>; // champ app -> en-tête colonne

const FIELDS: { key: string; label: string }[] = [
  { key: "firstName", label: "Prénom (First Name)" },
  { key: "lastName", label: "Nom (Last Name)" },
  { key: "googleEmail", label: "Email (Email Address)" },
  { key: "status", label: "Statut (Status)" },
  { key: "lastGoogleSignIn", label: "Dernière connexion (Last Sign In)" },
  { key: "mailboxSizeGB", label: "Usage mail (Email Usage)" },
  { key: "cb_business", label: "Case Business" },
  { key: "cb_f3_50", label: "Case 50 Go F3" },
  { key: "cb_f3", label: "Case 2 Go F3" },
  { key: "cb_go50", label: "Case 50 Go" },
  { key: "cb_go2", label: "Case 2 Go" },
];

function autoMap(headers: string[]): Mapping {
  const m: Mapping = {};
  const find = (re: RegExp) => headers.find((h) => re.test(h)) ?? "";
  m.firstName = find(/first ?name|prénom|prenom/i);
  m.lastName = find(/last ?name|nom/i);
  m.googleEmail = find(/e-?mail|adresse mail/i);
  m.status = find(/status|statut/i);
  m.lastGoogleSignIn = find(/last ?sign|connexion/i);
  m.mailboxSizeGB = find(/usage|taille|size/i);
  m.cb_business = find(/^business/i);
  m.cb_f3_50 = find(/50 ?go ?f3/i);
  m.cb_f3 = find(/2 ?go ?f3/i);
  m.cb_go50 = headers.find((h) => /^50 ?go$/i.test(h.trim())) ?? "";
  m.cb_go2 = headers.find((h) => /^2 ?go$/i.test(h.trim())) ?? "";
  return m;
}

export default function ImportExportPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { importUsers, reset } = useData();
  const [sheets, setSheets] = useState<Record<string, Record<string, unknown>[]>>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheet, setSheet] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [msg, setMsg] = useState<string>("");

  const onFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    const data: Record<string, Record<string, unknown>[]> = {};
    for (const name of wb.SheetNames) {
      data[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
    }
    setSheets(data);
    setSheetNames(wb.SheetNames);
    const preferred = wb.SheetNames.find((n) => /liste ?users|users/i.test(n)) ?? wb.SheetNames[0];
    selectSheet(preferred, data);
    setMsg(`Fichier « ${file.name} » chargé — ${wb.SheetNames.length} onglet(s).`);
  };

  const selectSheet = (name: string, data = sheets) => {
    setSheet(name);
    const rows = data[name] ?? [];
    const hs = rows.length ? Object.keys(rows[0]) : [];
    setHeaders(hs);
    setMapping(autoMap(hs));
  };

  const rows = sheets[sheet] ?? [];

  const buildUsers = (): User[] => {
    const g = (r: Record<string, unknown>, field: string) => {
      const col = mapping[field];
      return col ? r[col] : undefined;
    };
    const truthy = (v: unknown) => v === true || /^(true|oui|x|1)$/i.test(String(v ?? "").trim());
    return rows
      .filter((r) => String(g(r, "googleEmail") ?? "").includes("@"))
      .map((r) => {
        const email = String(g(r, "googleEmail")).trim();
        const sizeRaw = g(r, "mailboxSizeGB");
        const size = typeof sizeRaw === "number" ? sizeRaw : parseFloat(String(sizeRaw).replace(",", ".")) || 0;
        const signin = g(r, "lastGoogleSignIn");
        return makeUser({
          firstName: String(g(r, "firstName") ?? "").trim(),
          lastName: String(g(r, "lastName") ?? "").trim(),
          googleEmail: email,
          mailboxSizeGB: Math.round(size * 100) / 100,
          lastGoogleSignIn: signin instanceof Date ? signin.toISOString().slice(0, 10) : (signin ? String(signin) : null),
          licenseProfile: profileFromCheckboxes({
            business: truthy(g(r, "cb_business")), f3_50: truthy(g(r, "cb_f3_50")),
            f3: truthy(g(r, "cb_f3")), go50: truthy(g(r, "cb_go50")), go2: truthy(g(r, "cb_go2")),
          }),
          packBeCloud: truthy(g(r, "cb_business")),
        });
      });
  };

  const apply = async () => {
    const users = buildUsers();
    if (!users.length) { setMsg("Aucune ligne valide (email manquant ?)."); return; }
    await importUsers(users, mode);
    setMsg(`✓ ${users.length} utilisateur(s) importé(s) (mode ${mode}).`);
  };

  const preview = buildUsers().slice(0, 5);

  return (
    <>
      <PageTitle title="Imports / Exports" subtitle="Import du fichier Excel BeCloud · exports CSV / XLSX de pilotage et de migration" />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* IMPORT */}
        <Card title="Importer">
          <p className="mb-2 text-xms text-slate-600">Importez <code>BECLOUD ANALYSE.xlsx</code> (onglet « Liste Users ») ou un CSV Google Workspace. Les colonnes sont mappées automatiquement ; ajustez si besoin.</p>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="block w-full text-xms file:mr-2 file:rounded file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1" />

          {sheetNames.length > 0 && (
            <div className="mt-3">
              <label className="text-xms text-slate-500">Onglet</label>
              <Select value={sheet} options={sheetNames} onChange={(v) => selectSheet(v)} className="ml-2" />
              <span className="ml-2 text-xms text-slate-500">{rows.length} ligne(s)</span>

              <div className="mt-3 max-h-64 overflow-y-auto rounded border border-slate-200">
                <table className="grid-table">
                  <thead><tr><th>Champ application</th><th>Colonne source</th></tr></thead>
                  <tbody>
                    {FIELDS.map((f) => (
                      <tr key={f.key}>
                        <td>{f.label}</td>
                        <td><Select value={mapping[f.key] ?? ""} options={["", ...headers]} onChange={(v) => setMapping({ ...mapping, [f.key]: v })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 text-xms font-semibold text-slate-600">Aperçu ({preview.length} premières lignes)</div>
                  <div className="overflow-x-auto rounded border border-slate-200">
                    <table className="grid-table">
                      <thead><tr><th>Prénom</th><th>Nom</th><th>Email</th><th>Go</th><th>Profil</th></tr></thead>
                      <tbody>{preview.map((u, i) => <tr key={i}><td>{u.firstName}</td><td>{u.lastName}</td><td>{u.googleEmail}</td><td>{u.mailboxSizeGB}</td><td>{u.licenseProfile}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <label className="text-xms text-slate-500">Mode</label>
                <Select value={mode} options={[{ value: "merge", label: "Fusionner (par email)" }, { value: "replace", label: "Remplacer tout" }]} onChange={(v) => setMode(v as "merge" | "replace")} />
                <Button variant="primary" onClick={apply}>Importer</Button>
              </div>
            </div>
          )}
          {msg && <p className="mt-2 text-xms text-navy-700">{msg}</p>}
        </Card>

        {/* EXPORT */}
        <Card title="Exporter">
          <ul className="space-y-2 text-xms">
            <ExportRow href="/api/export/users-csv" label="Utilisateurs (CSV)" desc="Liste des comptes avec licences et coûts." />
            <ExportRow href="/api/export/pilotage-xlsx" label="XLSX de pilotage" desc="Onglets Utilisateurs / Tâches / Risques." />
            <ExportRow href="/api/export/migration-xlsx" label="XLSX de migration BeCloud" desc="Onglets Utilisateurs / Boîtes partagées / Listes de distribution / Boîtes ressources / Domaines." />
          </ul>
          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="text-xms font-semibold text-slate-600">Données de démonstration</div>
            <p className="text-xms text-slate-500">Réinitialise la base au jeu de démo issu du fichier réel.</p>
            <Button variant="danger" className="mt-1" onClick={() => { if (confirm("Réinitialiser toutes les données aux valeurs de démonstration ?")) reset(); }}>Réinitialiser les données</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function ExportRow({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2">
      <div>
        <div className="font-medium text-navy-800">{label}</div>
        <div className="text-slate-500">{desc}</div>
      </div>
      <a href={href}><Button>⇩ Télécharger</Button></a>
    </li>
  );
}
