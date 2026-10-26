import { desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { AdminHeader } from "@/components/admin/ui";
import { VideoUploader } from "@/components/videos/VideoUploader";
import { MAX_VIDEO_BYTES } from "@/lib/storage";
import { services } from "@/lib/env";

export default async function UploadVideoAdmin() {
  await requireUser("videos", "write");
  const db = await getDb();
  const editions = await db.select({ id: s.editions.id, title: s.editions.title }).from(s.editions).orderBy(desc(s.editions.number));
  return (
    <>
      <AdminHeader title="Mettre en ligne une vidéo" back={{ href: "/admin/videos", label: "Vidéos" }} />
      <p className="mb-6 max-w-2xl text-gris">
        Le fichier est envoyé {services.storage === "supabase" ? "directement dans Supabase Storage (bucket privé « videos »)" : "dans le stockage local du serveur (.data/uploads/videos)"}, puis vérifié avant d'être enregistré. Il est servi par le site, avec lecture progressive et téléchargement si vous l'autorisez.
      </p>
      <div className="max-w-3xl">
        <VideoUploader mode="admin" editions={editions.map((e) => ({ id: e.id, title: e.title }))} maxMb={Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} />
      </div>
    </>
  );
}
