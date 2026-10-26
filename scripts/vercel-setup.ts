/**
 * Préparation automatique de la base lors d'un déploiement (commande `npm run vercel-build`).
 *
 * Avec une base PostgreSQL (Supabase relié au projet Vercel) :
 *   1. applique les migrations ;
 *   2. verrouille l'API publique de Supabase et crée les buckets de stockage (supabase/securite-supabase.sql) ;
 *   3. charge les données de démonstration si la base est vide ;
 *   4. crée ou met à jour le compte d'administration si ADMIN_EMAIL et ADMIN_PASSWORD sont définis.
 * Sans base PostgreSQL, ne fait rien : le site utilise la base de démonstration embarquée.
 * Chaque étape est idempotente : relancer un déploiement ne duplique rien.
 */
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { applyPlatformEnv } from "../src/lib/platform-env";

async function main() {
  applyPlatformEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("ℹ Aucune base PostgreSQL configurée : déploiement avec la base de démonstration embarquée.");
    return;
  }

  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const direct = process.env.POSTGRES_URL_NON_POOLING ?? url;
  const client = postgres(direct, { max: 1, prepare: false, ssl: direct.includes("localhost") ? false : "require", onnotice: () => {} });

  try {
    await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    console.log("✔ Migrations appliquées.");

    const hasStorage = await client`select 1 from information_schema.schemata where schema_name = 'storage'`;
    if (hasStorage.length) {
      const sql = fs.readFileSync(path.join(process.cwd(), "supabase", "securite-supabase.sql"), "utf8");
      await client.unsafe(sql);
      console.log("✔ Sécurité Supabase et buckets de stockage en place.");
    }
  } finally {
    await client.end();
  }

  process.env.SEED_DEMO = "false";
  const { getDb, closeDb } = await import("../src/lib/db");
  const { seedDemo } = await import("../src/lib/db/seed");
  const s = await import("../src/lib/db/schema");
  const db = await getDb();

  const existing = await db.select({ id: s.categories.id }).from(s.categories).limit(1);
  if (existing.length) console.log("ℹ La base contient déjà des données : aucune donnée de démonstration ajoutée.");
  else {
    await seedDemo(db, { withDemoAdmin: false });
    console.log("✔ Données de démonstration chargées.");
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) console.warn("⚠ ADMIN_PASSWORD doit faire au moins 12 caractères : compte non créé.");
    else {
      const { hashPassword } = await import("../src/lib/crypto");
      const passwordHash = await hashPassword(password);
      const [user] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
      if (user) await db.update(s.users).set({ passwordHash, role: "super_admin", active: true }).where(eq(s.users.id, user.id));
      else await db.insert(s.users).values({ email, name: process.env.ADMIN_NAME ?? "Administrateur", role: "super_admin", passwordHash });
      console.log(`✔ Compte d'administration prêt : ${email}`);
    }
  }
  await closeDb();
}

main().catch((e) => {
  console.error("✖ Préparation de la base impossible :", e);
  process.exit(1);
});
