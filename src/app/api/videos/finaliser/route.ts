import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { finalizeSchema, finalizeUpload } from "@/lib/videos/upload";
import { json, sameOrigin } from "@/lib/videos/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origine refusée." }, 403);
  const body = await req.json().catch(() => null);
  const parsed = finalizeSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Informations incomplètes." }, 400);
  const mode = body?.mode === "admin" ? "admin" : "public";
  const user = mode === "admin" ? await getCurrentUser() : null;
  if (mode === "admin" && (!user || !can(user.role, "videos", "write"))) return json({ error: "Action non autorisée." }, 403);
  if (mode === "admin" && parsed.data.publish && !can(user!.role, "videos", "write")) return json({ error: "Publication non autorisée." }, 403);
  const r = await finalizeUpload(parsed.data, mode);
  if (!r.ok) return json({ error: r.error }, 400);
  if (user) await audit(user, "mise_en_ligne_video", "videos", r.video.id, { publie: r.video.status === "publie" });
  revalidatePath("/videos");
  return json(r);
}
