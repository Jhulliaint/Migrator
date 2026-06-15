"use client";
import React, { useMemo, useState } from "react";
import { WithDb, PageTitle } from "@/components/ui/page";
import { Card, Badge, Select, Button } from "@/components/ui/primitives";
import type { Database } from "@/lib/types";
import { generateEmail, containsPassword, EMAIL_TEMPLATES, COMM_PROFILES, type EmailLang, type EmailTemplateKey } from "@/lib/domain/emails";

export default function CommunicationsPage() {
  return <WithDb>{(db) => <Inner db={db} />}</WithDb>;
}

function Inner({ db }: { db: Database }) {
  const [userId, setUserId] = useState(db.users[0]?.id ?? "");
  const [template, setTemplate] = useState<EmailTemplateKey>("compte_cree");
  const [lang, setLang] = useState<EmailLang>("fr");
  const [copied, setCopied] = useState(false);

  const user = db.users.find((u) => u.id === userId) ?? db.users[0];
  const cutover = db.milestones.find((m) => /DNS|bascul/i.test(m.title))?.date ?? null;

  const email = useMemo(
    () => (user ? generateEmail(user, template, lang, cutover) : { subject: "", body: "" }),
    [user, template, lang, cutover]
  );
  const safe = !containsPassword(email.subject + "\n" + email.body);

  const copy = async () => {
    await navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const download = () => {
    const blob = new Blob([`${email.subject}\n\n${email.body}`], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `email_${template}_${lang}_${user?.firstName ?? ""}.txt`;
    a.click();
  };

  // Profil de communication suggéré
  const suggested = user?.vip ? "vip"
    : user?.status === "ancien salarié" ? "ancien"
    : !user?.physicalUser ? "boutique"
    : user?.licenseProfile === "P1" ? "business"
    : user?.licenseProfile === "P3" || user?.licenseProfile === "P2" ? "f3"
    : ["Londres", "Japon", "Corée", "Chine", "Hong Kong"].includes(user?.site ?? "") ? "international"
    : "mail_seul";

  return (
    <>
      <PageTitle title="Communications" subtitle="Modèles d'emails FR / EN — sans mot de passe (canal séparé)" />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Paramètres" className="lg:col-span-1">
          <label className="mb-2 block text-xms font-medium text-slate-500">Utilisateur</label>
          <Select value={userId} options={db.users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))} onChange={setUserId} className="mb-3 w-full" />

          <label className="mb-2 block text-xms font-medium text-slate-500">Modèle</label>
          <Select value={template} options={EMAIL_TEMPLATES.map((t) => ({ value: t.key, label: lang === "fr" ? t.labelFr : t.labelEn }))} onChange={(v) => setTemplate(v as EmailTemplateKey)} className="mb-3 w-full" />

          <label className="mb-2 block text-xms font-medium text-slate-500">Langue</label>
          <div className="mb-3 flex gap-2">
            <Button variant={lang === "fr" ? "primary" : "default"} onClick={() => setLang("fr")}>Français</Button>
            <Button variant={lang === "en" ? "primary" : "default"} onClick={() => setLang("en")}>English</Button>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xms">
            <div>Profil de communication suggéré :</div>
            <Badge tone="navy">{COMM_PROFILES.find((p) => p.key === suggested)?.label}</Badge>
            <div className="mt-2 text-slate-500">Login utilisé : <code>{user?.microsoftEmail}</code></div>
            <div className="text-slate-500">Date de bascule : {cutover ?? "—"}</div>
          </div>
        </Card>

        <Card title="Aperçu de l'email" className="lg:col-span-2"
          right={
            <div className="flex items-center gap-2">
              <Badge tone={safe ? "green" : "red"}>{safe ? "✓ Aucun mot de passe" : "⚠ Mot de passe détecté"}</Badge>
              <Button onClick={copy}>{copied ? "Copié ✓" : "Copier"}</Button>
              <Button onClick={download}>Télécharger .txt</Button>
            </div>
          }>
          <div className="mb-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xms text-slate-500">Objet :</span> <span className="font-semibold text-navy-900">{email.subject}</span>
          </div>
          <pre className="whitespace-pre-wrap rounded border border-slate-200 bg-white p-3 text-xms leading-relaxed text-slate-800">{email.body}</pre>
          <p className="mt-2 text-[0.7rem] text-slate-400">Rappel : le mot de passe temporaire est transmis par un canal séparé — jamais inclus dans l'email.</p>
        </Card>
      </div>

      <Card title="Modèles disponibles" className="mt-3">
        <table className="grid-table">
          <thead><tr><th>Clé</th><th>Français</th><th>English</th></tr></thead>
          <tbody>
            {EMAIL_TEMPLATES.map((t) => (
              <tr key={t.key}><td className="font-mono text-[0.7rem]">{t.key}</td><td>{t.labelFr}</td><td>{t.labelEn}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
