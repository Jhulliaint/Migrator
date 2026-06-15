import { describe, it, expect } from "vitest";
import { storageStatus, applicableThreshold, exceedsLicenseCapacity, nearLicenseCapacity, countAbove } from "@/lib/domain/storage";
import { LICENSE_TYPES, user } from "./fixtures";

describe("storageStatus (seuils)", () => {
  it("RÈGLE : > 100 Go = critique", () => {
    expect(storageStatus(108)).toBe("critique");
    expect(storageStatus(131.58)).toBe("critique");
  });
  it("RÈGLE : > 50 Go = élevé", () => {
    expect(storageStatus(68.21)).toBe("élevé");
    expect(storageStatus(50.41)).toBe("élevé");
  });
  it("RÈGLE : 45–50 Go = à surveiller", () => {
    expect(storageStatus(45)).toBe("à surveiller");
    expect(storageStatus(49.9)).toBe("à surveiller");
  });
  it("≤ 45 Go (hors zone) = ok", () => {
    expect(storageStatus(44.9)).toBe("ok");
    expect(storageStatus(2)).toBe("ok");
  });
  it("bornes exactes", () => {
    expect(storageStatus(50)).toBe("à surveiller");
    expect(storageStatus(100)).toBe("élevé");
    expect(storageStatus(100.01)).toBe("critique");
  });
});

describe("applicableThreshold", () => {
  it("renvoie le seuil affiché", () => {
    expect(applicableThreshold(1)).toBe("2 Go");
    expect(applicableThreshold(30)).toBe("50 Go");
    expect(applicableThreshold(70)).toBe("100 Go");
    expect(applicableThreshold(120)).toBe("archive");
  });
});

describe("capacité de licence", () => {
  it("détecte le dépassement de capacité", () => {
    const u = user({ licenseProfile: "P4b", mailboxSizeGB: 10 }); // Kiosk 2 Go
    expect(exceedsLicenseCapacity(u, LICENSE_TYPES)).toBe(true);
    const ok = user({ licenseProfile: "P4a", mailboxSizeGB: 10 }); // Plan 1 50 Go
    expect(exceedsLicenseCapacity(ok, LICENSE_TYPES)).toBe(false);
  });
  it("tient compte du nettoyage effectué (taille cible)", () => {
    const u = user({ licenseProfile: "P4a", mailboxSizeGB: 68, targetSizeGB: 45, cleanupDone: true });
    expect(exceedsLicenseCapacity(u, LICENSE_TYPES)).toBe(false);
    const notDone = user({ licenseProfile: "P4a", mailboxSizeGB: 68, targetSizeGB: 45, cleanupDone: false });
    expect(exceedsLicenseCapacity(notDone, LICENSE_TYPES)).toBe(true);
  });
  it("nearLicenseCapacity détecte la proximité de limite", () => {
    expect(nearLicenseCapacity(user({ licenseProfile: "P4a", mailboxSizeGB: 47 }), LICENSE_TYPES)).toBe(true);
    expect(nearLicenseCapacity(user({ licenseProfile: "P4a", mailboxSizeGB: 20 }), LICENSE_TYPES)).toBe(false);
  });
});

describe("countAbove", () => {
  it("compte les boîtes au-dessus d'un seuil", () => {
    const users = [user({ mailboxSizeGB: 30 }), user({ mailboxSizeGB: 60 }), user({ mailboxSizeGB: 120 })];
    expect(countAbove(users, 50)).toBe(2);
    expect(countAbove(users, 100)).toBe(1);
  });
});
