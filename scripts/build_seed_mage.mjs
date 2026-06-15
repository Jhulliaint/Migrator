// =============================================================================
//  Génère data/seed.json à partir du fichier de migration réel (MAGE SAS).
//
//  Usage : node scripts/build_seed_mage.mjs <chemin/vers/Fichier_de_migration.xlsx>
//
//  • Les utilisateurs, boîtes partagées, listes de distribution et le domaine
//    proviennent de l'Excel (source de vérité côté client).
//  • Le référentiel de licences, les jalons projet, les tâches et les paramètres
//    sont conservés depuis le seed existant (scaffolding applicatif hors Excel).
//  • SÉCURITÉ : les colonnes « Mot de passe » de l'Excel ne sont JAMAIS lues
//    ni stockées (cf. CLAUDE.md). Le fichier Excel n'est pas committé.
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const dir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(dir, "..", "data", "seed.json");
const dbPath = path.join(dir, "..", "data", "db.json");

const xlsxPath = process.argv[2];
if (!xlsxPath || !fs.existsSync(xlsxPath)) {
  console.error("Fichier Excel introuvable. Usage : node scripts/build_seed_mage.mjs <fichier.xlsx>");
  process.exit(1);
}

// --- Helpers ----------------------------------------------------------------
const lc = (s) => String(s ?? "").trim().toLowerCase();
const localPart = (email) => lc(email).split("@")[0];

/** Profils Excel → codes internes. */
const LICENSE_MAP = {
  "boîte partagée (gratuit)": "SHARED",
  "m365 f3": "P3",
  "f3 + exchange 50go": "P2",
  "business premium": "P1",
  "exchange plan 1 (50go)": "P4a",
  "exchange kiosk 2go": "P4b",
};

const SERVICE_LOCALS = new Set([
  "contact", "scan", "eshop", "coupe", "atelier.mesure", "corthay.order",
  "japan.order", "assistantretail1",
]);

function siteFor(local) {
  if (/osaka|shinjuku|aoyama|japan|tokyo|kenjiro/.test(local)) return "Japon";
  if (/cheongdam|korea|seoul/.test(local) || local === "jake") return "Corée";
  if (/beijing|china/.test(local)) return "Chine";
  if (/landmark|hongkong/.test(local)) return "Hong Kong";
  if (/london/.test(local)) return "Londres";
  return "Paris";
}

function parseSizeGB(v) {
  if (v == null) return 0;
  const m = String(v).replace(",", ".").match(/([\d.]+)/);
  return m ? Math.round(parseFloat(m[1]) * 100) / 100 : 0;
}

function osFor(v) {
  const s = lc(v);
  if (s.includes("mac")) return "Mac";
  if (s.includes("windows")) return "Windows";
  return "inconnu";
}

function riskForSize(gb) {
  if (gb > 100) return "rouge";
  if (gb > 50) return "orange";
  return "vert";
}

// --- Lecture Excel ----------------------------------------------------------
const wb = XLSX.readFile(xlsxPath);

// Onglet « Boites partagées » : email → membres autorisés.
const sharedMembers = new Map(); // localPart -> string[] (emails membres, lc)
for (const r of XLSX.utils.sheet_to_json(wb.Sheets["Boites partagées"], { header: 1, defval: null })) {
  const email = r[1];
  if (!email || !String(email).includes("@") || lc(email) === "email") continue;
  const members = String(r[3] ?? "")
    .split(",")
    .map((s) => lc(s))
    .filter((s) => s.includes("@"));
  sharedMembers.set(localPart(email), members);
}

// --- Utilisateurs -----------------------------------------------------------
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Utilisateurs"], { defval: null });
const users = [];

for (const r of rows) {
  const googleEmail = lc(r["Email actuel"]);
  if (!googleEmail || !googleEmail.includes("@")) continue; // ignore séparateurs / lignes vides

  const local = localPart(googleEmail);
  const licenseProfile = LICENSE_MAP[lc(r["Type de licence Office*"])] ?? "P4a";
  const isMaison = local.startsWith("maison.");
  const isService = SERVICE_LOCALS.has(local) || isMaison;
  const isShared = licenseProfile === "SHARED";
  const isScan = local === "scan";
  const size = parseSizeGB(r["Taille de la boite*"]);

  let status;
  if (isService) status = "boîte de service";
  else if (isShared) status = "à arbitrer"; // personne en cours de conversion en boîte partagée
  else status = "actif";

  let typeCurrent;
  if (isScan) typeCurrent = "scan-to-mail";
  else if (isMaison) typeCurrent = "boutique";
  else if (isService) typeCurrent = "boîte service";
  else typeCurrent = "utilisateur Google";

  const consultation = lc(r["Consultation des mails actuels*"]);
  const secondary = String(r["Licences Secondaire"] ?? "").trim();
  const remarksParts = [String(r["Remarques"] ?? "").trim()];
  if (secondary) remarksParts.push(`Licence secondaire : ${secondary}`);

  users.push({
    id: `u_${local.replace(/[^a-z0-9]/g, "")}`,
    firstName: String(r["Prénom"] ?? "").trim(),
    lastName: String(r["Nom"] ?? "").trim(),
    googleEmail,
    microsoftEmail: lc(r["email Office 365"]) || googleEmail,
    status,
    site: siteFor(local),
    role: "",
    phone: String(r["Numéro de ligne directe"] ?? "").trim(),
    vip: /oui|x|vip/i.test(String(r["VIP"] ?? "")),
    physicalUser: !isService,
    usesOutlookWeb: consultation.includes("owa") || consultation.includes("webmail"),
    usesOutlookDesktop: /oui|installé|x/i.test(String(r["Outlook installé ?"] ?? "")),
    usesMobile: false,
    os: osFor(r["OS windows/mac?"]),
    lastGoogleSignIn: null,
    mailboxSizeGB: size,
    targetSizeGB: null,
    cleanupRequested: false,
    cleanupDone: false,
    mailStatus: "non commencé",
    mfa: {
      status: "non démarrée", method: "non défini", configured: false, configuredAt: null,
      blocked: false, needsAssistance: false, instructionSent: false, firstSignInDone: false,
    },
    commStatus: "non démarré",
    remarks: remarksParts.filter(Boolean).join(" — "),
    linkedMailboxes: [],
    risk: riskForSize(size),
    licenseProfile,
    engagement: "annuel",
    payment: "mensuel",
    packBeCloud: false,
    mailbox: {
      typeCurrent,
      typeTarget: isShared ? "boîte partagée" : "utilisateur Microsoft",
      members: sharedMembers.get(local) ?? [],
      memberRight: "accès complet",
      alias: String(r["alias Office 365"] ?? "").split(/[;,]/).map((s) => lc(s)).filter((s) => s.includes("@")),
      autoSend: false,
      scanToMail: isScan,
      keepLicense: false,
      externalAccess: false,
      autoSignature: false,
      mfaException: isService,
    },
    updatedAt: "2026-06-15T00:00:00.000Z",
  });
}

// Liens inverses : pour chaque membre d'une boîte partagée, référencer la boîte.
const byEmail = new Map(users.map((u) => [u.googleEmail, u]));
for (const u of users) {
  for (const memberEmail of u.mailbox.members) {
    const member = byEmail.get(memberEmail);
    if (member && !member.linkedMailboxes.includes(u.googleEmail)) {
      member.linkedMailboxes.push(u.googleEmail);
    }
  }
}

// --- Listes de distribution -------------------------------------------------
const distributionLists = [];
const dlRows = XLSX.utils.sheet_to_json(wb.Sheets["Listes de distribution"], { header: 1, defval: null });
let dlIdx = 1;
for (const r of dlRows) {
  const name = String(r[0] ?? "").trim();
  const address = lc(r[1]);
  if (!address || !address.includes("@") || lc(r[1]) === "email") continue;
  const members = String(r[2] ?? "").split(",").map((s) => lc(s)).filter((s) => s.includes("@"));
  const internalFlag = String(r[3] ?? "").trim() !== "";
  const externalFlag = String(r[4] ?? "").trim() !== "";
  distributionLists.push({
    id: `dl${dlIdx++}`,
    name: name || address.split("@")[0],
    address,
    internalMembers: internalFlag ? members : members,
    externalMembers: externalFlag ? [] : [],
    allowExternalSenders: externalFlag,
    usage: "Importée depuis le fichier de migration.",
    creationStatus: "à créer",
    remarks: "",
  });
}

// --- Domaine ----------------------------------------------------------------
const domRows = XLSX.utils.sheet_to_json(wb.Sheets["Domaines "], { header: 1, defval: null });
let dnsProvider = "WIX";
for (const r of domRows) {
  if (r[0] && lc(r[0]) !== "domaine" && r[1]) { dnsProvider = String(r[1]).trim(); break; }
}

// --- Fusion avec le scaffolding existant ------------------------------------
const prev = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

const db = {
  users,
  licenseTypes: prev.licenseTypes,
  tasks: prev.tasks,
  risks: prev.risks ?? [],
  distributionLists,
  milestones: prev.milestones,
  auditLog: [],
  settings: {
    ...prev.settings,
    googleWorkspaceUsers: users.length,
    dnsProvider,
  },
};

fs.writeFileSync(seedPath, JSON.stringify(db, null, 2) + "\n");
fs.copyFileSync(seedPath, dbPath);

const shared = users.filter((u) => u.licenseProfile === "SHARED").length;
console.log(`✓ seed.json régénéré depuis ${path.basename(xlsxPath)}`);
console.log(`  ${users.length} utilisateurs (${shared} boîtes partagées), ${distributionLists.length} liste(s) de distribution, DNS = ${dnsProvider}`);
