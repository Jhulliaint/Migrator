import { describe, it, expect } from "vitest";
import { userIssues, hasError } from "@/lib/domain/validation";
import { computeAutoRisks } from "@/lib/domain/risks";
import { generateEmail, containsPassword, EMAIL_TEMPLATES } from "@/lib/domain/emails";
import { LICENSE_TYPES, user } from "./fixtures";

describe("validation (incohérences)", () => {
  it("Pack BeCloud sur non-P1 = erreur", () => {
    const u = user({ licenseProfile: "P4a", packBeCloud: true });
    const issues = userIssues(u, LICENSE_TYPES);
    expect(issues.some((i) => i.code === "PACK_NON_P1" && i.level === "error")).toBe(true);
  });

  it("boîte > capacité de la licence = erreur", () => {
    const u = user({ licenseProfile: "P4b", mailboxSizeGB: 40 });
    expect(hasError(userIssues(u, LICENSE_TYPES))).toBe(true);
  });

  it("boîte partagée > 50 Go = erreur", () => {
    const u = user({ licenseProfile: "SHARED", mailboxSizeGB: 60 });
    expect(userIssues(u, LICENSE_TYPES).some((i) => i.code === "SHARED_OVER_50")).toBe(true);
  });

  it("boîte partagée avec accès externe = erreur", () => {
    const u = user({ licenseProfile: "SHARED", mailboxSizeGB: 10 });
    u.mailbox.externalAccess = true;
    expect(userIssues(u, LICENSE_TYPES).some((i) => i.code === "SHARED_EXTERNAL")).toBe(true);
  });
});

describe("risques automatiques", () => {
  it("RÈGLE : boîte > 100 Go génère un risque critique", () => {
    const u = user({ mailboxSizeGB: 116, licenseProfile: "P4a" });
    const risks = computeAutoRisks([u], LICENSE_TYPES, []);
    expect(risks.some((r) => r.category === "stockage" && r.severity === "critique")).toBe(true);
  });

  it("RÈGLE : VIP non validé génère un risque élevé", () => {
    const u = user({ vip: true, mailStatus: "copié" });
    const risks = computeAutoRisks([u], LICENSE_TYPES, []);
    expect(risks.some((r) => r.category === "utilisateur VIP" && r.severity === "élevé")).toBe(true);
  });

  it("RÈGLE : DNS non préparé = risque critique global", () => {
    const risks = computeAutoRisks([], LICENSE_TYPES, []);
    expect(risks.some((r) => r.category === "DNS" && r.severity === "critique")).toBe(true);
  });

  it("le score = gravité × probabilité", () => {
    const u = user({ mailboxSizeGB: 116 });
    const r = computeAutoRisks([u], LICENSE_TYPES, []).find((x) => x.severity === "critique")!;
    expect(r.score).toBe(4 * 5);
  });
});

describe("emails (sécurité)", () => {
  it("RÈGLE : aucun email généré ne contient de mot de passe", () => {
    const u = user({ firstName: "Alice" });
    for (const t of EMAIL_TEMPLATES) {
      for (const lang of ["fr", "en"] as const) {
        const e = generateEmail(u, t.key, lang, "2026-06-25");
        expect(containsPassword(e.subject + "\n" + e.body)).toBe(false);
        expect(e.body.toLowerCase()).not.toContain("mot de passe :");
      }
    }
  });

  it("mentionne le canal séparé et l'identifiant", () => {
    const u = user({ microsoftEmail: "alice@corthay.com" });
    const e = generateEmail(u, "compte_cree", "fr");
    expect(e.body).toContain("canal séparé");
    expect(e.body).toContain("alice@corthay.com");
  });

  it("containsPassword détecte bien un mot de passe explicite", () => {
    expect(containsPassword("Votre mot de passe : Az12!")).toBe(true);
    expect(containsPassword("password = secret")).toBe(true);
    expect(containsPassword("Bonjour, voici votre identifiant")).toBe(false);
  });
});
