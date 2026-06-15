"use client";
import React, { useMemo, useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Badge, Checkbox, Button, Select } from "@/components/ui/primitives";
import { useData } from "@/lib/store-client";
import { UserLink } from "@/components/inspector/links";
import type { Database, User } from "@/lib/types";

/** Verdict de l'assistant de décision « boîte partagée ». */
function sharedVerdict(u: User): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (u.mailboxSizeGB > 50) reasons.push("Dépasse 50 Go → la boîte partagée ne serait plus gratuite.");
  if (u.mailbox.autoSend) reasons.push("Envoi automatique nécessaire → requiert une licence (impossible en partagée pure).");
  if (u.mailbox.scanToMail) reasons.push("Scan-to-mail → requiert une licence Exchange.");
  if (u.mailbox.externalAccess) reasons.push("Accès externe requis → interdit pour une boîte partagée.");
  if (u.mailbox.keepLicense) reasons.push("Doit conserver une licence (besoin métier déclaré).");
  return { ok: reasons.length === 0, reasons };
}

export default function SharedPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const { patchUser } = useData();
  const candidates = useMemo(
    () => db.users.filter(
      (u) => u.licenseProfile === "SHARED" || u.mailbox.typeTarget === "boîte partagée" || !u.physicalUser || u.status === "ancien salarié"
    ),
    [db.users]
  );
  const [assistId, setAssistId] = useState<string>(candidates[0]?.id ?? "");
  const assistUser = db.users.find((u) => u.id === assistId);

  return (
    <>
      <PageTitle title="Boîtes partagées" subtitle="Anciennes boîtes salariés & boîtes de service : conversion, membres, droits, licence" />

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Assistant de décision" className="lg:col-span-1">
          <Select value={assistId} options={candidates.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName} · ${u.googleEmail}` }))} onChange={setAssistId} className="mb-3 w-full" />
          {assistUser && (
            <AssistPanel db={db} user={assistUser} onPatch={(p) => patchUser(assistUser.id, p)} />
          )}
        </Card>

        <Card title="Règles boîtes partagées" className="lg:col-span-2">
          <ul className="list-disc space-y-1 pl-5 text-xms text-slate-700">
            <li>Gratuite uniquement si elle reste <strong>sous 50 Go</strong>.</li>
            <li>Ne doit pas être accessible par des <strong>utilisateurs externes</strong> à l'organisation.</li>
            <li>Les membres doivent appartenir à l'organisation Microsoft et disposer d'une licence.</li>
            <li>Une boîte qui <strong>envoie automatiquement</strong> ou fait du <strong>scan-to-mail</strong> nécessite une licence.</li>
            <li>Ne jamais désattribuer une licence avant d'avoir vérifié que la boîte partagée cible est <strong>opérationnelle</strong>.</li>
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label="Candidates" value={candidates.length} />
            <Mini label="Convertibles gratuites" value={candidates.filter((u) => sharedVerdict(u).ok).length} tone="green" />
            <Mini label="À garder licence" value={candidates.filter((u) => !sharedVerdict(u).ok).length} tone="orange" />
          </div>
        </Card>
      </div>

      <Card title="Boîtes candidates à la conversion">
        <div className="overflow-x-auto">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-col">Email</th><th>Nom</th><th>Statut</th><th className="text-right">Go</th>
                <th>Membres</th><th>Droits</th><th>Alias</th><th className="text-center">Auto</th><th className="text-center">Scan</th>
                <th>Verdict</th><th>Action avant désattribution</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((u) => {
                const v = sharedVerdict(u);
                return (
                  <tr key={u.id}>
                    <td className="sticky-col font-medium text-navy-800"><UserLink id={u.id}>{u.googleEmail}</UserLink></td>
                    <td>{u.firstName} {u.lastName}</td>
                    <td><Badge tone="navy">{u.status}</Badge></td>
                    <td className="text-right">{u.mailboxSizeGB}</td>
                    <td className="text-slate-500">{u.mailbox.members.length || "—"}</td>
                    <td>{u.mailbox.memberRight}</td>
                    <td className="text-slate-500">{u.mailbox.alias.join(", ") || "—"}</td>
                    <td className="text-center">{u.mailbox.autoSend ? "✓" : ""}</td>
                    <td className="text-center">{u.mailbox.scanToMail ? "✓" : ""}</td>
                    <td><Badge tone={v.ok ? "green" : "orange"}>{v.ok ? "Partageable gratuite" : "Conserver licence"}</Badge></td>
                    <td className="text-slate-600">{v.ok ? "Vérifier boîte partagée OK, migrer membres, puis désattribuer" : v.reasons[0]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function AssistPanel({ db, user, onPatch }: { db: Database; user: User; onPatch: (p: Partial<User>) => void }) {
  const v = sharedVerdict(user);
  const Q = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) => (
    <label className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 text-xms text-slate-700">
      <span>{label}</span>
      <Checkbox checked={checked} onChange={onChange} />
    </label>
  );
  const set = (p: Partial<User["mailbox"]>) => onPatch({ mailbox: { ...user.mailbox, ...p } });
  return (
    <div>
      <Q label="Doit envoyer automatiquement des emails ?" checked={user.mailbox.autoSend} onChange={(b) => set({ autoSend: b })} />
      <Q label="Fait-elle du scan-to-mail ?" checked={user.mailbox.scanToMail} onChange={(b) => set({ scanToMail: b })} />
      <Q label="Des utilisateurs externes doivent y accéder ?" checked={user.mailbox.externalAccess} onChange={(b) => set({ externalAccess: b })} />
      <Q label="Signatures automatiques nécessaires ?" checked={user.mailbox.autoSignature} onChange={(b) => set({ autoSignature: b })} />
      <Q label="Faut-il conserver une licence ?" checked={user.mailbox.keepLicense} onChange={(b) => set({ keepLicense: b })} />
      <div className="mt-1 flex items-center justify-between py-1.5 text-xms">
        <span>Dépasse-t-elle 50 Go ?</span>
        <Badge tone={user.mailboxSizeGB > 50 ? "red" : "green"}>{user.mailboxSizeGB} Go</Badge>
      </div>

      <div className={`mt-3 rounded border p-2 text-xms ${v.ok ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="font-semibold">{v.ok ? "✓ Cette boîte peut devenir une boîte partagée gratuite." : "⚠ Conserver une licence."}</div>
        {!v.ok && <ul className="mt-1 list-disc pl-4 text-amber-700">{v.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
      </div>
      {v.ok && (
        <Button variant="primary" className="mt-2" onClick={() => onPatch({ licenseProfile: "SHARED", packBeCloud: false, mailbox: { ...user.mailbox, typeTarget: "boîte partagée" } })}>
          Convertir en boîte partagée
        </Button>
      )}
    </div>
  );
}

function Mini({ label, value, tone = "navy" }: { label: string; value: number; tone?: "navy" | "green" | "orange" }) {
  const c = { navy: "text-navy-900", green: "text-statusGreen", orange: "text-statusOrange" }[tone];
  return (
    <div className="rounded border border-slate-200 py-2">
      <div className={`text-lg font-bold ${c}`}>{value}</div>
      <div className="text-[0.7rem] text-slate-500">{label}</div>
    </div>
  );
}
