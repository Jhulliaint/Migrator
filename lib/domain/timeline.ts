// =============================================================================
//  Indicateurs de préparation du calendrier de migration (fonctions pures)
// =============================================================================
import type { User } from "@/lib/types";
import { exceedsLicenseCapacity } from "@/lib/domain/storage";
import type { LicenseType } from "@/lib/types";

export interface ReadinessKpis {
  usersReady: number; // mail validé
  mailboxesToClean: number; // nettoyage demandé non fait
  mfaNotDone: number; // utilisateurs physiques sans MFA
  over50: number;
  over100: number;
  licensesToUnassign: number; // boîtes sans usage humain avec licence payante
}

export function readinessKpis(users: User[], types: LicenseType[]): ReadinessKpis {
  return {
    usersReady: users.filter((u) => u.mailStatus === "validé").length,
    mailboxesToClean: users.filter((u) => u.cleanupRequested && !u.cleanupDone).length,
    mfaNotDone: users.filter((u) => u.physicalUser && !u.mfa.configured && !u.mailbox.mfaException).length,
    over50: users.filter((u) => u.mailboxSizeGB > 50).length,
    over100: users.filter((u) => u.mailboxSizeGB > 100).length,
    licensesToUnassign: users.filter(
      (u) => !u.physicalUser && u.licenseProfile !== "SHARED"
    ).length,
  };
}

/** Indique si une boîte serait au-dessus de la capacité de sa licence (raccourci). */
export function over(users: User[], types: LicenseType[]): User[] {
  return users.filter((u) => exceedsLicenseCapacity(u, types));
}
