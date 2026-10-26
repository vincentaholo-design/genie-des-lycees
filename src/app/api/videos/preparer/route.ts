import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requestFingerprint } from "@/lib/request";
import { verifyCaptcha } from "@/lib/notify";
import { env } from "@/lib/env";
import { prepareSchema, prepareUpload } from "@/lib/videos/upload";
import { json, sameOrigin } from "@/lib/videos/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origine refusée." }, 403);
  const body = await req.json().catch(() => null);
  const parsed = prepareSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Fichier invalide." }, 400);
  const mode = body?.mode === "admin" ? "admin" : "public";
  if (mode === "admin") {
    const user = await getCurrentUser();
    if (!user || !can(user.role, "videos", "write")) return json({ error: "Action non autorisée." }, 403);
  } else {
    const db = await getDb();
    const fp = await requestFingerprint();
    if (fp.ipHash && !(await rateLimit(db, `video-public:${fp.ipHash}`, 4, 3600)).ok) return json({ error: "Trop d'envois en peu de temps. Réessayez dans une heure." }, 429);
    const captcha = await verifyCaptcha(body?.captchaToken, fp.ip);
    if (captcha === "invalide") return json({ error: "Vérification anti-robot échouée." }, 400);
    if (captcha === "non_configure" && !env.demoMode && process.env.VIDEO_PUBLIC_UPLOAD !== "true") {
      return json({ error: "L'envoi de vidéos par le public n'est pas encore activé." }, 403);
    }
  }
  const r = await prepareUpload(parsed.data, mode);
  return r.ok ? json(r) : json({ error: r.error }, 400);
}
