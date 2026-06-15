// =============================================================================
//  Couche d'accès aux données — store JSON local (serveur uniquement).
//  Le fichier de travail data/db.json est créé depuis data/seed.json au 1er accès.
//  Abstraction volontairement isolée : remplaçable par SQLite/Prisma plus tard.
//  (module serveur : importé uniquement par les route handlers /api)
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import type { Database, AuditEntry } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const SEED_PATH = path.join(DATA_DIR, "seed.json");
const DB_PATH = path.join(DATA_DIR, "db.json");

/** Cache mémoire (utile en serverless lecture seule). */
let memoryDb: Database | null = null;
let useMemory = false;

function loadSeed(): Database {
  const raw = fs.readFileSync(SEED_PATH, "utf-8");
  return JSON.parse(raw) as Database;
}

/** Lit l'état courant (initialise depuis le seed si nécessaire). */
export function getDb(): Database {
  if (useMemory && memoryDb) return memoryDb;
  try {
    if (!fs.existsSync(DB_PATH)) {
      const seed = loadSeed();
      fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), "utf-8");
      return seed;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as Database;
  } catch {
    // Système de fichiers en lecture seule (ex. serverless) : repli mémoire.
    if (!memoryDb) memoryDb = loadSeed();
    useMemory = true;
    return memoryDb;
  }
}

/** Persiste l'état courant. */
export function saveDb(db: Database): void {
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

/** Réinitialise le fichier de travail à partir du seed (données de démo). */
export function resetDb(): Database {
  const seed = loadSeed();
  saveDb(seed);
  return seed;
}

/** Mutation transactionnelle : lit, applique, persiste, renvoie le nouvel état. */
export function mutate(fn: (db: Database) => void): Database {
  const db = getDb();
  fn(db);
  saveDb(db);
  return db;
}

/** Ajoute une entrée au journal d'audit. */
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
