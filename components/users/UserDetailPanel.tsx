"use client";
import React, { useEffect, useState } from "react";
import type { Database, User, LicenseCode, OfficeApp } from "@/lib/types";
import { SidePanel, Field, Select, Checkbox, TextInput, Button, Badge, StatusBadge } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import { userMonthlyTotal, userAnnualTotal } from "@/lib/domain/licensing";
import { userIssues } from "@/lib/domain/validation";
import { storageStatus } from "@/lib/domain/storage";
import { eur } from "@/lib/format";
import { UserLink, LicenseLink, SiteLink } from "@/components/inspector/links";

const LICENSE_OPTS: { value: LicenseCode; label: string }[] = [
  { value: "P1", label: "P1 · Business Premium (50 Go)" },
  { value: "P2", label: "P2 · F3 + Exchange Plan 1 (50 Go)" },
  { value: "P3", label: "P3 · Microsoft 365 F3 (2 Go)" },
  { value: "P4a", label: "P4a · Exchange Plan 1 (50 Go)" },
  { value: "P4b", label: "P4b · Exchange Kiosk (2 Go)" },
  { value: "SHARED", label: "Boîte partagée (gratuite)" },
];

const MS_ACCOUNT_STATUSES = ["à prévenir", "mot de passe envoyé", "première connexion faite", "connexion confirmée", "bloqué"] as const;
const OFFICE_APPS: OfficeApp[] = ["Outlook", "Word", "Excel", "PowerPoint", "Teams", "OneDrive", "SharePoint", "OneNote"];

export function UserDetailPanel({ db, userId, onClose, onBack }: { db: Database; userId: string | null; onClose: () => void; onBack?: () => void }) {
  const { patchUser, deleteUser } = useData();
  const user = db.users.find((u) => u.id === userId) ?? null;
  const [draft, setDraft] = useState<User | null>(user);

  useEffect(() => { setDraft(user); }, [userId, user]);

  if (!user || !draft) return null;

  const set = <K extends keyof User>(k: K, v: User[K]) => setDraft({ ...draft, [k]: v });
  const setMfa = (patch: Partial<User["mfa"]>) => setDraft({ ...draft, mfa: { ...draft.mfa, ...patch } });
  const setMbx = (patch: Partial<User["mailbox"]>) => setDraft({ ...draft, mailbox: { ...draft.mailbox, ...patch } });

  const issues = userIssues(draft, db.licenseTypes, db.users);
  const monthly = userMonthlyTotal(draft, db.licenseTypes);
  const annual = userAnnualTotal(draft, db.licenseTypes);
  const ss = storageStatus(draft.mailboxSizeGB);

  const save = async () => { await patchUser(user.id, draft); onClose(); };

  return (
    <SidePanel
      open
      title={`${user.firstName} ${user.lastName}`}
      onClose={onClose}
      onBack={onBack}
      footer={
        <div className="flex items-center justify-between">
          <Button variant="danger" onClick={async () => { if (confirm("Supprimer ce compte ?")) { await deleteUser(user.id); onClose(); } }}>Supprimer</Button>
          <div className="flex gap-2">
            <Button onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={save}>Enregistrer</Button>
          </div>
        </div>
      }
    >
      {/* Synthèse coût */}
      <div className="mb-3 flex items-center gap-3 rounded border border-navy-100 bg-navy-50 px-3 py-2 text-xms">
        <div><span className="text-slate-500">Coût /mois</span><div className="text-base font-bold text-navy-900">{eur(monthly)}</div></div>
        <div><span className="text-slate-500">Coût /an</span><div className="text-base font-bold text-navy-900">{eur(annual)}</div></div>
        <div className="ml-auto text-right">
          <span className="text-slate-500">Stockage</span>
          <div><Badge tone={ss === "critique" ? "red" : ss === "élevé" ? "orange" : ss === "à surveiller" ? "orange" : "green"}>{draft.mailboxSizeGB} Go · {ss}</Badge></div>
        </div>
      </div>

      {/* Relations (hyper-connectivité) */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xms">
        <span className="text-slate-500">Licence :</span> <LicenseLink code={draft.licenseProfile} />
        <span className="text-slate-500">Site :</span> <SiteLink site={draft.site} />
        {draft.mailbox.members.length > 0 && (
          <>
            <span className="text-slate-500">Membres :</span>
            {draft.mailbox.members.map((m) => <UserLink key={m} email={m}>{m}</UserLink>)}
          </>
        )}
        {draft.linkedMailboxes.length > 0 && (
          <>
            <span className="text-slate-500">Gère :</span>
            {draft.linkedMailboxes.map((m) => <UserLink key={m} email={m}>{m}</UserLink>)}
          </>
        )}
      </div>

      {issues.length > 0 && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-xms">
          <div className="mb-1 font-semibold text-amber-800">Incohérences détectées</div>
          <ul className="list-disc space-y-0.5 pl-4">
            {issues.map((i, k) => (
              <li key={k} className={i.level === "error" ? "text-red-700" : "text-amber-700"}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Identité">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Prénom"><TextInput value={draft.firstName} onChange={(v) => set("firstName", v)} className="w-full" /></Field>
          <Field label="Nom"><TextInput value={draft.lastName} onChange={(v) => set("lastName", v)} className="w-full" /></Field>
        </div>
        <Field label="Email Google (actuel)"><TextInput value={draft.googleEmail} onChange={(v) => set("googleEmail", v)} className="w-full" /></Field>
        <Field label="Email Microsoft (cible)"><TextInput value={draft.microsoftEmail} onChange={(v) => set("microsoftEmail", v)} className="w-full" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Statut"><Select value={draft.status} options={["actif", "ancien salarié", "boîte technique", "boîte de service", "à arbitrer"] as const} onChange={(v) => set("status", v)} className="w-full" /></Field>
          <Field label="Site / Pays"><TextInput value={draft.site} onChange={(v) => set("site", v)} className="w-full" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Rôle métier"><TextInput value={draft.role} onChange={(v) => set("role", v)} className="w-full" /></Field>
          <Field label="Téléphone"><TextInput value={draft.phone} onChange={(v) => set("phone", v)} className="w-full" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="VIP migration" v={draft.vip} on={(b) => set("vip", b)} />
          <Toggle label="Utilisateur physique" v={draft.physicalUser} on={(b) => set("physicalUser", b)} />
          <Toggle label="Outlook Web" v={draft.usesOutlookWeb} on={(b) => set("usesOutlookWeb", b)} />
          <Toggle label="Outlook Desktop" v={draft.usesOutlookDesktop} on={(b) => set("usesOutlookDesktop", b)} />
          <Toggle label="Mobile" v={draft.usesMobile} on={(b) => set("usesMobile", b)} />
          <Field label="Système"><Select value={draft.os} options={["Windows", "Mac", "inconnu"] as const} onChange={(v) => set("os", v)} className="w-full" /></Field>
        </div>
      </Section>

      <Section title="Boîte mail">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Taille actuelle (Go)"><TextInput type="number" value={draft.mailboxSizeGB} onChange={(v) => set("mailboxSizeGB", Number(v) || 0)} className="w-full" /></Field>
          <Field label="Taille cible (Go)"><TextInput type="number" value={draft.targetSizeGB ?? ""} onChange={(v) => set("targetSizeGB", v === "" ? null : Number(v))} className="w-full" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Type actuel"><Select value={draft.mailbox.typeCurrent} options={["utilisateur Google", "boîte service", "ancien salarié", "boutique", "scan-to-mail", "distribution", "ressource"] as const} onChange={(v) => setMbx({ typeCurrent: v })} className="w-full" /></Field>
          <Field label="Type cible"><Select value={draft.mailbox.typeTarget} options={["utilisateur Microsoft", "boîte partagée", "liste de distribution", "boîte ressource", "à supprimer", "à archiver"] as const} onChange={(v) => setMbx({ typeTarget: v })} className="w-full" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="Nettoyage demandé" v={draft.cleanupRequested} on={(b) => set("cleanupRequested", b)} />
          <Toggle label="Nettoyage fait" v={draft.cleanupDone} on={(b) => set("cleanupDone", b)} />
          <Toggle label="Envoi automatique" v={draft.mailbox.autoSend} on={(b) => setMbx({ autoSend: b })} />
          <Toggle label="Scan-to-mail" v={draft.mailbox.scanToMail} on={(b) => setMbx({ scanToMail: b })} />
          <Toggle label="Accès externe requis" v={draft.mailbox.externalAccess} on={(b) => setMbx({ externalAccess: b })} />
          <Toggle label="Signature auto" v={draft.mailbox.autoSignature} on={(b) => setMbx({ autoSignature: b })} />
        </div>
        <Field label="Membres autorisés (séparés par ;)"><TextInput value={draft.mailbox.members.join("; ")} onChange={(v) => setMbx({ members: v.split(";").map((s) => s.trim()).filter(Boolean) })} className="w-full" /></Field>
        <Field label="Droits membres"><Select value={draft.mailbox.memberRight} options={["lecture seule", "accès complet", "envoyer en tant que"] as const} onChange={(v) => setMbx({ memberRight: v })} className="w-full" /></Field>
        <Field label="Alias de la boîte"><AliasEditor value={draft.mailbox.alias} onChange={(next) => setMbx({ alias: next })} /></Field>
      </Section>

      <Section title="Licence">
        <Field label="Profil de licence"><Select value={draft.licenseProfile} options={LICENSE_OPTS} onChange={(v) => set("licenseProfile", v)} className="w-full" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Engagement"><Select value={draft.engagement} options={["annuel", "mensuel"] as const} onChange={(v) => set("engagement", v)} className="w-full" /></Field>
          <Field label="Paiement"><Select value={draft.payment} options={["annuel", "mensuel"] as const} onChange={(v) => set("payment", v)} className="w-full" /></Field>
        </div>
        <Toggle label="Pack BeCloud (Business Premium uniquement)" v={draft.packBeCloud} on={(b) => set("packBeCloud", b)} disabled={draft.licenseProfile !== "P1"} />
      </Section>

      <Section title="Migration & MFA">
        <Field label="Statut migration mail"><Select value={draft.mailStatus} options={["non commencé", "copie lancée", "copié", "basculé", "reconnecté", "validé", "problème"] as const} onChange={(v) => set("mailStatus", v)} className="w-full" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Statut MFA"><Select value={draft.mfa.status} options={["non démarrée", "à faire", "configurée Authenticator", "configurée SMS", "bloquée"] as const} onChange={(v) => setMfa({ status: v, configured: v.startsWith("configurée"), blocked: v === "bloquée" })} className="w-full" /></Field>
          <Field label="Méthode MFA"><Select value={draft.mfa.method} options={["Authenticator", "SMS", "non défini"] as const} onChange={(v) => setMfa({ method: v })} className="w-full" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="Besoin d'assistance" v={draft.mfa.needsAssistance} on={(b) => setMfa({ needsAssistance: b })} />
          <Toggle label="Instruction envoyée" v={draft.mfa.instructionSent} on={(b) => setMfa({ instructionSent: b })} />
          <Toggle label="1ère connexion faite" v={draft.mfa.firstSignInDone} on={(b) => setMfa({ firstSignInDone: b })} />
          <Toggle label="Exception MFA justifiée" v={draft.mailbox.mfaException} on={(b) => setMbx({ mfaException: b })} />
        </div>
        <Field label="Statut communication"><Select value={draft.commStatus} options={["non démarré", "email envoyé", "relancé", "confirmé"] as const} onChange={(v) => set("commStatus", v)} className="w-full" /></Field>
      </Section>

      <Section title="Compte Microsoft & applications">
        <Field label="Statut de connexion au compte Microsoft">
          <Select value={draft.msAccountStatus} options={MS_ACCOUNT_STATUSES} onChange={(v) => set("msAccountStatus", v)} className="w-full" />
        </Field>
        <Field label="Applications Office utilisées">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {OFFICE_APPS.map((app) => (
              <Toggle key={app} label={app} v={draft.officeApps.includes(app)} on={(b) => set("officeApps", b ? [...draft.officeApps, app] : draft.officeApps.filter((a) => a !== app))} />
            ))}
          </div>
        </Field>
      </Section>

      {draft.physicalUser && (
        <Section title="Comptes non humains gérés / accès">
          <p className="mb-1 text-[0.7rem] text-slate-500">Boîtes partagées, de service ou techniques que cette personne gère ou auxquelles elle a accès.</p>
          <ManagedAccountsEditor db={db} value={draft.linkedMailboxes} onChange={(next) => set("linkedMailboxes", next)} />
        </Section>
      )}

      <Section title="Risque & remarques">
        <Field label="Statut risque"><Select value={draft.risk} options={[{ value: "vert", label: "Vert" }, { value: "orange", label: "Orange" }, { value: "rouge", label: "Rouge" }] as const} onChange={(v) => set("risk", v)} className="w-full" /></Field>
        <Field label="Remarques"><textarea value={draft.remarks} onChange={(e) => set("remarks", e.target.value)} rows={3} className="w-full rounded border border-slate-300 px-2 py-1 text-xms outline-none focus:border-navy-600" /></Field>
        <div className="text-[0.7rem] text-slate-400">Dernière connexion Google : <StatusBadge value={draft.lastGoogleSignIn ?? "—"} /></div>
      </Section>
    </SidePanel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 border-b border-slate-200 pb-1 text-xms font-semibold uppercase tracking-wide text-navy-700">{title}</h4>
      {children}
    </div>
  );
}

/** Sélection des comptes non humains (boîtes partagées/service/technique) gérés par un humain. */
function ManagedAccountsEditor({ db, value, onChange }: { db: Database; value: string[]; onChange: (next: string[]) => void }) {
  const accounts = db.users
    .filter((u) => !u.physicalUser || u.mailbox.typeTarget === "boîte partagée" || u.licenseProfile === "SHARED")
    .sort((a, b) => a.googleEmail.localeCompare(b.googleEmail));
  const known = new Set(accounts.map((u) => u.googleEmail));
  const extra = value.filter((e) => !known.has(e)); // comptes liés hors référentiel (ex. externes)
  const toggle = (email: string, on: boolean) => onChange(on ? [...value, email] : value.filter((e) => e !== email));
  return (
    <div className="max-h-48 space-y-0.5 overflow-y-auto rounded border border-slate-200 p-1.5">
      {accounts.length === 0 && extra.length === 0 && <span className="text-xms text-slate-400">Aucun compte non humain au référentiel.</span>}
      {accounts.map((u) => (
        <label key={u.id} className="flex items-center gap-2 py-0.5 text-xms text-slate-700">
          <Checkbox checked={value.includes(u.googleEmail)} onChange={(b) => toggle(u.googleEmail, b)} />
          <span className="font-medium text-navy-800">{u.googleEmail}</span>
          <span className="truncate text-slate-400">{`${u.firstName} ${u.lastName}`.trim()}</span>
        </label>
      ))}
      {extra.map((e) => (
        <label key={e} className="flex items-center gap-2 py-0.5 text-xms text-slate-700">
          <Checkbox checked onChange={() => toggle(e, false)} />
          <span className="font-medium text-navy-800">{e}</span>
          <span className="text-slate-400">(hors référentiel)</span>
        </label>
      ))}
    </div>
  );
}

/** Édition d'une liste d'alias : ajout via champ + bouton, suppression par puce. */
function AliasEditor({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const a = input.trim().toLowerCase();
    if (!a) return;
    if (!value.includes(a)) onChange([...value, a]);
    setInput("");
  };
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-1">
        {value.length === 0 && <span className="text-xms text-slate-400">Aucun alias.</span>}
        {value.map((a) => (
          <span key={a} className="inline-flex items-center gap-1 rounded border border-navy-200 bg-navy-50 px-1.5 py-0.5 text-xms text-navy-800">
            {a}
            <button type="button" title="Retirer l'alias" onClick={() => onChange(value.filter((x) => x !== a))} className="leading-none text-slate-400 hover:text-statusRed">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <TextInput value={input} onChange={setInput} placeholder="nouvel.alias@corthay.com" className="w-full" />
        <Button onClick={add}>+ Ajouter</Button>
      </div>
    </div>
  );
}

function Toggle({ label, v, on, disabled }: { label: string; v: boolean; on: (b: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2 py-0.5 text-xms text-slate-700">
      <Checkbox checked={v} onChange={on} disabled={disabled} />
      {label}
    </label>
  );
}
