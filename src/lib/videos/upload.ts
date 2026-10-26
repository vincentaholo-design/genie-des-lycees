import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { hmac, randomToken, safeEqual } from "@/lib/crypto";
import { services } from "@/lib/env";
import { ALLOWED_VIDEO, MAX_VIDEO_BYTES, inspectVideo, newVideoKey, removeVideo, sniffVideo, supabaseVideoUploadUrl } from "@/lib/storage";
import { slugify } from "@/lib/utils";

/**
 * Mise en ligne des vidéos en trois temps :
 *  1. préparation : contrôle du type et du poids, ticket signé (valable 2 h) ;
 *  2. envoi du fichier : directement vers Supabase Storage (URL signée) ou, en local, vers le serveur en flux ;
 *  3. finalisation : vérification du fichier réellement reçu (signature binaire, poids), création de la fiche.
 * Les vidéos proposées par le public restent en « brouillon » jusqu'à validation par l'équipe.
 */
export type Mode = "admin" | "public";
type Ticket = { key: string; size: number; mime: string; mode: Mode; exp: number; name: string };

export function signTicket(t: Ticket) {
  const body = Buffer.from(JSON.stringify(t)).toString("base64url");
  return `${body}.${hmac(body, "video-ticket")}`;
}

export function readTicket(ticket: string | null | undefined): Ticket | null {
  if (!ticket) return null;
  const [body, sig] = ticket.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(body, "video-ticket"))) return null;
  try {
    const t = JSON.parse(Buffer.from(body, "base64url").toString()) as Ticket;
    return t.exp > Date.now() ? t : null;
  } catch {
    return null;
  }
}

export const prepareSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
});

export async function prepareUpload(input: z.infer<typeof prepareSchema>, mode: Mode) {
  const ext = ALLOWED_VIDEO[input.mimeType];
  if (!ext) return { ok: false as const, error: "Format non accepté : MP4, WebM ou MOV uniquement." };
  if (input.fileSize > MAX_VIDEO_BYTES) return { ok: false as const, error: `Vidéo trop lourde : ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} Mo maximum.` };
  const key = newVideoKey(ext);
  const ticket = signTicket({ key, size: input.fileSize, mime: input.mimeType, mode, exp: Date.now() + 2 * 3600_000, name: input.fileName.slice(0, 120) });
  if (services.storage === "supabase") {
    return { ok: true as const, ticket, target: { kind: "supabase" as const, url: await supabaseVideoUploadUrl(key) } };
  }
  return { ok: true as const, ticket, target: { kind: "local" as const, url: `/api/videos/televersement?ticket=${encodeURIComponent(ticket)}` } };
}

export const finalizeSchema = z.object({
  ticket: z.string().min(10),
  title: z.string().trim().min(3, "Donnez un titre (3 caractères minimum)").max(160),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(["discours", "interview", "temoignage", "moments_forts", "ceremonie", "autre"]),
  editionId: z.string().uuid().optional().or(z.literal("")),
  submitterName: z.string().trim().max(120).optional(),
  submitterEmail: z.string().trim().max(200).optional(),
  submitterNote: z.string().trim().max(1000).optional(),
  rightsConsent: z.boolean().optional(),
  downloadable: z.boolean().optional(),
  publish: z.boolean().optional(),
});

export async function finalizeUpload(input: z.infer<typeof finalizeSchema>, mode: Mode) {
  const t = readTicket(input.ticket);
  if (!t || t.mode !== mode) return { ok: false as const, error: "Envoi expiré ou invalide. Recommencez la mise en ligne." };
  const info = await inspectVideo(t.key);
  if (!info) return { ok: false as const, error: "Le fichier n'a pas été reçu. Recommencez l'envoi." };
  const real = sniffVideo(info.head);
  if (!real || info.size > MAX_VIDEO_BYTES || Math.abs(info.size - t.size) > 1024) {
    await removeVideo(t.key);
    return { ok: false as const, error: "Ce fichier n'est pas une vidéo valide (MP4, WebM ou MOV)." };
  }
  if (mode === "public") {
    if (!input.submitterName || !input.submitterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.submitterEmail)) return { ok: false as const, error: "Indiquez votre nom et une adresse e-mail valide." };
    if (!input.rightsConsent) return { ok: false as const, error: "Confirmez que vous avez le droit de partager cette vidéo." };
  }
  const db = await getDb();
  if (input.editionId) {
    const [ed] = await db.select({ id: s.editions.id }).from(s.editions).where(eq(s.editions.id, input.editionId));
    if (!ed) return { ok: false as const, error: "Édition inconnue." };
  }
  const [row] = await db
    .insert(s.videos)
    .values({
      slug: `${slugify(input.title).slice(0, 60)}-${randomToken(4).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      title: input.title,
      description: input.description || null,
      type: input.type,
      provider: "fichier",
      fileKey: t.key,
      fileSize: info.size,
      mimeType: real,
      editionId: input.editionId || null,
      downloadable: mode === "admin" ? Boolean(input.downloadable) : false,
      status: mode === "admin" && input.publish ? "publie" : "brouillon",
      submitterName: mode === "public" ? input.submitterName : null,
      submitterEmail: mode === "public" ? input.submitterEmail?.toLowerCase() : null,
      submitterNote: mode === "public" ? input.submitterNote || null : null,
      rightsConsent: Boolean(input.rightsConsent),
    })
    .returning({ id: s.videos.id, slug: s.videos.slug, status: s.videos.status });
  if (mode === "public") {
    await db.insert(s.notifications).values({ role: "editeur", type: "video", message: `Vidéo proposée par ${input.submitterName} : « ${input.title} »`, link: `/admin/videos/${row.id}` });
  }
  return { ok: true as const, video: row };
}
