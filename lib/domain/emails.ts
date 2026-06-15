// =============================================================================
//  Générateur de modèles d'emails utilisateur (FR / EN)
//  RÈGLE DE SÉCURITÉ : ne JAMAIS inclure de mot de passe.
//  On mentionne uniquement « transmis par un canal séparé ».
// =============================================================================
import type { User } from "@/lib/types";

export type EmailLang = "fr" | "en";

export type EmailTemplateKey =
  | "compte_cree"
  | "premiere_connexion"
  | "mfa"
  | "date_bascule"
  | "reconnexion_outlook"
  | "relance";

export interface EmailProfileDef {
  key: string;
  label: string;
}

/** Profils de communication (cf. §4.7). */
export const COMM_PROFILES: EmailProfileDef[] = [
  { key: "business", label: "Utilisateur Business Premium" },
  { key: "f3", label: "Utilisateur F3" },
  { key: "mail_seul", label: "Utilisateur mail seul" },
  { key: "international", label: "Utilisateur international (anglophone)" },
  { key: "boutique", label: "Utilisateur boutique" },
  { key: "vip", label: "Utilisateur VIP" },
  { key: "ancien", label: "Ancien salarié / boîte reprise" },
  { key: "manager", label: "Manager supervisant plusieurs boîtes" },
];

export const EMAIL_TEMPLATES: { key: EmailTemplateKey; labelFr: string; labelEn: string }[] = [
  { key: "compte_cree", labelFr: "Annonce création du compte Microsoft 365", labelEn: "Microsoft 365 account created" },
  { key: "premiere_connexion", labelFr: "Première connexion", labelEn: "First sign-in" },
  { key: "mfa", labelFr: "Activation de la MFA", labelEn: "Enabling MFA" },
  { key: "date_bascule", labelFr: "Annonce date de bascule mail", labelEn: "Mail cutover date" },
  { key: "reconnexion_outlook", labelFr: "Reconnexion Outlook", labelEn: "Reconnecting Outlook" },
  { key: "relance", labelFr: "Relance (confirmation manquante)", labelEn: "Reminder (no confirmation)" },
];

export interface GeneratedEmail {
  subject: string;
  body: string;
}

const PASSWORD_NOTE_FR =
  "Votre mot de passe temporaire vous sera transmis par un canal séparé (il n'est jamais envoyé par email).";
const PASSWORD_NOTE_EN =
  "Your temporary password will be provided through a separate channel (it is never sent by email).";

const MFA_NOTE_FR =
  "La MFA (authentification à plusieurs facteurs) ajoute une couche de sécurité : en plus de votre mot de passe, une seconde preuve d'identité est demandée (application Microsoft Authenticator ou code SMS).";
const MFA_NOTE_EN =
  "MFA (multi-factor authentication) adds a layer of security: in addition to your password, a second proof of identity is required (Microsoft Authenticator app or SMS code).";

const OWA_URL = "https://outlook.office.com";

function fmtDate(iso: string | null, lang: EmailLang): string {
  if (!iso) return lang === "fr" ? "(à confirmer)" : "(to be confirmed)";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Génère un email pour un utilisateur, un modèle et une langue.
 * `cutoverDate` est la date de bascule mail (jalon), facultative.
 */
export function generateEmail(
  user: User,
  template: EmailTemplateKey,
  lang: EmailLang,
  cutoverDate: string | null = null
): GeneratedEmail {
  const login = user.microsoftEmail || user.googleEmail;
  const first = user.firstName || "";
  const helloFr = `Bonjour ${first},`;
  const helloEn = `Hello ${first},`;
  const signFr = "\n\nBien cordialement,\nL'équipe IT — Groupe Corthay";
  const signEn = "\n\nKind regards,\nIT Team — Corthay Group";

  if (lang === "fr") {
    return frTemplate();
  }
  return enTemplate();

  function frTemplate(): GeneratedEmail {
    switch (template) {
      case "compte_cree":
        return {
          subject: "Votre compte Microsoft 365 a été créé",
          body: `${helloFr}

Dans le cadre de la migration vers Microsoft 365, votre compte a été créé.

• Identifiant (login) : ${login}
• ${PASSWORD_NOTE_FR}

Vous accéderez à votre messagerie via Outlook sur le web : ${OWA_URL}

${MFA_NOTE_FR}${signFr}`,
        };
      case "premiere_connexion":
        return {
          subject: "Première connexion à Microsoft 365",
          body: `${helloFr}

Voici comment réaliser votre première connexion :

1. Rendez-vous sur ${OWA_URL}
2. Saisissez votre identifiant : ${login}
3. ${PASSWORD_NOTE_FR}
4. Vous serez invité(e) à configurer la MFA (voir ci-dessous).

${MFA_NOTE_FR}${signFr}`,
        };
      case "mfa":
        return {
          subject: "Activation de la double authentification (MFA)",
          body: `${helloFr}

${MFA_NOTE_FR}

Étapes :
1. Installez « Microsoft Authenticator » sur votre téléphone (ou choisissez la réception par SMS).
2. Connectez-vous sur ${OWA_URL} avec votre identifiant ${login}.
3. Suivez l'assistant pour enregistrer votre méthode.

En cas de difficulté, répondez à cet email : nous vous accompagnerons.${signFr}`,
        };
      case "date_bascule":
        return {
          subject: "Date de bascule de votre messagerie",
          body: `${helloFr}

La bascule de votre messagerie vers Microsoft 365 est prévue le ${fmtDate(cutoverDate, "fr")}.

Important : à partir de cette date, ne travaillez plus dans votre ancienne boîte Google.
Vos emails, contacts et calendriers auront été migrés.

Vous vous reconnecterez ensuite via Outlook (web ou application).${signFr}`,
        };
      case "reconnexion_outlook":
        return {
          subject: "Reconnexion de votre messagerie sur Outlook",
          body: `${helloFr}

La bascule est effectuée. Merci de reconnecter votre messagerie :

• Outlook sur le web : ${OWA_URL} (identifiant ${login})
• Outlook application : ajoutez le compte ${login} puis authentifiez-vous.

Vérifiez l'envoi et la réception d'un email de test, ainsi que la présence de votre historique.
En cas de problème, répondez à cet email.${signFr}`,
        };
      case "relance":
        return {
          subject: "Rappel — confirmation de votre migration",
          body: `${helloFr}

Nous n'avons pas encore reçu la confirmation de votre première connexion / reconnexion à Microsoft 365.

Merci de réaliser cette étape dès que possible (identifiant ${login}, ${OWA_URL}) et de nous confirmer en réponse à cet email.${signFr}`,
        };
    }
  }

  function enTemplate(): GeneratedEmail {
    switch (template) {
      case "compte_cree":
        return {
          subject: "Your Microsoft 365 account has been created",
          body: `${helloEn}

As part of the migration to Microsoft 365, your account has been created.

• Login: ${login}
• ${PASSWORD_NOTE_EN}

You will access your mailbox via Outlook on the web: ${OWA_URL}

${MFA_NOTE_EN}${signEn}`,
        };
      case "premiere_connexion":
        return {
          subject: "First sign-in to Microsoft 365",
          body: `${helloEn}

Here is how to complete your first sign-in:

1. Go to ${OWA_URL}
2. Enter your login: ${login}
3. ${PASSWORD_NOTE_EN}
4. You will be prompted to set up MFA (see below).

${MFA_NOTE_EN}${signEn}`,
        };
      case "mfa":
        return {
          subject: "Enabling multi-factor authentication (MFA)",
          body: `${helloEn}

${MFA_NOTE_EN}

Steps:
1. Install "Microsoft Authenticator" on your phone (or choose SMS).
2. Sign in at ${OWA_URL} with your login ${login}.
3. Follow the wizard to register your method.

If you run into any issue, just reply to this email and we will help.${signEn}`,
        };
      case "date_bascule":
        return {
          subject: "Your mailbox cutover date",
          body: `${helloEn}

Your mailbox will be switched to Microsoft 365 on ${fmtDate(cutoverDate, "en")}.

Important: from that date, do not work in your old Google mailbox anymore.
Your emails, contacts and calendars will have been migrated.

You will then reconnect via Outlook (web or app).${signEn}`,
        };
      case "reconnexion_outlook":
        return {
          subject: "Reconnect your mailbox in Outlook",
          body: `${helloEn}

The cutover is done. Please reconnect your mailbox:

• Outlook on the web: ${OWA_URL} (login ${login})
• Outlook app: add the account ${login} then authenticate.

Please check sending/receiving a test email and that your history is present.
If anything is wrong, reply to this email.${signEn}`,
        };
      case "relance":
        return {
          subject: "Reminder — please confirm your migration",
          body: `${helloEn}

We have not yet received confirmation of your first sign-in / reconnection to Microsoft 365.

Please complete this step as soon as possible (login ${login}, ${OWA_URL}) and confirm by replying to this email.${signEn}`,
        };
    }
  }
}

/** Vérifie qu'un texte ne contient pas de mot de passe (garde-fou, testé). */
export function containsPassword(text: string): boolean {
  return /mot de passe\s*[:=]\s*\S+|password\s*[:=]\s*\S+|\bpwd\s*[:=]/i.test(text);
}
