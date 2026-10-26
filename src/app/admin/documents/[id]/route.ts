import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { readFile } from "@/lib/storage";
import { audit } from "@/lib/audit";

/** Pièces justificatives : servies uniquement aux rôles autorisés, jamais mises en cache. */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || !can(user.role, "inscriptions", "read")) return new Response("Interdit", { status: 403 });
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Introuvable", { status: 404 });
  const db = await getDb();
  const [doc] = await db.select().from(s.documents).where(eq(s.documents.id, id));
  if (!doc) return new Response("Introuvable", { status: 404 });
  const data = await readFile("private", doc.storagePath);
  if (!data) return new Response("Fichier manquant", { status: 404 });
  await audit(user, "consultation_document", "documents", id, { dossier: doc.inscriptionId });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
