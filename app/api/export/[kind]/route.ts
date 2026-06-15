import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getDb } from "@/lib/data/store";
import { userMonthlyTotal, userAnnualTotal, monthlyLicenseCost, packBeCloudCost } from "@/lib/domain/licensing";
import { computeAutoRisks } from "@/lib/domain/risks";
import { storageStatus } from "@/lib/domain/storage";
import type { Database } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function xlsxResponse(wb: XLSX.WorkBook, filename: string): NextResponse {
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvResponse(rows: (string | number)[][], filename: string): NextResponse {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function usersCsv(db: Database): NextResponse {
  const header = [
    "Prénom", "Nom", "Email Google", "Email Microsoft", "Statut", "Site",
    "Dernière connexion", "Taille boîte (Go)", "Profil", "Pack BeCloud",
    "Coût €/mois", "MFA", "Statut migration", "Risque",
  ];
  const rows = db.users.map((u) => [
    u.firstName, u.lastName, u.googleEmail, u.microsoftEmail, u.status, u.site,
    u.lastGoogleSignIn ?? "", u.mailboxSizeGB, u.licenseProfile,
    u.packBeCloud ? "Oui" : "Non", userMonthlyTotal(u, db.licenseTypes),
    u.mfa.status, u.mailStatus, u.risk,
  ]);
  return csvResponse([header, ...rows], "utilisateurs.csv");
}

function pilotageXlsx(db: Database): NextResponse {
  const wb = XLSX.utils.book_new();
  const usersSheet = db.users.map((u) => ({
    Prénom: u.firstName, Nom: u.lastName, Email: u.googleEmail, Statut: u.status,
    Site: u.site, "Taille (Go)": u.mailboxSizeGB, "Statut stockage": storageStatus(u.mailboxSizeGB),
    Profil: u.licenseProfile, Engagement: u.engagement, Paiement: u.payment,
    "Pack BeCloud": u.packBeCloud ? "Oui" : "Non",
    "Licence €/mois": monthlyLicenseCost(u, db.licenseTypes),
    "Pack €/mois": packBeCloudCost(u, db.licenseTypes),
    "Total €/mois": userMonthlyTotal(u, db.licenseTypes),
    "Total €/an": userAnnualTotal(u, db.licenseTypes),
    MFA: u.mfa.status, Migration: u.mailStatus, Communication: u.commStatus, Risque: u.risk,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersSheet), "Utilisateurs");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(db.tasks.map((t) => ({
      Titre: t.title, Catégorie: t.category, Responsable: t.owner, Priorité: t.priority,
      Statut: t.status, Échéance: t.dueDate ?? "", Entité: t.linkedEntity ?? "",
    }))),
    "Tâches"
  );
  const risks = [...db.risks, ...computeAutoRisks(db.users, db.licenseTypes, db.milestones)];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(risks.map((r) => ({
      Titre: r.title, Catégorie: r.category, Gravité: r.severity, Probabilité: r.probability,
      Score: r.score, Statut: r.status, Responsable: r.owner, Action: r.corrective,
    }))),
    "Risques"
  );
  return xlsxResponse(wb, "pilotage-becloud.xlsx");
}

function migrationXlsx(db: Database): NextResponse {
  const wb = XLSX.utils.book_new();

  // Utilisateurs (boîtes utilisateur Microsoft)
  const usersTarget = db.users.filter((u) => u.mailbox.typeTarget === "utilisateur Microsoft");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(usersTarget.map((u) => ({
      "Nom affiché": `${u.firstName} ${u.lastName}`.trim(),
      "Email": u.microsoftEmail, "Profil": u.licenseProfile, "Site": u.site,
      "Taille (Go)": u.mailboxSizeGB, "MFA": u.mfa.method,
    }))),
    "Utilisateurs"
  );

  // Boîtes aux lettres partagées
  const shared = db.users.filter(
    (u) => u.mailbox.typeTarget === "boîte partagée" || u.licenseProfile === "SHARED"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(shared.map((u) => ({
      "Email": u.microsoftEmail, "Nom affiché": `${u.firstName} ${u.lastName}`.trim(),
      "Taille (Go)": u.mailboxSizeGB, "Membres": u.mailbox.members.join("; "),
      "Droits": u.mailbox.memberRight, "Alias": u.mailbox.alias.join("; "),
    }))),
    "Boîtes partagées"
  );

  // Listes de distribution
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(db.distributionLists.map((d) => ({
      "Nom": d.name, "Adresse": d.address, "Membres internes": d.internalMembers.join("; "),
      "Membres externes": d.externalMembers.join("; "),
      "Expéditeurs externes": d.allowExternalSenders ? "Oui" : "Non", "Usage": d.usage,
    }))),
    "Listes de distribution"
  );

  // Boîtes ressources
  const resources = db.users.filter((u) => u.mailbox.typeTarget === "boîte ressource");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      resources.length
        ? resources.map((u) => ({ "Email": u.microsoftEmail, "Nom": `${u.firstName} ${u.lastName}`.trim() }))
        : [{ Email: "", Nom: "(aucune boîte ressource définie)" }]
    ),
    "Boîtes ressources"
  );

  // Domaines
  const domains = Array.from(new Set(db.users.map((u) => u.microsoftEmail.split("@")[1]).filter(Boolean)));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(domains.map((d) => ({ "Domaine": d, "Fournisseur DNS": db.settings.dnsProvider, "Statut": "à basculer" }))),
    "Domaines"
  );

  return xlsxResponse(wb, "migration-becloud.xlsx");
}

export async function GET(_req: NextRequest, { params }: { params: { kind: string } }) {
  const db = await getDb();
  switch (params.kind) {
    case "users-csv":
      return usersCsv(db);
    case "pilotage-xlsx":
      return pilotageXlsx(db);
    case "migration-xlsx":
      return migrationXlsx(db);
    default:
      return NextResponse.json({ error: "Type d'export inconnu" }, { status: 400 });
  }
}
