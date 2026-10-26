import { and, eq, lt, sql } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

/**
 * Limitation de fréquence à fenêtre fixe, stockée en base (fonctionne avec plusieurs instances).
 * Retourne `ok: false` si la limite est dépassée.
 */
export async function rateLimit(
  db: DB,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<{ ok: boolean; remaining: number; retryAfter: number }> {
  const windowMs = windowSeconds * 1000;
  const start = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: start, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  // Nettoyage opportuniste des anciennes fenêtres
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - 2 * 86_400_000)));
  }
  const retryAfter = Math.ceil((start.getTime() + windowMs - now.getTime()) / 1000);
  return { ok: row.count <= limit, remaining: Math.max(0, limit - row.count), retryAfter };
}

export async function peekRateLimit(db: DB, key: string, windowSeconds: number, now = new Date()) {
  const windowMs = windowSeconds * 1000;
  const start = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const [row] = await db
    .select({ count: rateLimits.count })
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key), eq(rateLimits.windowStart, start)));
  return row?.count ?? 0;
}
