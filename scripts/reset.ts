/** Réinitialise la base locale PGlite (supprime .data/pglite). Sans effet sur PostgreSQL distant. */
import fs from "node:fs";
import path from "node:path";

if (process.env.DATABASE_URL) {
  console.error("db:reset ne s'applique qu'à la base locale. Pour PostgreSQL, réinitialisez depuis Supabase.");
  process.exit(1);
}
const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
fs.rmSync(dir, { recursive: true, force: true });
console.log(`✔ ${dir} supprimé. Les données de démonstration seront recréées au prochain lancement.`);
