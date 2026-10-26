"use client";

import { useState } from "react";

/**
 * Lecteur YouTube léger : seule la vignette se charge (≈ 30 Ko). Le lecteur complet
 * (≈ 1 Mo) n'est chargé qu'au clic — important sur les forfaits mobiles.
 * Domaine youtube-nocookie : pas de cookie publicitaire avant lecture.
 */
export function YouTube({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false);
  if (play)
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-[1.5rem] bg-black">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  return (
    <button type="button" onClick={() => setPlay(true)} className="group relative block aspect-video w-full overflow-hidden rounded-[1.5rem] bg-salle-2 text-left" aria-label={`Lire la vidéo : ${title}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-100" />
      <span className="absolute inset-0 bg-gradient-to-t from-salle/80 via-transparent" />
      <span className="absolute bottom-4 left-4 flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-white text-tribune">
          <svg viewBox="0 0 24 24" className="ml-1 size-6" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="text-sm font-semibold">Lire la vidéo</span>
      </span>
    </button>
  );
}
