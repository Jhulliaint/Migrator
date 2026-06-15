import type { User, LicenseType, Settings } from "@/lib/types";
import { makeUser } from "@/lib/domain/factory";

/** Référentiel de licences identique au seed (prix réels). */
export const LICENSE_TYPES: LicenseType[] = [
  { code: "P1", label: "Business Premium", storageGB: 50, price: { EA_PA: 19.1, EA_PM: 20.06, EM_PM: 22.92 }, packBeCloud: 42.5, countedInLicenses: true },
  { code: "P2", label: "F3 + Exchange Plan 1", storageGB: 50, price: { EA_PA: 10.4, EA_PM: 10.93, EM_PM: 12.48 }, packBeCloud: 0, countedInLicenses: true },
  { code: "P3", label: "M365 F3", storageGB: 2, price: { EA_PA: 6.9, EA_PM: 7.25, EM_PM: 8.28 }, packBeCloud: 0, countedInLicenses: true },
  { code: "P4a", label: "Exchange Plan 1", storageGB: 50, price: { EA_PA: 3.5, EA_PM: 3.68, EM_PM: 4.2 }, packBeCloud: 0, countedInLicenses: true },
  { code: "P4b", label: "Exchange Kiosk", storageGB: 2, price: { EA_PA: 1.73, EA_PM: 1.82, EM_PM: 2.08 }, packBeCloud: 0, countedInLicenses: true },
  { code: "SHARED", label: "Boîte partagée", storageGB: 50, price: { EA_PA: 0, EA_PM: 0, EM_PM: 0 }, packBeCloud: 0, countedInLicenses: false },
];

export const SETTINGS: Settings = {
  currency: "EUR", googleWorkspacePerUser: 15.6, googleWorkspaceUsers: 45, dropboxMonthly: 9.99,
  defaultEngagement: "annuel", defaultPayment: "mensuel", defaultAuthor: "Test", dnsProvider: "Gandi",
};

export function user(p: Partial<User> & { firstName?: string; lastName?: string; googleEmail?: string } = {}): User {
  return makeUser({ firstName: p.firstName ?? "Jean", lastName: p.lastName ?? "Test", googleEmail: p.googleEmail ?? "jean@corthay.com", ...p });
}
