import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { videoResponse } from "@/lib/storage";
import { slugify } from "@/lib/utils";

/** Lecture et téléchargement des vidéos mises en ligne sur le site. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Introuvable", { status: 404 });
  const db = await getDb();
  const [v] = await db.select().from(s.videos).where(eq(s.videos.id, id));
  if (!v?.fileKey) return new Response("Introuvable", { status: 404 });
  const wantsDownload = new URL(req.url).searchParams.has("telecharger");
  let isStaff = false;
  if (v.status !== "publie" || (wantsDownload && !v.downloadable)) {
    const user = await getCurrentUser();
    isStaff = Boolean(user && can(user.role, "videos", "read"));
    if (!isStaff) return new Response(v.status !== "publie" ? "Vidéo non publiée" : "Téléchargement non autorisé pour cette vidéo", { status: 403 });
  }
  const ext = v.mimeType === "video/webm" ? "webm" : v.mimeType === "video/quicktime" ? "mov" : "mp4";
  return videoResponse(v.fileKey, {
    range: req.headers.get("range"),
    download: wantsDownload,
    filename: `${slugify(v.title) || "video"}-genie-des-lycees.${ext}`,
    mime: v.mimeType ?? "video/mp4",
  });
}
