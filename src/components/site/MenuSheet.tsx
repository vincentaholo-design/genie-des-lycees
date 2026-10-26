"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fullNav } from "@/config/nav";
import { socials } from "@/config/media";

/** Plan du site plein écran, présenté comme le programme de la soirée. */
export function MenuSheet({ voteOpen }: { voteOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      openRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={openRef} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="plan-du-site" className="btn !min-h-11 bg-ivoire-2 !px-4 !py-2 text-encre hover:bg-ivoire-3">
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h14M3 10h14M3 14h9" />
        </svg>
        Menu
      </button>
      {open && (
        <div id="plan-du-site" role="dialog" aria-modal="true" aria-label="Plan du site" className="scene fixed inset-0 z-50 overflow-y-auto">
          <div className="conteneur flex h-16 items-center justify-between lg:h-[4.5rem]">
            <span className="t-titre text-2xl">Menu</span>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="btn btn-blanc !min-h-11 !px-5 !py-2">
              Fermer
            </button>
          </div>
          <div className="conteneur grid gap-10 pb-16 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {fullNav.map((group) => (
              <div key={group.title}>
                <p className="mb-3 text-sm font-semibold text-or-clair">{group.title}</p>
                <ul className="space-y-1">
                  {group.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="t-sous-titre flex items-center gap-2 py-1.5 text-[1.45rem] hover:text-or-clair" aria-current={path === l.href ? "page" : undefined}>
                        {l.label}
                        {l.href === "/vote" && voteOpen && <span className="point-direct" aria-label="(ouvert)" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="conteneur flex flex-wrap gap-x-6 gap-y-2 border-t border-white/20 py-6 text-sm text-fumee">
            <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white">Facebook AJ3C</a>
            <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-white">TikTok</a>
            <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-white">YouTube</a>
          </div>
        </div>
      )}
    </>
  );
}
