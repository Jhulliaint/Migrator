// =============================================================================
//  Moteur de calcul des licences & coûts (fonctions pures, testées)
// =============================================================================
import type {
  User,
  LicenseType,
  LicenseCode,
  Engagement,
  Payment,
  Settings,
} from "@/lib/types";

/** Clé de prix à partir des dimensions engagement × paiement. */
export function priceKey(
  engagement: Engagement,
  payment: Payment
): "EA_PA" | "EA_PM" | "EM_PM" {
  if (engagement === "annuel" && payment === "annuel") return "EA_PA";
  if (engagement === "annuel" && payment === "mensuel") return "EA_PM";
  // Engagement mensuel ⇒ paiement mensuel (le seul valide / le plus flexible).
  return "EM_PM";
}

/** Retrouve le référentiel d'un profil. */
export function findLicense(
  code: LicenseCode,
  types: LicenseType[]
): LicenseType | undefined {
  return types.find((t) => t.code === code);
}

/** Coût mensuel de la licence seule pour un utilisateur (hors Pack BeCloud). */
export function monthlyLicenseCost(user: User, types: LicenseType[]): number {
  const lt = findLicense(user.licenseProfile, types);
  if (!lt) return 0;
  return lt.price[priceKey(user.engagement, user.payment)];
}

/**
 * Coût mensuel du Pack BeCloud pour un utilisateur.
 * RÈGLE : le Pack BeCloud ne s'applique QU'AUX Business Premium (P1).
 * Si le flag est coché sur un autre profil, il est ignoré (incohérence signalée
 * par ailleurs).
 */
export function packBeCloudCost(user: User, types: LicenseType[]): number {
  if (user.licenseProfile !== "P1") return 0;
  if (!user.packBeCloud) return 0;
  const lt = findLicense("P1", types);
  return lt ? lt.packBeCloud : 0;
}

/** Coût mensuel total d'un utilisateur (licence + Pack BeCloud). */
export function userMonthlyTotal(user: User, types: LicenseType[]): number {
  return round2(monthlyLicenseCost(user, types) + packBeCloudCost(user, types));
}

/** Coût annuel d'un utilisateur. */
export function userAnnualTotal(user: User, types: LicenseType[]): number {
  return round2(userMonthlyTotal(user, types) * 12);
}

/** Récapitulatif par profil. */
export interface ProfileSummaryRow {
  code: LicenseCode;
  label: string;
  count: number;
  monthly: number;
  annual: number;
}

export function summarizeByProfile(
  users: User[],
  types: LicenseType[]
): ProfileSummaryRow[] {
  const rows: ProfileSummaryRow[] = types.map((t) => ({
    code: t.code,
    label: t.label,
    count: 0,
    monthly: 0,
    annual: 0,
  }));
  const byCode = new Map(rows.map((r) => [r.code, r]));
  for (const u of users) {
    const row = byCode.get(u.licenseProfile);
    if (!row) continue;
    row.count += 1;
    row.monthly += userMonthlyTotal(u, types);
  }
  for (const r of rows) {
    r.monthly = round2(r.monthly);
    r.annual = round2(r.monthly * 12);
  }
  return rows;
}

/** Totaux globaux du parc. */
export interface ParkTotals {
  /** Nombre de licences comptées (hors boîtes partagées gratuites). */
  licensedCount: number;
  licenseMonthly: number; // licences seules
  packMonthly: number; // Pack BeCloud
  totalMonthly: number;
  totalAnnual: number;
}

export function parkTotals(users: User[], types: LicenseType[]): ParkTotals {
  let licenseMonthly = 0;
  let packMonthly = 0;
  let licensedCount = 0;
  for (const u of users) {
    const lt = findLicense(u.licenseProfile, types);
    if (lt && lt.countedInLicenses) licensedCount += 1;
    licenseMonthly += monthlyLicenseCost(u, types);
    packMonthly += packBeCloudCost(u, types);
  }
  const totalMonthly = round2(licenseMonthly + packMonthly);
  return {
    licensedCount,
    licenseMonthly: round2(licenseMonthly),
    packMonthly: round2(packMonthly),
    totalMonthly,
    totalAnnual: round2(totalMonthly * 12),
  };
}

/** Comparatif des 3 scénarios d'engagement (profils figés, dimensions variables). */
export interface ScenarioRow {
  key: "EA_PA" | "EA_PM" | "EM_PM";
  label: string;
  description: string;
  licensesMonthly: number;
  packMonthly: number;
  totalAnnual: number;
}

export function scenarioComparison(
  users: User[],
  types: LicenseType[]
): { rows: ScenarioRow[]; maxSaving: number } {
  const defs: { key: ScenarioRow["key"]; label: string; description: string }[] = [
    { key: "EA_PA", label: "EA-PA", description: "Engag. annuel + Paiement annuel (le + éco)" },
    { key: "EA_PM", label: "EA-PM", description: "Engag. annuel + Paiement mensuel (défaut)" },
    { key: "EM_PM", label: "EM-PM", description: "Engag. mensuel + Paiement mensuel (le + flexible)" },
  ];
  const rows: ScenarioRow[] = defs.map((d) => {
    let lic = 0;
    let pack = 0;
    for (const u of users) {
      const lt = findLicense(u.licenseProfile, types);
      if (!lt) continue;
      lic += lt.price[d.key];
      if (u.licenseProfile === "P1" && u.packBeCloud) pack += lt.packBeCloud;
    }
    return {
      key: d.key,
      label: d.label,
      description: d.description,
      licensesMonthly: round2(lic),
      packMonthly: round2(pack),
      totalAnnual: round2((lic + pack) * 12),
    };
  });
  const totals = rows.map((r) => r.totalAnnual);
  const maxSaving = round2(Math.max(...totals) - Math.min(...totals));
  return { rows, maxSaving };
}

/** Comparatif avec la situation actuelle Google Workspace + Dropbox. */
export interface GoogleComparison {
  googleMonthly: number;
  dropboxMonthly: number;
  currentMonthly: number;
  microsoftMonthly: number;
  monthlySaving: number;
  annualSaving: number;
}

export function googleComparison(
  users: User[],
  types: LicenseType[],
  settings: Settings
): GoogleComparison {
  const googleMonthly = round2(
    settings.googleWorkspacePerUser * settings.googleWorkspaceUsers
  );
  const dropboxMonthly = round2(settings.dropboxMonthly);
  const currentMonthly = round2(googleMonthly + dropboxMonthly);
  const microsoftMonthly = parkTotals(users, types).totalMonthly;
  const monthlySaving = round2(currentMonthly - microsoftMonthly);
  return {
    googleMonthly,
    dropboxMonthly,
    currentMonthly,
    microsoftMonthly,
    monthlySaving,
    annualSaving: round2(monthlySaving * 12),
  };
}

/** Impact financier d'un passage en boîte partagée (licence → 0 €). */
export function sharedMailboxSaving(user: User, types: LicenseType[]): number {
  return userMonthlyTotal(user, types); // gain mensuel = coût actuel évité
}

/** Différence € / an entre paiement mensuel et annuel pour un profil. */
export function monthlyVsAnnualDelta(
  code: LicenseCode,
  types: LicenseType[]
): number {
  const lt = findLicense(code, types);
  if (!lt) return 0;
  return round2((lt.price.EM_PM - lt.price.EA_PA) * 12);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
