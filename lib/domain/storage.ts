// =============================================================================
//  Règles de stockage / capacité (fonctions pures, testées)
// =============================================================================
import type { User, LicenseType, LicenseCode, StorageThreshold } from "@/lib/types";
import { findLicense } from "@/lib/domain/licensing";

/** Statut de stockage d'une boîte. */
export type StorageStatus = "ok" | "à surveiller" | "élevé" | "critique";

/**
 * Évalue le statut d'une boîte selon sa taille.
 *  - > 100 Go      : critique
 *  - > 50 Go       : élevé
 *  - 45 à 50 Go    : à surveiller
 *  - sinon         : ok
 */
export function storageStatus(sizeGB: number): StorageStatus {
  if (sizeGB > 100) return "critique";
  if (sizeGB > 50) return "élevé";
  if (sizeGB >= 45) return "à surveiller";
  return "ok";
}

/** Seuil applicable affiché pour une boîte. */
export function applicableThreshold(sizeGB: number): StorageThreshold {
  if (sizeGB > 100) return "archive";
  if (sizeGB > 50) return "100 Go";
  if (sizeGB > 2) return "50 Go";
  return "2 Go";
}

/** Capacité (Go) du profil de licence. SHARED = 50 (gratuit sous 50). */
export function capacityForProfile(
  code: LicenseCode,
  types: LicenseType[]
): number {
  const lt = findLicense(code, types);
  return lt ? lt.storageGB : 0;
}

/**
 * La boîte dépasse-t-elle la capacité de sa licence ?
 * On compare la taille (ou la taille cible si nettoyage effectué) à la capacité.
 */
export function exceedsLicenseCapacity(
  user: User,
  types: LicenseType[]
): boolean {
  const capacity = capacityForProfile(user.licenseProfile, types);
  const effectiveSize =
    user.cleanupDone && user.targetSizeGB != null
      ? user.targetSizeGB
      : user.mailboxSizeGB;
  return effectiveSize > capacity;
}

/** La boîte est-elle proche de la limite de sa licence (>= 90 %) sans la dépasser ? */
export function nearLicenseCapacity(
  user: User,
  types: LicenseType[]
): boolean {
  const capacity = capacityForProfile(user.licenseProfile, types);
  if (capacity === 0) return false;
  const size = user.mailboxSizeGB;
  return size <= capacity && size >= capacity * 0.9;
}

/** Compte les boîtes au-dessus d'un seuil donné (Go). */
export function countAbove(users: User[], thresholdGB: number): number {
  return users.filter((u) => u.mailboxSizeGB > thresholdGB).length;
}
