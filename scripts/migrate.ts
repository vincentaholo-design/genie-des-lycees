/** Applique les migrations SQL (dossier /drizzle) sur la base configurée. */
import { closeDb, getDb } from "../src/lib/db";

async function main() {
  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    await client.end();
    console.log("✔ Migrations appliquées sur PostgreSQL.");
  } else {
    process.env.SEED_DEMO = "false";
    await getDb(); // PGlite migre automatiquement
    await closeDb();
    console.log("✔ Base locale (PGlite) migrée dans .data/pglite.");
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
