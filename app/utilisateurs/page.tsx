"use client";
import React, { useMemo, useState, useEffect } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Badge, Checkbox, Select, Button, TextInput, useSort, Th, riskTone } from "@/components/ui/primitives";
import { SiteLink } from "@/components/inspector/links";
import { useData } from "@/lib/store-client";
import { useInspector } from "@/lib/inspector";
import type { User, LicenseCode, Database } from "@/lib/types";
import { userMonthlyTotal } from "@/lib/domain/licensing";
import { userIssues, hasError } from "@/lib/domain/validation";
import { storageStatus } from "@/lib/domain/storage";
import { eur, dateFr } from "@/lib/format";

// Profils de licence présentés dans la liste déroulante de la colonne « Licence ».
const LICENSE_OPTS: { value: LicenseCode; label: string }[] = [
  { value: "P1", label: "P1 · Business Premium" },
  { value: "P2", label: "P2 · F3 + Exch 50Go" },
  { value: "P3", label: "P3 · M365 F3" },
  { value: "P4a", label: "P4a · Exch Plan 1 50Go" },
  { value: "P4b", label: "P4b · Exch Kiosk 2Go" },
  { value: "SHARED", label: "Boîte partagée" },
];

const ACCOUNT_STATUSES = ["actif", "ancien salarié", "boîte de service", "boîte technique", "à arbitrer"] as const;

// Champs utilisateur mappables sur une colonne personnalisable de la liste.
type MappableField = { key: string; label: string; get: (u: User) => React.ReactNode };
const oui = (b: boolean) => (b ? "Oui" : "—");
const MAPPABLE_FIELDS: MappableField[] = [
  { key: "microsoftEmail", label: "Email Microsoft", get: (u) => u.microsoftEmail },
  { key: "role", label: "Rôle métier", get: (u) => u.role || "—" },
  { key: "phone", label: "Téléphone", get: (u) => u.phone || "—" },
  { key: "vip", label: "VIP", get: (u) => oui(u.vip) },
  { key: "physicalUser", label: "Utilisateur physique", get: (u) => oui(u.physicalUser) },
  { key: "os", label: "Système", get: (u) => u.os },
  { key: "usesMobile", label: "Mobile", get: (u) => oui(u.usesMobile) },
  { key: "targetSizeGB", label: "Taille cible (Go)", get: (u) => u.targetSizeGB ?? "—" },
  { key: "cleanupRequested", label: "Nettoyage demandé", get: (u) => oui(u.cleanupRequested) },
  { key: "cleanupDone", label: "Nettoyage fait", get: (u) => oui(u.cleanupDone) },
  { key: "mailStatus", label: "Statut migration", get: (u) => u.mailStatus },
  { key: "commStatus", label: "Statut communication", get: (u) => u.commStatus },
  { key: "engagement", label: "Engagement", get: (u) => u.engagement },
  { key: "payment", label: "Paiement", get: (u) => u.payment },
  { key: "packBeCloud", label: "Pack BeCloud", get: (u) => oui(u.packBeCloud) },
  { key: "mfaStatus", label: "MFA · statut", get: (u) => u.mfa.status },
  { key: "mfaMethod", label: "MFA · méthode", get: (u) => u.mfa.method },
  { key: "typeCurrent", label: "Boîte · type actuel", get: (u) => u.mailbox.typeCurrent },
  { key: "typeTarget", label: "Boîte · type cible", get: (u) => u.mailbox.typeTarget },
  { key: "members", label: "Boîte · membres", get: (u) => u.mailbox.members.length || "—" },
  { key: "alias", label: "Boîte · alias", get: (u) => u.mailbox.alias.join(", ") || "—" },
  { key: "linkedMailboxes", label: "Boîtes liées", get: (u) => u.linkedMailboxes.length || "—" },
  { key: "remarks", label: "Remarques", get: (u) => u.remarks || "—" },
  { key: "updatedAt", label: "Modifié le", get: (u) => dateFr(u.updatedAt) },
];

export default function UsersPage() {
  return <WithDb>{(db) => <UsersInner db={db} />}</WithDb>;
}

function UsersInner({ db }: { db: Database }) {
  const { patchUser, deleteUser } = useData();
  const { inspectUser } = useInspector();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("tous");
  const [fSite, setFSite] = useState("tous");
  const [fProfile, setFProfile] = useState("tous");
  const [onlyBig, setOnlyBig] = useState(false);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [onlyVip, setOnlyVip] = useState(false);
  // Colonnes personnalisables (mappées sur un champ utilisateur), persistées localement.
  const [customCols, setCustomCols] = useState<string[]>([]);
  useEffect(() => {
    try { const s = localStorage.getItem("migrator.users.customCols"); if (s) setCustomCols(JSON.parse(s)); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("migrator.users.customCols", JSON.stringify(customCols)); } catch { /* ignore */ }
  }, [customCols]);
  const addColumn = (key: string) => setCustomCols((c) => (c.includes(key) ? c : [...c, key]));
  const removeColumn = (key: string) => setCustomCols((c) => c.filter((k) => k !== key));

  const sites = useMemo(() => Array.from(new Set(db.users.map((u) => u.site))).sort(), [db.users]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return db.users.filter((u) => {
      if (ql && !`${u.firstName} ${u.lastName} ${u.googleEmail}`.toLowerCase().includes(ql)) return false;
      if (fStatus !== "tous" && u.status !== fStatus) return false;
      if (fSite !== "tous" && u.site !== fSite) return false;
      if (fProfile !== "tous" && u.licenseProfile !== fProfile) return false;
      if (onlyBig && u.mailboxSizeGB <= 50) return false;
      if (onlyVip && !u.vip) return false;
      if (onlyIssues && !hasError(userIssues(u, db.licenseTypes, db.users))) return false;
      return true;
    });
  }, [db, q, fStatus, fSite, fProfile, onlyBig, onlyIssues, onlyVip]);

  const { sorted, toggle, key, dir } = useSort(filtered, "lastName");
  const sort = { key, dir, toggle };

  const setProfile = (u: User, code: LicenseCode) => {
    patchUser(u.id, { licenseProfile: code, packBeCloud: code === "P1" ? u.packBeCloud : false });
  };

  const allSelected = sorted.length > 0 && sorted.every((u) => selected.has(u.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) sorted.forEach((u) => next.delete(u.id));
    else sorted.forEach((u) => next.add(u.id));
    setSelected(next);
  };

  return (
    <>
      <PageTitle
        title="Liste utilisateurs"
        subtitle={`${db.users.length} comptes · vue proche de l'onglet Excel « Liste Users »`}
        actions={
          <>
            <a href="/api/export/users-csv"><Button>⇩ CSV</Button></a>
            <a href="/api/export/pilotage-xlsx"><Button>⇩ XLSX pilotage</Button></a>
          </>
        }
      />

      {/* Filtres */}
      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <TextInput value={q} onChange={setQ} placeholder="🔍 Rechercher (nom, email)…" className="w-56" />
          <label className="text-xms text-slate-500">Statut</label>
          <Select value={fStatus} options={["tous", "actif", "ancien salarié", "boîte de service", "boîte technique", "à arbitrer"]} onChange={setFStatus} />
          <label className="text-xms text-slate-500">Site</label>
          <Select value={fSite} options={["tous", ...sites]} onChange={setFSite} />
          <label className="text-xms text-slate-500">Profil</label>
          <Select value={fProfile} options={["tous", "P1", "P2", "P3", "P4a", "P4b", "SHARED"]} onChange={setFProfile} />
          <label className="flex items-center gap-1 text-xms text-slate-600"><Checkbox checked={onlyBig} onChange={setOnlyBig} /> &gt; 50 Go</label>
          <label className="flex items-center gap-1 text-xms text-slate-600"><Checkbox checked={onlyVip} onChange={setOnlyVip} /> VIP</label>
          <label className="flex items-center gap-1 text-xms text-slate-600"><Checkbox checked={onlyIssues} onChange={setOnlyIssues} /> Incohérences</label>
          <label className="text-xms text-slate-500">Colonne</label>
          <Select
            value=""
            options={[{ value: "", label: "➕ Ajouter une colonne…" }, ...MAPPABLE_FIELDS.filter((f) => !customCols.includes(f.key)).map((f) => ({ value: f.key, label: f.label }))]}
            onChange={(v) => v && addColumn(v)}
          />
          <span className="ml-auto text-xms text-slate-500">{sorted.length} résultat(s)</span>
        </div>
      </Card>

      {selected.size > 0 && <BulkBar db={db} ids={[...selected]} onClear={() => setSelected(new Set())} />}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="grid-table">
          <thead>
            <tr>
              <th className="sticky-col w-8 text-center"><Checkbox checked={allSelected} onChange={toggleAll} /></th>
              <Th label="Prénom" sortKey="firstName" sort={sort} className="sticky-col" />
              <Th label="Nom" sortKey="lastName" sort={sort} />
              <Th label="Email" sortKey="googleEmail" sort={sort} />
              <Th label="Statut" sortKey="status" sort={sort} />
              <Th label="Site" sortKey="site" sort={sort} />
              <Th label="Dern. cnx" sortKey="lastGoogleSignIn" sort={sort} />
              <Th label="Go" sortKey="mailboxSizeGB" sort={sort} className="text-right" />
              <Th label="Licence" sortKey="licenseProfile" sort={sort} />
              <th className="text-center">Pack</th>
              <th className="text-center">MFA</th>
              <th className="text-center" title="Outlook Web">OWA</th>
              <th className="text-center" title="Outlook Desktop">Desk</th>
              <th className="text-center">Risque</th>
              <th className="text-center">⚠</th>
              <th>Coût/mois</th>
              {customCols.map((ck) => {
                const f = MAPPABLE_FIELDS.find((x) => x.key === ck);
                if (!f) return null;
                return (
                  <th key={ck} className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {f.label}
                      <button title="Retirer la colonne" onClick={() => removeColumn(ck)} className="text-slate-400 hover:text-statusRed">×</button>
                    </span>
                  </th>
                );
              })}
              <th className="text-center" title="Supprimer">Suppr.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const issues = userIssues(u, db.licenseTypes, db.users);
              const err = hasError(issues);
              const ss = storageStatus(u.mailboxSizeGB);
              return (
                <tr key={u.id} className={selected.has(u.id) ? "selected" : ""}>
                  <td className="sticky-col text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(u.id)} onChange={(b) => {
                      const next = new Set(selected); b ? next.add(u.id) : next.delete(u.id); setSelected(next);
                    }} />
                  </td>
                  <td className="sticky-col cursor-pointer font-medium text-navy-800" onClick={() => inspectUser(u.id)}>
                    {u.vip && <span title="VIP" className="mr-1 text-amber-500">★</span>}{u.firstName}
                  </td>
                  <td className="cursor-pointer" onClick={() => inspectUser(u.id)}>{u.lastName}</td>
                  <td className="text-slate-500">{u.googleEmail}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Select value={u.status} options={ACCOUNT_STATUSES} onChange={(v) => patchUser(u.id, { status: v as User["status"] })} className="w-full" />
                  </td>
                  <td><SiteLink site={u.site} /></td>
                  <td className="text-slate-500">{dateFr(u.lastGoogleSignIn)}</td>
                  <td className="text-right">
                    <span className={ss === "critique" ? "font-bold text-statusRed" : ss === "élevé" ? "font-semibold text-statusOrange" : ss === "à surveiller" ? "text-statusOrange" : ""}>{u.mailboxSizeGB}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Select value={u.licenseProfile} options={LICENSE_OPTS} onChange={(v) => setProfile(u, v as LicenseCode)} className="w-full" />
                  </td>
                  <td className="text-center"><Checkbox checked={u.packBeCloud} disabled={u.licenseProfile !== "P1"} onChange={(b) => patchUser(u.id, { packBeCloud: b })} /></td>
                  <td className="text-center"><Badge tone={u.mfa.configured ? "green" : u.mfa.blocked ? "red" : "orange"} title={u.mfa.status}>{u.mfa.configured ? "✓" : u.mfa.blocked ? "✕" : "…"}</Badge></td>
                  <td className="text-center"><Checkbox checked={u.usesOutlookWeb} onChange={(b) => patchUser(u.id, { usesOutlookWeb: b })} /></td>
                  <td className="text-center"><Checkbox checked={u.usesOutlookDesktop} onChange={(b) => patchUser(u.id, { usesOutlookDesktop: b })} /></td>
                  <td className="text-center"><Badge tone={riskTone(u.risk)}>{u.risk}</Badge></td>
                  <td className="text-center">{err ? <span title={issues.map((i) => i.message).join("\n")} className="cursor-help text-statusRed">⚠</span> : issues.length ? <span title={issues.map((i) => i.message).join("\n")} className="cursor-help text-statusOrange">●</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="font-medium">{eur(userMonthlyTotal(u, db.licenseTypes))}</td>
                  {customCols.map((ck) => {
                    const f = MAPPABLE_FIELDS.find((x) => x.key === ck);
                    return <td key={ck} className="whitespace-nowrap text-slate-600">{f ? f.get(u) : "—"}</td>;
                  })}
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      title={`Supprimer ${u.firstName} ${u.lastName}`}
                      className="rounded px-1.5 py-0.5 text-statusRed hover:bg-red-50"
                      onClick={() => { if (confirm(`Supprimer définitivement le compte « ${u.firstName} ${u.lastName} » (${u.googleEmail}) ?`)) deleteUser(u.id); }}
                    >🗑</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </>
  );
}

function BulkBar({ db, ids, onClear }: { db: Database; ids: string[]; onClear: () => void }) {
  const { patchUser, deleteUser } = useData();
  const apply = async (patch: Partial<User>) => {
    for (const id of ids) {
      const u = db.users.find((x) => x.id === id);
      if (!u) continue;
      // Pack BeCloud cohérent avec le profil
      const p = { ...patch };
      if ("licenseProfile" in p && p.licenseProfile !== "P1") p.packBeCloud = false;
      await patchUser(id, p);
    }
  };
  const bulkDelete = async () => {
    if (!confirm(`Supprimer définitivement ${ids.length} compte(s) ? Cette action est irréversible.`)) return;
    for (const id of ids) await deleteUser(id);
    onClear();
  };
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-xms">
      <span className="font-semibold text-navy-800">{ids.length} sélectionné(s) — édition en masse :</span>
      <Select value={"" as string} options={[{ value: "", label: "Profil licence…" }, { value: "P1", label: "P1 Business" }, { value: "P2", label: "P2 F3+Exch" }, { value: "P3", label: "P3 F3" }, { value: "P4a", label: "P4a Plan 1" }, { value: "P4b", label: "P4b Kiosk" }, { value: "SHARED", label: "Boîte partagée" }]} onChange={(v) => v && apply({ licenseProfile: v as LicenseCode })} />
      <Select value={"" as string} options={[{ value: "", label: "Statut compte…" }, ...ACCOUNT_STATUSES.map((s) => ({ value: s, label: s }))]} onChange={(v) => v && apply({ status: v as User["status"] })} />
      <Select value={"" as string} options={[{ value: "", label: "Migration…" }, { value: "copie lancée", label: "Copie lancée" }, { value: "copié", label: "Copié" }, { value: "basculé", label: "Basculé" }, { value: "reconnecté", label: "Reconnecté" }, { value: "validé", label: "Validé" }]} onChange={(v) => v && apply({ mailStatus: v as User["mailStatus"] })} />
      <Select value={"" as string} options={[{ value: "", label: "Risque…" }, { value: "vert", label: "Vert" }, { value: "orange", label: "Orange" }, { value: "rouge", label: "Rouge" }]} onChange={(v) => v && apply({ risk: v as User["risk"] })} />
      <Select value={"" as string} options={[{ value: "", label: "Engagement…" }, { value: "annuel", label: "Annuel" }, { value: "mensuel", label: "Mensuel" }]} onChange={(v) => v && apply({ engagement: v as User["engagement"] })} />
      <Button variant="danger" onClick={bulkDelete}>🗑 Supprimer ({ids.length})</Button>
      <Button variant="ghost" onClick={onClear}>Effacer la sélection</Button>
    </div>
  );
}
