"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SmartImage } from "./SmartImage";

type Photo = { id: string; url: string; thumbUrl: string | null; alt: string; caption: string | null; credit: string | null; downloadable: boolean };

/** Grille éditoriale + visionneuse plein écran (clavier, balayage, légendes, crédits). */
export function Gallery({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const close = useCallback(() => setIndex(null), []);
  const go = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [index, close, go]);

  const p = index !== null ? photos[index] : null;
  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {photos.map((ph, i) => (
          <li key={ph.id} className="mb-3 break-inside-avoid">
            <button type="button" onClick={() => setIndex(i)} className="relative block w-full overflow-hidden rounded-[1.25rem] bg-ivoire-2" style={{ aspectRatio: i % 3 === 0 ? "3 / 4" : "4 / 3" }} aria-label={`Agrandir : ${ph.alt}`}>
              <SmartImage src={ph.thumbUrl ?? ph.url} alt={ph.alt} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-500 hover:scale-[1.03]" />
            </button>
          </li>
        ))}
      </ul>
      {p && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${index! + 1} sur ${photos.length}`}
          className="fixed inset-0 z-50 flex flex-col bg-salle/95 text-white outline-none backdrop-blur"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current === null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touch.current = null;
          }}
        >
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-fumee">{index! + 1} / {photos.length}</span>
            <div className="flex gap-2">
              {p.downloadable && <a href={p.url} download className="btn btn-or !min-h-10 !py-2">Télécharger</a>}
              <button type="button" onClick={close} className="btn btn-blanc !min-h-10 !py-2">Fermer</button>
            </div>
          </div>
          <div className="relative flex-1">
            <SmartImage key={p.id} src={p.url} alt={p.alt} fill sizes="100vw" className="object-contain" />
            <button type="button" onClick={() => go(-1)} aria-label="Photo précédente" className="absolute left-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-salle/70 text-2xl">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Photo suivante" className="absolute right-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-salle/70 text-2xl">›</button>
          </div>
          <div className="conteneur py-4 text-sm">
            {p.caption && <p>{p.caption}</p>}
            {p.credit && <p className="text-fumee">{p.credit}</p>}
          </div>
        </div>
      )}
    </>
  );
}
