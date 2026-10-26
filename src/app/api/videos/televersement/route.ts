import { readTicket } from "@/lib/videos/upload";
import { writeLocalVideo } from "@/lib/storage";
import { services } from "@/lib/env";
import { json, sameOrigin } from "@/lib/videos/http";

/** Réception en flux d'un fichier vidéo (stockage local uniquement). */
export async function PUT(req: Request) {
  if (services.storage !== "local") return json({ error: "Envoi direct au stockage attendu." }, 400);
  if (!sameOrigin(req)) return json({ error: "Origine refusée." }, 403);
  const t = readTicket(new URL(req.url).searchParams.get("ticket"));
  if (!t) return json({ error: "Envoi expiré ou invalide." }, 403);
  if (!req.body) return json({ error: "Fichier manquant." }, 400);
  try {
    const size = await writeLocalVideo(t.key, req.body, t.size + 1024);
    return json({ ok: true, size });
  } catch (e) {
    return json({ error: (e as Error).message.includes("EEXIST") ? "Fichier déjà reçu." : (e as Error).message }, 400);
  }
}
