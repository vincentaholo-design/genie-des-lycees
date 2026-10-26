import Link from "next/link";
import { DemoBadge } from "./DemoBadge";
import { VIDEO_TYPES } from "@/config/labels";
import { formatDuration } from "@/lib/utils";

type V = {
  slug: string;
  title: string;
  type: string;
  youtubeId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  editionTitle: string | null;
  candidateName: string | null;
  isDemo: boolean;
  downloadable?: boolean;
  fileKey?: string | null;
};

export function VideoCard({ v }: { v: V }) {
  const thumb = v.thumbnailUrl ?? (v.youtubeId ? `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg` : null);
  return (
    <article className="group relative">
      <div className="relative aspect-video overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-tribune to-salle-2">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <span aria-hidden className="t-marque absolute left-5 top-4 text-lg text-white/70">GDL</span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-salle/60 via-transparent" />
        <span className="absolute bottom-3 left-3 grid size-12 place-items-center rounded-full bg-white text-tribune shadow-lg transition-transform group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="ml-0.5 size-5" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        </span>
        <span className="absolute bottom-3 right-3 flex gap-1.5">
          {v.fileKey && v.downloadable && <span className="pastille bg-or !py-1 text-encre">Téléchargeable</span>}
          {formatDuration(v.durationSeconds) && <span className="pastille bg-salle/80 !py-1 text-white">{formatDuration(v.durationSeconds)}</span>}
        </span>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-2 px-1 text-sm text-gris">
        <span className="font-semibold text-tribune">{VIDEO_TYPES[v.type]}</span>
        {v.editionTitle ? <span>· {v.editionTitle}</span> : null}
        {v.isDemo && <DemoBadge />}
      </p>
      <h3 className="t-sous-titre mt-1 px-1 text-lg">
        <Link href={`/videos/${v.slug}`} className="after:absolute after:inset-0 group-hover:text-tribune">{v.title}</Link>
      </h3>
      {v.candidateName && <p className="px-1 text-sm text-gris">{v.candidateName}</p>}
    </article>
  );
}
