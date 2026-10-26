"use client";

import { useState } from "react";

/** Partage : WhatsApp (principal au Togo), Facebook, copie du lien. Chaque bouton agit réellement. */
export function ShareLinks({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="mr-1 opacity-70">Partager</span>
      <a className="btn btn-contour !min-h-10 !px-4 !py-2" href={`https://wa.me/?text=${enc(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
      <a className="btn btn-contour !min-h-10 !px-4 !py-2" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
      <button
        type="button"
        className="btn btn-contour !min-h-10 !px-4 !py-2"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt("Copiez le lien :", url);
          }
        }}
      >
        {copied ? "Lien copié" : "Copier le lien"}
      </button>
    </div>
  );
}
