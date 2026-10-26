/**
 * Raccorde automatiquement les variables fournies par l'hébergeur à celles qu'attend l'application.
 *
 * - Intégration Supabase de Vercel : POSTGRES_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   SUPABASE_JWT_SECRET… → DATABASE_URL, SUPABASE_URL, APP_SECRET.
 * - Vercel : VERCEL_PROJECT_PRODUCTION_URL → NEXT_PUBLIC_SITE_URL ; base de démonstration dans /tmp.
 *
 * Les variables définies explicitement gardent toujours la priorité. Fonction idempotente.
 */
import { createHmac } from "node:crypto";

let applied = false;

function cleanPostgresUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Paramètres propres à Prisma / au pooler Supabase que postgres.js ne comprend pas.
    for (const k of ["supa", "pgbouncer", "sslmode", "connection_limit"]) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return raw;
  }
}

export function applyPlatformEnv(): void {
  if (applied) return;
  applied = true;
  const e = process.env;

  if (!e.DATABASE_URL) {
    const fromIntegration = e.POSTGRES_URL ?? e.SUPABASE_DB_URL;
    if (fromIntegration) e.DATABASE_URL = cleanPostgresUrl(fromIntegration);
  }

  if (!e.SUPABASE_URL && e.NEXT_PUBLIC_SUPABASE_URL) e.SUPABASE_URL = e.NEXT_PUBLIC_SUPABASE_URL;

  if (!e.APP_SECRET) {
    const base = e.SUPABASE_JWT_SECRET ?? e.SUPABASE_SERVICE_ROLE_KEY;
    if (base) e.APP_SECRET = createHmac("sha256", base).update("genie-des-lycees/app-secret").digest("base64url");
  }

  if (!e.NEXT_PUBLIC_SITE_URL && e.VERCEL_PROJECT_PRODUCTION_URL) {
    e.NEXT_PUBLIC_SITE_URL = `https://${e.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // Sur Vercel, seul /tmp est inscriptible : la base de démonstration embarquée y est créée.
  if (e.VERCEL && !e.DATABASE_URL && !e.PGLITE_DIR) e.PGLITE_DIR = "/tmp/pglite";
}
