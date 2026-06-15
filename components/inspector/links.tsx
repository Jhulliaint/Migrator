"use client";
import React from "react";
import { useData } from "@/lib/store-client";
import { useInspector } from "@/lib/inspector";
import { Badge } from "@/components/ui/primitives";

const LINK = "cursor-pointer text-navy-700 underline decoration-dotted underline-offset-2 hover:text-navy-900 hover:decoration-solid";

/** Lien vers la fiche d'un utilisateur (par id ou par email). */
export function UserLink({ id, email, children }: { id?: string; email?: string; children?: React.ReactNode }) {
  const { db } = useData();
  const { inspectUser } = useInspector();
  const user = db?.users.find((u) =>
    (id && u.id === id) || (email && (u.googleEmail.toLowerCase() === email.toLowerCase() || u.microsoftEmail.toLowerCase() === email.toLowerCase()))
  );
  const label = children ?? (user ? `${user.firstName} ${user.lastName}`.trim() : email ?? id);
  if (!user) return <span className="text-slate-500">{label}</span>; // non résolu → texte simple
  return (
    <button type="button" className={LINK} title="Ouvrir la fiche utilisateur" onClick={(e) => { e.stopPropagation(); inspectUser(user.id); }}>
      {label}
    </button>
  );
}

/** Référence générique : si l'email correspond à un utilisateur → lien, sinon texte. */
export function EntityLink({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return <UserLink email={value}>{value}</UserLink>;
}

/** Badge licence cliquable → fiche licence. */
export function LicenseLink({ code, tone }: { code: string; tone?: "navy" | "blue" | "gray" }) {
  const { inspectLicense } = useInspector();
  const t = tone ?? (code === "P1" ? "navy" : code === "SHARED" ? "gray" : "blue");
  return (
    <button type="button" className="cursor-pointer" title="Ouvrir la fiche licence" onClick={(e) => { e.stopPropagation(); inspectLicense(code); }}>
      <Badge tone={t}>{code}</Badge>
    </button>
  );
}

/** Site / pays cliquable → fiche site. */
export function SiteLink({ site }: { site: string }) {
  const { inspectSite } = useInspector();
  if (!site) return <span className="text-slate-400">—</span>;
  return (
    <button type="button" className={LINK} title="Ouvrir la fiche site" onClick={(e) => { e.stopPropagation(); inspectSite(site); }}>
      {site}
    </button>
  );
}
