import "server-only";
import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/auth/session";

export async function audit(user: SessionUser | null, action: string, entity: string, entityId?: string | null, details?: Record<string, unknown>) {
  const db = await getDb();
  await db.insert(auditLogs).values({
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    action,
    entity,
    entityId: entityId ?? null,
    details: details ?? null,
  });
}
