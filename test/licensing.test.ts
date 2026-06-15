import { describe, it, expect } from "vitest";
import {
  monthlyLicenseCost,
  packBeCloudCost,
  userMonthlyTotal,
  parkTotals,
  scenarioComparison,
  googleComparison,
  priceKey,
} from "@/lib/domain/licensing";
import { LICENSE_TYPES, SETTINGS, user } from "./fixtures";

describe("priceKey", () => {
  it("mappe les dimensions engagement × paiement", () => {
    expect(priceKey("annuel", "annuel")).toBe("EA_PA");
    expect(priceKey("annuel", "mensuel")).toBe("EA_PM");
    expect(priceKey("mensuel", "mensuel")).toBe("EM_PM");
  });
});

describe("coût licence", () => {
  it("utilise le bon prix selon engagement/paiement", () => {
    const u = user({ licenseProfile: "P1", engagement: "annuel", payment: "mensuel" });
    expect(monthlyLicenseCost(u, LICENSE_TYPES)).toBe(20.06);
    const u2 = user({ licenseProfile: "P1", engagement: "mensuel", payment: "mensuel" });
    expect(monthlyLicenseCost(u2, LICENSE_TYPES)).toBe(22.92);
  });

  it("RÈGLE : le Pack BeCloud ne s'applique qu'au Business Premium (P1)", () => {
    const p1 = user({ licenseProfile: "P1", packBeCloud: true });
    expect(packBeCloudCost(p1, LICENSE_TYPES)).toBe(42.5);

    // Même flag coché sur un autre profil → ignoré
    const p4 = user({ licenseProfile: "P4a", packBeCloud: true });
    expect(packBeCloudCost(p4, LICENSE_TYPES)).toBe(0);
  });

  it("total = licence + pack", () => {
    const u = user({ licenseProfile: "P1", engagement: "annuel", payment: "mensuel", packBeCloud: true });
    expect(userMonthlyTotal(u, LICENSE_TYPES)).toBe(62.56); // 20.06 + 42.5
  });

  it("RÈGLE : une boîte partagée coûte 0 € et n'est pas comptée dans les licences", () => {
    const shared = user({ licenseProfile: "SHARED" });
    expect(userMonthlyTotal(shared, LICENSE_TYPES)).toBe(0);
    const totals = parkTotals([shared, user({ licenseProfile: "P1", packBeCloud: true })], LICENSE_TYPES);
    expect(totals.licensedCount).toBe(1); // seul le P1 est compté
  });
});

describe("totaux & scénarios", () => {
  const users = [
    user({ googleEmail: "a@x.com", licenseProfile: "P1", engagement: "annuel", payment: "mensuel", packBeCloud: true }),
    user({ googleEmail: "b@x.com", licenseProfile: "P4a", engagement: "mensuel", payment: "mensuel" }),
    user({ googleEmail: "c@x.com", licenseProfile: "SHARED" }),
  ];

  it("parkTotals additionne licences + pack", () => {
    const t = parkTotals(users, LICENSE_TYPES);
    expect(t.licenseMonthly).toBeCloseTo(20.06 + 4.2, 2);
    expect(t.packMonthly).toBe(42.5);
    expect(t.totalMonthly).toBeCloseTo(66.76, 2);
    expect(t.totalAnnual).toBeCloseTo(801.12, 2);
  });

  it("le scénario EA-PA est le moins cher, EM-PM le plus cher", () => {
    const { rows, maxSaving } = scenarioComparison(users, LICENSE_TYPES);
    const eapa = rows.find((r) => r.key === "EA_PA")!;
    const empm = rows.find((r) => r.key === "EM_PM")!;
    expect(eapa.totalAnnual).toBeLessThan(empm.totalAnnual);
    expect(maxSaving).toBeCloseTo(empm.totalAnnual - eapa.totalAnnual, 2);
  });
});

describe("comparatif Google", () => {
  it("calcule l'économie vs Google + Dropbox", () => {
    const users = [user({ licenseProfile: "P4a" })]; // 3.68 €/mois
    const g = googleComparison(users, LICENSE_TYPES, SETTINGS);
    expect(g.googleMonthly).toBeCloseTo(15.6 * 45, 2);
    expect(g.currentMonthly).toBeCloseTo(15.6 * 45 + 9.99, 2);
    expect(g.monthlySaving).toBeCloseTo(g.currentMonthly - 3.68, 2);
  });
});
