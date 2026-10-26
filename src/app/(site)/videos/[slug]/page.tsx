import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { YouTube } from "@/components/ui/YouTube";
import { VideoCard } from "@/components/ui/VideoCard";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { getVideoBySlug } from "@/lib/queries";
import { VIDEO_TYPES } from "@/config/labels";
import { formatDuration } from "@/lib/utils";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const r = await getVideoBySlug((await params).slug);
  return r ? { title: r.video.title, description: r.video.description ?? undefined, openGraph: r.video.youtubeId ? { images: [`https://i.ytimg.com/vi/${r.video.youtubeId}/hqdefault.jpg`] } : undefined } : {};
}

export default async function VideoPage({ params }: P) {
  const r = await getVideoBySlug((await params).slug);
  if (!r) notFound();
  const { video: v, similar } = r;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const fileSrc = v.fileKey ? `/api/videos/${v.id}/fichier` : v.fileUrl;
  return (
    <div className="papier pt-28 sm:pt-32">
      <div className="conteneur grid gap-10 pb-12 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {v.provider === "youtube" && v.youtubeId ? (
            <YouTube id={v.youtubeId} title={v.title} />
          ) : fileSrc ? (
            <video controls preload="metadata" playsInline poster={v.thumbnailUrl ?? undefined} className="aspect-video w-full rounded-[1.5rem] bg-encre" src={fileSrc}>
              Votre navigateur ne lit pas cette vidéo. <a href={`${fileSrc}?telecharger=1`}>Téléchargez-la</a>.
            </video>
          ) : null}
        </div>
        <div>
          <Link href="/videos" className="lien text-sm text-gris">Vidéothèque</Link>
          <h1 className="t-titre mt-4 text-[clamp(2rem,4vw,3rem)]">{v.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gris">
            <span className="font-semibold text-tribune">{VIDEO_TYPES[v.type]}</span>
            {v.editionTitle ? `· ${v.editionTitle}` : ""}
            {formatDuration(v.durationSeconds) ? ` · ${formatDuration(v.durationSeconds)}` : ""}
            {v.isDemo && <DemoBadge />}
          </p>
          {v.description && <p className="mt-5 text-encre/85">{v.description}</p>}
          <div className="mt-4 space-y-1 text-sm">
            {v.candidateSlug && <p>Candidat : <Link className="lien text-tribune" href={`/candidats/${v.candidateSlug}`}>{v.candidateName}</Link></p>}
            {v.schoolName && <p>Établissement : {v.schoolName}</p>}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {v.fileKey && v.downloadable && (
              <a href={`/api/videos/${v.id}/fichier?telecharger=1`} download className="btn btn-tribune btn-fleche">
                Télécharger{v.fileSize ? ` (${Math.round(v.fileSize / 1024 / 1024)} Mo)` : ""}
              </a>
            )}
            {v.youtubeId && (
              <a href={`https://www.youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener noreferrer" className="btn btn-contour">Ouvrir sur YouTube</a>
            )}
          </div>
          <div className="mt-8"><ShareLinks url={`${siteUrl}/videos/${v.slug}`} text={v.title} /></div>
        </div>
      </div>
      {similar.length > 0 && (
        <section className="conteneur border-t border-ivoire-3 pb-20 pt-12">
          <h2 className="t-titre mb-8 text-3xl">À voir aussi</h2>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => <li key={s.id}><VideoCard v={s} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
