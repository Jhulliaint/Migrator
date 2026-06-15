// =============================================================================
//  Couche d'accès aux données — store abstrait (serveur uniquement).
//
//  Deux back-ends derrière une interface unique et ASYNCHRONE :
//   • Vercel KV (Redis) si KV_REST_API_URL + KV_REST_API_TOKEN sont définis
//     → persistance partagée entre instances serverless (cible Vercel).
//   • Fichier JSON local data/db.json sinon (développement local), avec repli
//     mémoire si le système de fichiers est en lecture seule.
//
//  L'état complet (objet Database) est stocké tel quel sous une seule clé KV /
//  un seul document — fidèle au modèle d'origine. L'UI et lib/domain/ ne
//  dépendent QUE de l'API REST : ce changement leur est transparent.
//
//  ⚠️ Concurrence : chaque écriture est un read-modify-write du document complet
//  (last-writer-wins), comme le modèle fichier d'origine. Acceptable à l'échelle
//  d'une petite équipe ; à revoir si l'on introduit des entités séparées.
//  (module serveur : importé uniquement par les route handlers /api)
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import type { Database, AuditEntry } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const SEED_PATH = path.join(DATA_DIR, "seed.json");
const DB_PATH = path.join(DATA_DIR, "db.json");

/** Clé unique sous laquelle l'état complet est stocké dans Vercel KV. */
export const KV_DB_KEY = "migrator:db";

/** Vercel KV est-il configuré ? (présence des variables d'environnement) */
const useKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

/** Cache mémoire (repli si le FS local est en lecture seule, hors KV). */
let memoryDb: Database | null = null;
let useMemory = false;

function loadSeed(): Database {
  const raw = fs.readFileSync(SEED_PATH, "utf-8");
  return JSON.parse(raw) as Database;
}

// --- Back-end Vercel KV ------------------------------------------------------
// Import dynamique : @vercel/kv n'est chargé qu'en présence de la config KV,
// pour ne pas peser sur le développement local en mode fichier.
async function kvClient() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

async function getDbKv(): Promise<Database> {
  const kv = await kvClient();
  const db = await kv.get<Database>(KV_DB_KEY);
  if (db) return db;
  // Première utilisation : amorce depuis le seed puis persiste.
  const seed = loadSeed();
  await kv.set(KV_DB_KEY, seed);
  return seed;
}

async function saveDbKv(db: Database): Promise<void> {
  const kv = await kvClient();
  await kv.set(KV_DB_KEY, db);
}

// --- Back-end fichier local --------------------------------------------------
function getDbFile(): Database {
  if (useMemory && memoryDb) return memoryDb;
  try {
    if (!fs.existsSync(DB_PATH)) {
      const seed = loadSeed();
      fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), "utf-8");
      return seed;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as Database;
  } catch {
    // Système de fichiers en lecture seule (ex. serverless sans KV) : repli mémoire.
    if (!memoryDb) memoryDb = loadSeed();
    useMemory = true;
    return memoryDb;
  }
}

function saveDbFile(db: Database): void {
  if (useMemory) {
    memoryDb = db;
    return;
  }
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    memoryDb = db;
    useMemory = true;
  }
}

// --- Interface publique (asynchrone) -----------------------------------------
/** Lit l'état courant (initialise depuis le seed si nécessaire). */
export async function getDb(): Promise<Database> {
  return useKv ? getDbKv() : getDbFile();
}

/** Persiste l'état courant. */
export async function saveDb(db: Database): Promise<void> {
  if (useKv) {
    await saveDbKv(db);
    return;
  }
  saveDbFile(db);
}

/** Réinitialise l'état à partir du seed (données de démonstration). */
export async function resetDb(): Promise<Database> {
  const seed = loadSeed();
  await saveDb(seed);
  return seed;
}

/** Mutation transactionnelle : lit, applique, persiste, renvoie le nouvel état. */
export async function mutate(fn: (db: Database) => void): Promise<Database> {
  const db = await getDb();
  fn(db);
  await saveDb(db);
  return db;
}

/** Ajoute une entrée au journal d'audit (mutation en mémoire, sans I/O). */
export function appendAudit(
  db: Database,
  entry: Omit<AuditEntry, "id" | "date" | "author"> & { author?: string }
): void {
  db.auditLog.unshift({
    id: `a${Date.now()}${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    author: entry.author ?? db.settings.defaultAuthor,
    action: entry.action,
    entity: entry.entity,
    field: entry.field,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
  });
  // Conserve les 500 dernières entrées.
  if (db.auditLog.length > 500) db.auditLog.length = 500;
}
