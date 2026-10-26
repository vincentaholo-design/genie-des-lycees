import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { randomToken, sha256 } from "@/lib/crypto";
import { assertProductionSecrets, env } from "@/lib/env";
import { can, type Action, type Resource, type Role } from "./permissions";

export const SESSION_COOKIE = "gdl_admin";
const SESSION_DAYS = 7;

export type SessionUser = { id: string; email: string; name: string; role: Role };

export async function createSession(userId: string) {
  assertProductionSecrets();
  const db = await getDb();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Utilisateur connecté (vérifié en base à chaque requête). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, active: users.active })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())));
  if (!row || !row.active) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role };
});

/** À appeler dans chaque page et action d'administration. */
export async function requireUser(resource?: Resource, action: Action = "read"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/connexion");
  if (resource && !can(user.role, resource, action)) redirect("/admin?refus=1");
  return user;
}

/** Variante pour les actions serveur : lève une erreur au lieu de rediriger. */
export async function assertPermission(resource: Resource, action: Action = "write"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Session expirée. Reconnectez-vous.");
  if (!can(user.role, resource, action)) throw new Error("Action non autorisée pour votre rôle.");
  return user;
}
