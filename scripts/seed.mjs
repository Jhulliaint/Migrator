// Réinitialise la base de travail data/db.json à partir du jeu de démo data/seed.json.
// (Le seed lui-même est généré depuis l'Excel par scripts/build_seed.py.)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const seed = path.join(dir, "..", "data", "seed.json");
const db = path.join(dir, "..", "data", "db.json");

if (!fs.existsSync(seed)) {
  console.error("data/seed.json introuvable — générez-le avec scripts/build_seed.py.");
  process.exit(1);
}
fs.copyFileSync(seed, db);
const { users } = JSON.parse(fs.readFileSync(seed, "utf-8"));
console.log(`✓ Base réinitialisée (${users.length} comptes) → data/db.json`);
