import Link from "next/link";
import Image from "next/image";
import { brand } from "@/config/media";
import { primaryNav } from "@/config/nav";
import { MenuSheet } from "./MenuSheet";
import { NavLink } from "./NavLink";

/** Barre de navigation blanche flottante, posée sur le bandeau bleu. */
export function Header({ voteOpen }: { voteOpen: boolean }) {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-or focus:px-4 focus:py-2 focus:text-encre">
        Aller au contenu
      </a>
      <div className="mx-auto flex h-16 max-w-[78rem] items-center gap-4 rounded-full bg-white/95 pl-5 pr-2 shadow-[0_10px_30px_-12px_rgba(16,51,139,0.35)] ring-1 ring-ivoire-3 backdrop-blur lg:h-[4.5rem] lg:pl-7">
        <Link href="/" className="shrink-0" aria-label="Génie des Lycées — accueil">
          <Image src={brand.logoColor} alt="Génie des Lycées" width={124} height={44} priority className="h-9 w-auto lg:h-10" />
        </Link>
        <nav aria-label="Navigation principale" className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
          {primaryNav.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
              {item.href === "/vote" && voteOpen && <span className="point-direct ml-1.5" aria-label="(ouvert)" />}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link href="/inscription" className="btn btn-tribune btn-fleche hidden !min-h-11 !py-2 sm:inline-flex">
            S'inscrire
          </Link>
          <MenuSheet voteOpen={voteOpen} />
        </div>
      </div>
    </header>
  );
}
