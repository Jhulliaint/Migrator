// =============================================================================
//  Registre des risques — génération automatique par règles (fonctions pures)
// =============================================================================
import type {
  User,
  LicenseType,
  Risk,
  RiskSeverity,
  Milestone,
} from "@/lib/types";
import { exceedsLicenseCapacity } from "@/lib/domain/storage";

const SEVERITY_WEIGHT: Record<RiskSeverity, number> = {
  faible: 1,
  moyen: 2,
  élevé: 3,
  critique: 4,
};

function mkRisk(
  partial: Omit<Risk, "id" | "score" | "auto">
): Risk {
  return {
    ...partial,
    id: `auto-${partial.category}-${partial.linkedEntity ?? "global"}-${partial.title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80),
    score: SEVERITY_WEIGHT[partial.severity] * partial.probability,
    auto: true,
  };
}

/**
 * Calcule les risques automatiques à partir de l'état du parc.
 * Règles (cf. cahier des charges §4.6) :
 *  - boîte > 100 Go                                  → critique
 *  - boîte > 50 Go sans nettoyage ni capacité suffisante → élevé
 *  - boîte partagée > 50 Go                          → élevé
 *  - utilisateur VIP non prêt                        → élevé
 *  - MFA non configurée (avant reconnexion)          → moyen / élevé
 *  - DNS non préparé avant le cutover                → critique
 *  - boîte automatique / scan sans licence           → élevé
 */
export function computeAutoRisks(
  users: User[],
  types: LicenseType[],
  milestones: Milestone[] = []
): Risk[] {
  const risks: Risk[] = [];

  const dnsMilestone = milestones.find((m) => /DNS/i.test(m.title));
  const dnsNotReady = dnsMilestone ? dnsMilestone.status !== "fait" : true;

  for (const u of users) {
    const name = `${u.firstName} ${u.lastName}`.trim();

    // Stockage
    if (u.mailboxSizeGB > 100) {
      risks.push(
        mkRisk({
          title: `Boîte critique ${fmt(u.mailboxSizeGB)} Go — ${name}`,
          category: "stockage",
          severity: "critique",
          probability: 5,
          status: u.cleanupDone ? "maîtrisé" : "ouvert",
          owner: "Julien",
          corrective:
            "Nettoyage/archivage indispensable ou Exchange Plan 2 (100 Go) avant migration.",
          dueDate: null,
          linkedEntity: u.googleEmail,
        })
      );
    } else if (u.mailboxSizeGB > 50 && !u.cleanupDone && exceedsLicenseCapacity(u, types)) {
      risks.push(
        mkRisk({
          title: `Boîte > 50 Go sans nettoyage — ${name}`,
          category: "stockage",
          severity: "élevé",
          probability: 4,
          status: "ouvert",
          owner: "Julien",
          corrective: "Nettoyage demandé ou bascule vers une licence à capacité supérieure.",
          dueDate: null,
          linkedEntity: u.googleEmail,
        })
      );
    }

    // Boîte partagée > 50 Go
    if (
      (u.licenseProfile === "SHARED" || u.mailbox.typeTarget === "boîte partagée") &&
      u.mailboxSizeGB > 50
    ) {
      risks.push(
        mkRisk({
          title: `Boîte partagée > 50 Go (non gratuite) — ${name}`,
          category: "stockage",
          severity: "élevé",
          probability: 4,
          status: "ouvert",
          owner: "Julien",
          corrective: "Réduire sous 50 Go ou conserver une licence Exchange.",
          dueDate: null,
          linkedEntity: u.googleEmail,
        })
      );
    }

    // VIP non prêt
    if (u.vip && u.mailStatus !== "validé") {
      risks.push(
        mkRisk({
          title: `Utilisateur VIP non validé — ${name}`,
          category: "utilisateur VIP",
          severity: "élevé",
          probability: 4,
          status: "ouvert",
          owner: "Julien",
          corrective: "Accompagnement prioritaire jusqu'à validation complète.",
          dueDate: null,
          linkedEntity: u.googleEmail,
        })
      );
    }

    // MFA non configurée avant reconnexion
    if (u.physicalUser && !u.mfa.configured && !u.mailbox.mfaException) {
      const reconnected = u.mailStatus === "reconnecté" || u.mailStatus === "validé";
      risks.push(
        mkRisk({
          title: `MFA non configurée — ${name}`,
          category: "MFA",
          severity: reconnected ? "élevé" : "moyen",
          probability: reconnected ? 4 : 3,
          status: u.mfa.blocked ? "ouvert" : "en cours",
          owner: u.mfa.needsAssistance ? "BeCloud" : "utilisateur",
          corrective: "Configurer Microsoft Authenticator ou SMS avant la reconnexion.",
          dueDate: null,
          linkedEntity: u.googleEmail,
        })
      );
    }

    // Boîte automatique / scan sans licence
    if ((u.mailbox.autoSend || u.mailbox.scanToMail) && u.licenseProfile === "SHARED") {
      risks.push(
        mkRisk({
          title: `Boîte automatique/scan sans licence — ${name}`,
          category: "scan-to-mail",
          severity: "élevé",
          probability: 4,
          status: "ouvert",
          owner: "Julien",
          corrective: "Attribuer une licence Exchange Plan 1 (envoi automatique impossible en boîte partagée).",
          dueDate: null,
          linkedEntity: u.googleEmail,
        })
      );
    }
  }

  // DNS non préparé avant cutover (global)
  if (dnsNotReady) {
    risks.push(
      mkRisk({
        title: "DNS / MX non préparé avant le basculement",
        category: "DNS",
        severity: "critique",
        probability: 4,
        status: "ouvert",
        owner: "BeCloud",
        corrective: "Préparer et valider les enregistrements MX/DNS avant l'étape de bascule.",
        dueDate: dnsMilestone ? dnsMilestone.date : null,
        linkedEntity: null,
      })
    );
  }

  return risks;
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}
