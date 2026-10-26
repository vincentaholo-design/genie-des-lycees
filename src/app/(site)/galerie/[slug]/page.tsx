import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/ui/Lightbox";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAlbumBySlug } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { ALBUM_TYPES } from "@/config/labels";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await getAlbumBySlug((await params).slug);
  return a ? { title: `${a.title} — Galerie`, openGraph: a.coverUrl ? { images: [a.coverUrl] } : undefined } : {};
}

export default async function AlbumPage({ params }: P) {
  const album = await getAlbumBySlug((await params).slug);
  if (!album) notFound();
  const downloadable = album.photos.some((p) => p.downloadable);
  return (
    <>
      <PageHeader
        title={album.title}
        intro={
          <>
            <p className="flex flex-wrap items-center gap-2">
              <Link href="/galerie" className="lien">Galerie</Link>
              <span>· {ALBUM_TYPES[album.type]}</span>
              {album.eventDate && <span>· {formatDate(album.eventDate)}</span>}
              {album.editionSlug && <>· <Link className="lien" href={`/editions/${album.editionSlug}`}>{album.editionTitle}</Link></>}
              {album.isDemo && <DemoBadge />}
            </p>
            {album.description && <p className="mt-2">{album.description}</p>}
          </>
        }
      />
      <div className="papier">
        <div className="conteneur py-10 pb-20">
          <p className="mb-6 text-sm text-gris">
            {album.photos.length} photos · touchez une photo pour l'agrandir{downloadable ? ", puis « Télécharger » pour l'enregistrer" : ""}.
          </p>
          <Gallery photos={album.photos.map((p) => ({ id: p.id, url: p.url, thumbUrl: p.thumbUrl, alt: p.alt, caption: p.caption, credit: p.credit, downloadable: p.downloadable }))} />
        </div>
      </div>
    </>
  );
}
