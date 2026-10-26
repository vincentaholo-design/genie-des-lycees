import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartImage } from "@/components/ui/SmartImage";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { listAlbums, listEditions } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { ALBUM_TYPES } from "@/config/labels";
import { photos } from "@/config/media";

export const metadata: Metadata = { title: "Galerie photos" };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ edition?: string; type?: string }> }) {
  const sp = await searchParams;
  const editions = await listEditions();
  const ed = editions.find((e) => e.slug === sp.edition);
  const albums = await listAlbums({ editionId: ed?.id, type: sp.type });
  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ edition: sp.edition, type: sp.type, ...o }).filter(([, v]) => v) as [string, string][]);
    return `/galerie${p.size ? `?${p}` : ""}`;
  };
  const chip = (to: string, label: string, active: boolean) => (
    <Link key={to + label} href={to} aria-current={active ? "page" : undefined} className={`pastille !py-2 !text-sm ${active ? "bg-tribune text-white" : "bg-ivoire-2 text-encre hover:bg-ivoire-3"}`}>{label}</Link>
  );
  return (
    <>
      <PageHeader title="Galerie" intro="Les albums photo de chaque édition : les orateurs à la tribune, la remise des prix, le public, les coulisses." image={photos.laureatsTrophee} />
      <div className="papier">
        <div className="conteneur space-y-3 py-10">
          <div className="flex flex-wrap gap-2">
            {chip(q({ edition: undefined }), "Toutes les éditions", !sp.edition)}
            {editions.map((e) => chip(q({ edition: e.slug }), e.title, sp.edition === e.slug))}
          </div>
          <div className="flex flex-wrap gap-2">
            {chip(q({ type: undefined }), "Tous les moments", !sp.type)}
            {Object.entries(ALBUM_TYPES).filter(([k]) => k !== "autre").map(([k, v]) => chip(q({ type: k }), v, sp.type === k))}
          </div>
        </div>
        <div className="conteneur pb-20">
          {albums.length ? (
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((a) => (
                <li key={a.id} className="group relative">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-ivoire-2">
                    <SmartImage src={a.coverUrl} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    <span className="pastille absolute bottom-3 left-3 bg-white text-encre">{a.photoCount} photos</span>
                  </div>
                  <p className="mt-3 flex items-center gap-2 px-1 text-sm text-gris">
                    <span className="font-semibold text-tribune">{ALBUM_TYPES[a.type]}</span>
                    {a.editionTitle ? `· ${a.editionTitle}` : ""}
                    {a.eventDate ? ` · ${formatDate(a.eventDate)}` : ""}
                    {a.isDemo && <DemoBadge />}
                  </p>
                  <h2 className="t-sous-titre mt-1 px-1 text-xl">
                    <Link href={`/galerie/${a.slug}`} className="after:absolute after:inset-0 group-hover:text-tribune">{a.title}</Link>
                  </h2>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aucun album pour ce filtre" action={{ href: "/galerie", label: "Voir tous les albums" }} />
          )}
        </div>
      </div>
    </>
  );
}
