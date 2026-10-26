import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { VideoUploader } from "@/components/videos/VideoUploader";
import { listEditions } from "@/lib/queries";
import { MAX_VIDEO_BYTES } from "@/lib/storage";
import { photos } from "@/config/media";

export const metadata: Metadata = { title: "Partager une vidéo", description: "Envoyez vos vidéos des éditions précédentes de Génie des Lycées ORATHON." };

export default async function ShareVideoPage() {
  const editions = await listEditions();
  return (
    <>
      <PageHeader
        title="Partager une vidéo"
        intro="Vous avez filmé un discours, une finale ou les coulisses d'une édition ? Envoyez-la : l'équipe la regarde, puis la publie dans la vidéothèque."
        image={photos.orateurMicroMain}
      />
      <div className="papier">
        <div className="conteneur grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr]">
          <VideoUploader mode="public" editions={editions.map((e) => ({ id: e.id, title: e.title }))} maxMb={Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
          <aside className="space-y-4 self-start rounded-[1.5rem] bg-ivoire-2 p-6 text-[0.95rem]">
            <h2 className="t-sous-titre text-xl">Avant d'envoyer</h2>
            <ul className="space-y-2 text-gris">
              <li>Formats acceptés : MP4, WebM ou MOV (vidéos de téléphone comprises).</li>
              <li>Le Wi-Fi est conseillé : une minute de vidéo pèse souvent 50 à 150 Mo.</li>
              <li>Les personnes filmées, ou leurs parents pour les mineurs, doivent être d'accord.</li>
              <li>Rien n'est publié sans validation de l'équipe.</li>
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}
