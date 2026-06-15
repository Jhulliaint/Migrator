// =============================================================================
//  Règles de cohérence / validation (fonctions pures, testées)
//  Produit des « avertissements » exploitables par l'UI (badges rouges/orange).
// =============================================================================
import type { User, LicenseType } from "@/lib/types";
import { exceedsLicenseCapacity, nearLicenseCapacity } from "@/lib/domain/storage";

export type IssueLevel = "error" | "warning";

export interface Issue {
  level: IssueLevel;
  code: string;
  message: string;
}

/**
 * Renvoie la liste des incohérences pour un utilisateur.
 * Sert à l'affichage des indications visuelles dans la vue « Liste utilisateurs »
 * et la vue « Suivi licences ».
 */
export function userIssues(
  user: User,
  types: LicenseType[],
  allUsers: User[] = []
): Issue[] {
  const issues: Issue[] = [];

  // Pack BeCloud uniquement sur Business Premium (P1).
  if (user.packBeCloud && user.licenseProfile !== "P1") {
    issues.push({
      level: "error",
      code: "PACK_NON_P1",
      message: "Pack BeCloud coché sur une licence non Business Premium.",
    });
  }

  // Boîte > capacité de la licence.
  if (exceedsLicenseCapacity(user, types)) {
    issues.push({
      level: "error",
      code: "OVER_CAPACITY",
      message: `Boîte de ${fmt(user.mailboxSizeGB)} Go > capacité de la licence ${user.licenseProfile}.`,
    });
  } else if (nearLicenseCapacity(user, types)) {
    issues.push({
      level: "warning",
      code: "NEAR_CAPACITY",
      message: "Boîte proche de la capacité de la licence.",
    });
  }

  // Boîte partagée : règles spécifiques.
  if (user.licenseProfile === "SHARED" || user.mailbox.typeTarget === "boîte partagée") {
    if (user.mailbox.externalAccess) {
      issues.push({
        level: "error",
        code: "SHARED_EXTERNAL",
        message: "Une boîte partagée ne doit pas être accessible par des utilisateurs externes.",
      });
    }
    if (user.mailboxSizeGB > 50) {
      issues.push({
        level: "error",
        code: "SHARED_OVER_50",
        message: "Boîte partagée > 50 Go : elle n'est plus gratuite.",
      });
    }
    // Membres : doivent appartenir à l'organisation Microsoft (présents dans le parc).
    const known = new Set(allUsers.map((u) => u.microsoftEmail.toLowerCase()));
    for (const m of user.mailbox.members) {
      if (m && allUsers.length > 0 && !known.has(m.toLowerCase())) {
        issues.push({
          level: "warning",
          code: "SHARED_MEMBER_UNKNOWN",
          message: `Membre « ${m} » hors organisation Microsoft.`,
        });
      }
    }
  }

  // Envoi automatique / scan-to-mail sans licence (boîte partagée ne peut pas envoyer auto).
  if ((user.mailbox.autoSend || user.mailbox.scanToMail) && user.licenseProfile === "SHARED") {
    issues.push({
      level: "warning",
      code: "AUTOSEND_NO_LICENSE",
      message: "Envoi automatique / scan-to-mail : une licence (Exchange Plan 1) est probablement requise.",
    });
  }

  // Suggestion : boîte sans usage humain qui conserve une licence payante.
  if (!user.physicalUser && user.licenseProfile !== "SHARED" && user.mailboxSizeGB <= 50 && !user.mailbox.autoSend && !user.mailbox.scanToMail) {
    issues.push({
      level: "warning",
      code: "STUDY_SHARED",
      message: "Boîte sans usage humain avec licence payante : étudier le passage en boîte partagée.",
    });
  }

  return issues;
}

/** Vrai s'il existe au moins une erreur (rouge). */
export function hasError(issues: Issue[]): boolean {
  return issues.some((i) => i.level === "error");
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}
