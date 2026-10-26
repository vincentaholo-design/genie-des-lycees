import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { VideoCard } from "@/components/ui/VideoCard";
import { listEditions, listVideos } from "@/lib/queries";
import { VIDEO_TYPES } from "@/config/labels";
import { photos, socials } from "@/config/media";

export const metadata: Metadata = { title: "Vidéothèque", description: "Discours, finales et moments forts des éditions de Génie des Lycées ORATHON, à regarder et à télécharger." };

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ type?: string; edition?: string }> }) {
  const sp = await searchParams;
  const editions = await listEditions();
  const ed = editions.find((e) => e.slug === sp.edition);
  const videos = await listVideos({ type: sp.type, editionId: ed?.id });
  const href = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ type: sp.type, edition: sp.edition, ...o }).filter(([, v]) => v) as [string, string][]);
    return `/videos${p.size ? `?${p}` : ""}`;
  };
  const chip = (to: string, label: string, active: boolean) => (
    <Link key={to + label} href={to} aria-current={active ? "page" : undefined} className={`pastille !py-2 !text-sm ${active ? "bg-tribune text-white" : "bg-ivoire-2 text-encre hover:bg-ivoire-3"}`}>{label}</Link>
  );
  return (
    <>
      <PageHeader
        title="Vidéothèque"
        intro="Revivez les discours, les finales et les moments forts des éditions précédentes. Regardez en ligne ou téléchargez les vidéos autorisées."
        image={photos.orateurPlaidoirie}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/videos/partager" className="btn btn-or btn-fleche">Partager une vidéo</Link>
          <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="btn btn-contour">Chaîne YouTube</a>
        </div>
      </PageHeader>
      <div className="papier">
        <div className="conteneur space-y-3 py-10">
          <div className="flex flex-wrap gap-2">
            {chip(href({ edition: undefined }), "Toutes les éditions", !sp.edition)}
            {editions.map((e) => chip(href({ edition: e.slug }), e.title, sp.edition === e.slug))}
          </div>
          <div className="flex flex-wrap gap-2">
            {chip(href({ type: undefined }), "Tous les types", !sp.type)}
            {Object.entries(VIDEO_TYPES).map(([k, v]) => chip(href({ type: k }), v, sp.type === k))}
          </div>
        </div>
        <div className="conteneur pb-16">
          {videos.length ? (
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => <li key={v.id}><VideoCard v={v} /></li>)}
            </ul>
          ) : (
            <EmptyState title="Pas encore de vidéo dans cette rubrique" action={{ href: "/videos/partager", label: "Partager une vidéo" }}>
              Les vidéos des éditions précédentes sont ajoutées par l'équipe et par le public, après validation.
            </EmptyState>
          )}
        </div>
        <section className="conteneur pb-20">
          <div className="degrade-orange flex flex-col gap-6 rounded-[2rem] p-8 text-encre sm:flex-row sm:items-center sm:justify-between sm:p-12">
            <div>
              <h2 className="t-titre text-3xl sm:text-4xl">Vous avez filmé une édition ?</h2>
              <p className="mt-2 max-w-xl font-medium">Discours, finale, coulisses : envoyez vos vidéos, l'équipe les publie après vérification.</p>
            </div>
            <Link href="/videos/partager" className="btn bg-encre text-white hover:bg-salle">Envoyer ma vidéo</Link>
          </div>
        </section>
      </div>
    </>
  );
}
