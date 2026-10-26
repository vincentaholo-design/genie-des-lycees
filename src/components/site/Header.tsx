"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { brand } from "@/config/media";
import { desktopNav } from "@/config/nav";
import { cx } from "@/lib/utils";
import { MenuSheet } from "./MenuSheet";

/** Pages qui commencent sur fond clair (pas de bandeau bleu) : la barre y prend un ton foncé. */
const LIGHT_TOP = [/^\/videos\/(?!partager$)[^/]+$/, /^\/actualites\/[^/]+$/];

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className={cx("size-3 transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m3 4.5 3 3 3-3" />
    </svg>
  );
}

/**
 * En-tête transparent posé sur le bandeau photo : logo blanc, liens blancs avec menus déroulants,
 * « Vote du public » mis en avant, recherche et bouton « S'inscrire ».
 * Au défilement, la barre devient une pilule bleue en verre dépoli pour rester lisible.
 */
export function Header({ voteOpen }: { voteOpen: boolean }) {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const light = LIGHT_TOP.some((r) => r.test(path)) && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpenMenu(null), [path]);

  useEffect(() => {
    if (openMenu === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(null);
    const onClick = (e: MouseEvent) => navRef.current && !navRef.current.contains(e.target as Node) && setOpenMenu(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [openMenu]);

  const enter = (i: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(i);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };
  const isActive = (href: string, children?: { href: string }[]) =>
    [href, ...(children?.map((c) => c.href) ?? [])].some((h) => path === h || (h !== "/" && path.startsWith(`${h}/`)));

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-or focus:px-4 focus:py-2 focus:text-encre">
        Aller au contenu
      </a>
      <div
        className={cx(
          "mx-auto flex h-16 max-w-[80rem] items-center gap-3 rounded-full px-3 transition-[background-color,box-shadow,backdrop-filter] duration-300 sm:px-5 lg:h-[4.5rem] lg:px-7",
          scrolled ? "bg-salle/80 shadow-[0_14px_34px_-14px_rgba(10,36,112,0.6)] ring-1 ring-white/10 backdrop-blur-xl" : "bg-transparent",
          light ? "text-encre" : "text-white",
        )}
      >
        <Link href="/" className="shrink-0" aria-label="Génie des Lycées — accueil">
          <Image src={light ? brand.logoColor : brand.logoIvory} alt="Génie des Lycées" width={124} height={44} priority className="h-9 w-auto lg:h-10" />
        </Link>

        <nav ref={navRef} aria-label="Navigation principale" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {desktopNav.map((item, i) => {
            const active = isActive(item.href, item.children);
            if (item.highlight) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "ml-2 flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] font-semibold transition-colors",
                    light ? "bg-ivoire-2 text-tribune hover:bg-ivoire-3" : "bg-white/85 text-encre hover:bg-white",
                  )}
                >
                  {item.label}
                  {voteOpen && <span className="point-direct" aria-label="(ouvert)" />}
                </Link>
              );
            }
            if (!item.children) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx("rounded-full px-3.5 py-2 text-[0.9rem] font-medium transition-colors", light ? "hover:bg-ivoire-2" : "hover:bg-white/10", active && "font-bold")}
                >
                  {item.label}
                </Link>
              );
            }
            const open = openMenu === i;
            return (
              <div key={item.href} className="relative" onMouseEnter={() => enter(i)} onMouseLeave={leave}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`sous-menu-${i}`}
                  onClick={() => setOpenMenu(open ? null : i)}
                  className={cx(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.9rem] font-medium transition-colors",
                    light ? "hover:bg-ivoire-2" : "hover:bg-white/10",
                    (open || active) && (light ? "bg-ivoire-2" : "bg-white/10"),
                    active && "font-bold",
                  )}
                >
                  {item.label}
                  <span className={light ? "text-tribune" : "text-or"}>
                    <Chevron open={open} />
                  </span>
                </button>
                <div
                  id={`sous-menu-${i}`}
                  hidden={!open}
                  className="absolute left-1/2 top-full z-50 w-[19rem] -translate-x-1/2 pt-3"
                >
                  <ul className="rounded-[1.4rem] bg-white p-2 text-encre shadow-[0_24px_50px_-18px_rgba(10,36,112,0.45)] ring-1 ring-ivoire-3">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          aria-current={path === c.href ? "page" : undefined}
                          className="block rounded-2xl px-4 py-2.5 transition-colors hover:bg-ivoire-2 aria-[current=page]:bg-ivoire-2"
                        >
                          <span className="block text-[0.95rem] font-semibold">{c.label}</span>
                          {c.hint && <span className="block text-[0.8rem] text-gris">{c.hint}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href="/recherche"
            aria-label="Rechercher sur le site"
            className={cx(
              "grid size-11 place-items-center rounded-full transition-colors",
              light ? "bg-ivoire-2 text-encre hover:bg-ivoire-3" : "bg-white/85 text-encre hover:bg-white",
            )}
          >
            <svg viewBox="0 0 20 20" className="size-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="8.75" cy="8.75" r="5.75" />
              <path d="m13.2 13.2 4 4" strokeLinecap="round" />
            </svg>
          </Link>
          <Link href="/inscription" className="btn btn-or hidden !min-h-11 !px-6 !py-2 sm:inline-flex">
            S'inscrire
          </Link>
          <div className="lg:hidden">
            <MenuSheet voteOpen={voteOpen} tone={light ? "light" : "dark"} />
          </div>
        </div>
      </div>
    </header>
  );
}
