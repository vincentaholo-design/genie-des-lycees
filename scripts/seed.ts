/**
 * Charge les données de démonstration FICTIVES.
 * Sur PostgreSQL/Supabase, le compte admin de démo n'est PAS créé : utilisez `npm run admin:create`.
 */
import { closeDb, getDb } from "../src/lib/db";
import { seedDemo } from "../src/lib/db/seed";
import { categories } from "../src/lib/db/schema";

async function main() {
  process.env.SEED_DEMO = "false";
  const db = await getDb();
  const existing = await db.select().from(categories).limit(1);
  if (existing.length) {
    console.log("La base contient déjà des données : rien n'a été ajouté. (npm run db:reset pour repartir de zéro en local)");
  } else {
    await seedDemo(db, { withDemoAdmin: !process.env.DATABASE_URL });
    console.log("✔ Données de démonstration chargées.");
  }
  await closeDb();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
