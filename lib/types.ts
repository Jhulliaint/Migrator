// =============================================================================
//  Types métier — pilotage migration Microsoft 365 / BeCloud (Groupe Corthay)
//  Aucune dépendance : partagé entre serveur, client et tests.
// =============================================================================

/** Codes de profils de licence (cf. onglet « Suivi Licences »). */
export type LicenseCode = "P1" | "P2" | "P3" | "P4a" | "P4b" | "SHARED";

/** Dimension d'engagement contractuel. */
export type Engagement = "annuel" | "mensuel";
/** Dimension de paiement. */
export type Payment = "annuel" | "mensuel";

/** Statut d'un compte. */
export type UserStatus =
  | "actif"
  | "ancien salarié"
  | "boîte technique"
  | "boîte de service"
  | "à arbitrer";

/** Niveau de risque (feu tricolore). */
export type RiskLevel = "vert" | "orange" | "rouge";

/** Statut de migration de la boîte mail. */
export type MailMigrationStatus =
  | "non commencé"
  | "copie lancée"
  | "copié"
  | "basculé"
  | "reconnecté"
  | "validé"
  | "problème";

/** Statut MFA. */
export type MfaStatus =
  | "non démarrée"
  | "à faire"
  | "configurée Authenticator"
  | "configurée SMS"
  | "bloquée";

/** Statut de communication utilisateur. */
export type CommStatus =
  | "non démarré"
  | "email envoyé"
  | "relancé"
  | "confirmé";

/** Système d'exploitation principal. */
export type OsType = "Windows" | "Mac" | "inconnu";

/** Type de boîte (état actuel). */
export type MailboxTypeCurrent =
  | "utilisateur Google"
  | "boîte service"
  | "ancien salarié"
  | "boutique"
  | "scan-to-mail"
  | "distribution"
  | "ressource";

/** Type de boîte (cible). */
export type MailboxTypeTarget =
  | "utilisateur Microsoft"
  | "boîte partagée"
  | "liste de distribution"
  | "boîte ressource"
  | "à supprimer"
  | "à archiver";

/** Seuil de stockage applicable. */
export type StorageThreshold = "2 Go" | "50 Go" | "100 Go" | "archive";

/** Droits d'un membre d'une boîte partagée. */
export type MailboxRight = "lecture seule" | "accès complet" | "envoyer en tant que";

// ---------------------------------------------------------------------------

/** Suivi MFA d'un utilisateur. */
export interface MfaInfo {
  status: MfaStatus;
  method: "Authenticator" | "SMS" | "non défini";
  configured: boolean;
  configuredAt?: string | null;
  blocked: boolean;
  needsAssistance: boolean;
  instructionSent: boolean;
  firstSignInDone: boolean;
}

/** Attributs spécifiques à la boîte mail (embarqués sur le compte). */
export interface MailboxInfo {
  typeCurrent: MailboxTypeCurrent;
  typeTarget: MailboxTypeTarget;
  /** Membres autorisés (emails internes) d'une boîte partagée. */
  members: string[];
  /** Droit appliqué aux membres. */
  memberRight: MailboxRight;
  alias: string[];
  /** Envoi automatique d'emails (peut nécessiter une licence). */
  autoSend: boolean;
  /** Boîte de type scan-to-mail. */
  scanToMail: boolean;
  /** Doit conserver une licence (impossible en boîte partagée pure). */
  keepLicense: boolean;
  /** Des utilisateurs externes doivent-ils y accéder ? (interdit en partagée) */
  externalAccess: boolean;
  /** Signature automatique nécessaire. */
  autoSignature: boolean;
  /** Exception MFA justifiée. */
  mfaException: boolean;
}

/** Compte / utilisateur — entité centrale. */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  /** Adresse Google actuelle. */
  googleEmail: string;
  /** Adresse Microsoft / Office 365 cible. */
  microsoftEmail: string;
  status: UserStatus;
  /** Pays / site : Paris, Manufacture, Londres, Hong Kong, Japon, Corée, Chine… */
  site: string;
  role: string;
  phone: string;
  vip: boolean;
  /** Utilisateur physique (vs boîte technique / service). */
  physicalUser: boolean;
  usesOutlookWeb: boolean;
  usesOutlookDesktop: boolean;
  usesMobile: boolean;
  os: OsType;
  lastGoogleSignIn: string | null;
  /** Taille actuelle de la boîte mail (Go). */
  mailboxSizeGB: number;
  /** Taille cible après nettoyage (Go). */
  targetSizeGB: number | null;
  cleanupRequested: boolean;
  cleanupDone: boolean;
  mailStatus: MailMigrationStatus;
  mfa: MfaInfo;
  commStatus: CommStatus;
  remarks: string;
  /** Liens vers boîtes partagées / boîtes d'activité associées. */
  linkedMailboxes: string[];
  risk: RiskLevel;

  // Licence
  licenseProfile: LicenseCode;
  engagement: Engagement;
  payment: Payment;
  /** Pack BeCloud (ne s'applique qu'aux Business Premium = P1). */
  packBeCloud: boolean;

  mailbox: MailboxInfo;

  updatedAt: string;
}

/** Référentiel d'un profil de licence (prix éditables dans Paramètres). */
export interface LicenseType {
  code: LicenseCode;
  label: string;
  /** Capacité de stockage incluse (Go). null = illimité/non applicable. */
  storageGB: number;
  /** Prix € HT / mois selon engagement × paiement. */
  price: {
    /** Engagement annuel + paiement annuel (le + économique). */
    EA_PA: number;
    /** Engagement annuel + paiement mensuel (défaut). */
    EA_PM: number;
    /** Engagement mensuel + paiement mensuel (le + flexible). */
    EM_PM: number;
  };
  /** Pack BeCloud applicable et son tarif (0 si non applicable). */
  packBeCloud: number;
  /** Compté dans le total des licences (false pour boîte partagée gratuite). */
  countedInLicenses: boolean;
}

/** Catégorie de tâche. */
export type TaskCategory =
  | "utilisateur"
  | "licence"
  | "DNS"
  | "MFA"
  | "nettoyage"
  | "boîte partagée"
  | "liste distribution"
  | "support"
  | "communication";

export type TaskOwner = "Julien" | "BeCloud" | "utilisateur" | "direction" | "autre";
export type TaskPriority = "basse" | "normale" | "haute" | "critique";
export type TaskStatus = "à faire" | "en cours" | "bloqué" | "terminé" | "annulé";

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  owner: TaskOwner;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  doneDate: string | null;
  /** Entité liée (email utilisateur / boîte). */
  linkedEntity: string | null;
  comment: string;
  reference: string;
}

/** Catégorie de risque. */
export type RiskCategory =
  | "stockage"
  | "licence"
  | "MFA"
  | "DNS"
  | "utilisateur VIP"
  | "boîte technique"
  | "scan-to-mail"
  | "communication"
  | "support"
  | "migration documentaire"
  | "sécurité";

export type RiskSeverity = "faible" | "moyen" | "élevé" | "critique";
export type RiskStatus = "ouvert" | "en cours" | "maîtrisé" | "clos";

export interface Risk {
  id: string;
  title: string;
  category: RiskCategory;
  severity: RiskSeverity;
  /** Probabilité 1..5. */
  probability: number;
  /** Score = gravité × probabilité. */
  score: number;
  status: RiskStatus;
  owner: string;
  corrective: string;
  dueDate: string | null;
  linkedEntity: string | null;
  /** true si généré automatiquement par les règles (non éditable). */
  auto: boolean;
}

/** Liste de distribution. */
export interface DistributionList {
  id: string;
  name: string;
  address: string;
  internalMembers: string[];
  externalMembers: string[];
  allowExternalSenders: boolean;
  usage: string;
  creationStatus: "à créer" | "en cours" | "créée";
  remarks: string;
}

/** Jalon du calendrier projet. */
export interface Milestone {
  id: string;
  step: number;
  title: string;
  date: string; // ISO
  startTime: string;
  endTime: string;
  status: "à venir" | "en cours" | "fait" | "à risque";
  dependencies: string[];
  blockingRisks: string;
}

/** Entrée du journal d'audit. */
export interface AuditEntry {
  id: string;
  date: string;
  author: string;
  action: string;
  entity: string;
  field: string;
  oldValue: string;
  newValue: string;
}

/** Paramètres globaux (comparatifs, défauts). */
export interface Settings {
  currency: string;
  /** Coût Google Workspace par utilisateur (€ / mois). */
  googleWorkspacePerUser: number;
  /** Nombre de comptes Google Workspace facturés actuellement. */
  googleWorkspaceUsers: number;
  /** Coût Dropbox mensuel actuel (€). */
  dropboxMonthly: number;
  defaultEngagement: Engagement;
  defaultPayment: Payment;
  /** Auteur par défaut des entrées d'audit (MVP). */
  defaultAuthor: string;
  /** Fournisseur DNS (Gandi / Wix selon dossier). */
  dnsProvider: string;
}

/** État complet de l'application (persisté en JSON). */
export interface Database {
  users: User[];
  licenseTypes: LicenseType[];
  tasks: Task[];
  risks: Risk[]; // risques manuels uniquement (les auto sont calculés)
  distributionLists: DistributionList[];
  milestones: Milestone[];
  auditLog: AuditEntry[];
  settings: Settings;
}
