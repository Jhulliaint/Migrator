// Fabrique d'utilisateurs avec valeurs par défaut (import + création manuelle).
import type { User, LicenseCode } from "@/lib/types";

export function makeUser(partial: Partial<User> & { firstName: string; lastName: string; googleEmail: string }): User {
  const email = partial.googleEmail;
  return {
    id: partial.id ?? `u${Date.now()}${Math.floor(Math.random() * 1000)}`,
    firstName: partial.firstName,
    lastName: partial.lastName,
    googleEmail: email,
    microsoftEmail: partial.microsoftEmail ?? email,
    status: partial.status ?? "actif",
    site: partial.site ?? "Paris",
    role: partial.role ?? "",
    phone: partial.phone ?? "",
    vip: partial.vip ?? false,
    physicalUser: partial.physicalUser ?? true,
    usesOutlookWeb: partial.usesOutlookWeb ?? true,
    usesOutlookDesktop: partial.usesOutlookDesktop ?? false,
    usesMobile: partial.usesMobile ?? false,
    officeApps: partial.officeApps ?? [],
    os: partial.os ?? "inconnu",
    lastGoogleSignIn: partial.lastGoogleSignIn ?? null,
    mailboxSizeGB: partial.mailboxSizeGB ?? 0,
    targetSizeGB: partial.targetSizeGB ?? null,
    cleanupRequested: partial.cleanupRequested ?? false,
    cleanupDone: partial.cleanupDone ?? false,
    mailStatus: partial.mailStatus ?? "non commencé",
    msAccountStatus: partial.msAccountStatus ?? "à prévenir",
    mfa: partial.mfa ?? {
      status: "non démarrée", method: "non défini", configured: false, configuredAt: null,
      blocked: false, needsAssistance: false, instructionSent: false, firstSignInDone: false,
    },
    commStatus: partial.commStatus ?? "non démarré",
    remarks: partial.remarks ?? "",
    linkedMailboxes: partial.linkedMailboxes ?? [],
    risk: partial.risk ?? "vert",
    licenseProfile: partial.licenseProfile ?? "P4a",
    engagement: partial.engagement ?? "annuel",
    payment: partial.payment ?? "mensuel",
    packBeCloud: partial.packBeCloud ?? false,
    mailbox: partial.mailbox ?? {
      typeCurrent: "utilisateur Google", typeTarget: "utilisateur Microsoft", members: [],
      memberRight: "accès complet", alias: [], autoSend: false, scanToMail: false,
      keepLicense: false, externalAccess: false, autoSignature: false, mfaException: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

/** Déduit un profil depuis les cases « licence » façon Excel. */
export function profileFromCheckboxes(cb: { business?: boolean; f3_50?: boolean; f3?: boolean; go50?: boolean; go2?: boolean }): LicenseCode {
  if (cb.business) return "P1";
  if (cb.f3_50) return "P2";
  if (cb.f3) return "P3";
  if (cb.go50) return "P4a";
  if (cb.go2) return "P4b";
  return "P4a";
}
