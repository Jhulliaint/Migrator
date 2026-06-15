// Amorce le store avec le jeu de démonstration data/seed.json.
// (Le seed lui-même est généré depuis l'Excel par scripts/build_seed.py.)
//
//  • Si Vercel KV est configuré (KV_REST_API_URL + KV_REST_API_TOKEN), écrit le
//    seed sous la clé "migrator:db" — à exécuter UNE SEULE FOIS après le déploiement
//    (ex. `vercel env pull .env.local && npm run seed`). Idempotent : réécrit la clé.
//  • Sinon, réinitialise la base de travail locale data/db.json (copie de fichier).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(dir, "..", "data", "seed.json");
const dbPath = path.join(dir, "..", "data", "db.json");

/** Clé unique sous laquelle l'état complet est stocké (cf. lib/data/store.ts). */
const KV_DB_KEY = "migrator:db";

if (!fs.existsSync(seedPath)) {
  console.error("data/seed.json introuvable — générez-le avec scripts/build_seed.py.");
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  // Store hébergé : amorce dans Vercel KV.
  const { kv } = await import("@vercel/kv");
  await kv.set(KV_DB_KEY, seed);
  console.log(`✓ Vercel KV amorcé (${seed.users.length} comptes) → clé "${KV_DB_KEY}"`);
} else {
  // Développement local : (ré)initialise data/db.json.
  fs.copyFileSync(seedPath, dbPath);
  console.log(`✓ Base locale réinitialisée (${seed.users.length} comptes) → data/db.json`);
}
