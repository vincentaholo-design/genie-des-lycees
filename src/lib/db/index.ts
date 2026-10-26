/**
 * Accès à la base de données.
 * - DATABASE_URL défini  → PostgreSQL (Supabase ou autre) via postgres.js. Migrations : `npm run db:migrate`.
 * - DATABASE_URL absent  → PGlite (PostgreSQL embarqué, fichier `.data/pglite`), migré et
 *   rempli automatiquement avec les données de démonstration au premier lancement.
 * - DATABASE_DRIVER=memory → PGlite en mémoire (tests).
 */
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { applyPlatformEnv } from "../platform-env";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
export { schema };

type Holder = { promise?: Promise<DB>; close?: () => Promise<void> };
const g = globalThis as unknown as { __gdlDb?: Holder };
const holder: Holder = (g.__gdlDb ??= {});

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function createPglite(dataDir: string | undefined, seedIfEmpty: boolean): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) {
    const fs = await import("node:fs");
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client, { schema }) as unknown as DB;
  await migrate(db as never, { migrationsFolder: MIGRATIONS });
  holder.close = () => client.close();
  if (seedIfEmpty) {
    const { seedIfEmpty: seed } = await import("./seed");
    await seed(db);
  }
  return db;
}

async function createPostgres(url: string): Promise<DB> {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const client = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    prepare: false, // compatible avec le pooler Supabase (mode transaction)
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
  });
  holder.close = () => client.end();
  return drizzle(client, { schema }) as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!holder.promise) {
    applyPlatformEnv();
    const url = process.env.DATABASE_URL;
    const driver = process.env.DATABASE_DRIVER;
    if (driver === "memory") holder.promise = createPglite(undefined, false);
    else if (url) holder.promise = createPostgres(url);
    else
      holder.promise = createPglite(
        process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite"),
        process.env.SEED_DEMO !== "false",
      );
    holder.promise.catch(() => {
      holder.promise = undefined;
    });
  }
  return holder.promise;
}

export async function closeDb() {
  await holder.close?.();
  holder.promise = undefined;
  holder.close = undefined;
}
