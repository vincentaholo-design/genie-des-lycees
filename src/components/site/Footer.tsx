import Image from "next/image";
import Link from "next/link";
import { brand, officialContact, socials } from "@/config/media";
import { fullNav } from "@/config/nav";
import type { AboutSettings, ContactSettings } from "@/lib/queries";

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  Facebook: <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3l1-4h-4V9c0-.6.4-1 1-1z" />,
  X: <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />,
  TikTok: <path d="M16 3c.4 2.6 2 4.3 4.5 4.6v3.5c-1.7 0-3.2-.5-4.5-1.4v6.2a6 6 0 1 1-6-6h.5v3.6a2.5 2.5 0 1 0 2 2.4V3H16z" />,
  YouTube: <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.4-1.2.4-3.8.4-3.8s0-2.6-.4-3.8zM10 15.2V8.8l5.2 3.2z" />,
};

export function Footer({ about, contact }: { about: AboutSettings; contact: ContactSettings }) {
  const email = contact.email || officialContact.email;
  const phone = contact.phone || officialContact.phone;
  const links: [string, string][] = [
    ["Facebook", socials.facebook],
    ["X", socials.x],
    ["TikTok", socials.tiktok],
    ["YouTube", socials.youtube],
  ];
  return (
    <footer className="px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="scene overflow-hidden rounded-[2rem]">
        <div className="conteneur py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
              <Image src={brand.logoIvory} alt="Génie des Lycées" width={200} height={70} className="h-14 w-auto sm:h-16" />
              {about.motto && <p className="t-titre mt-6 max-w-xl text-2xl sm:text-3xl">« {about.motto} »</p>}
            </div>
            <div className="flex flex-wrap items-center gap-4 lg:justify-end">
              <Image src={brand.orathon} alt="ORATHON" width={170} height={49} className="h-11 w-auto" />
              <span className="grid size-16 place-items-center rounded-full bg-white p-1.5">
                <Image src={brand.aj3c} alt="AJ3C — Association des Jeunes Communicateurs pour le Changement de Comportement" width={52} height={60} className="h-12 w-auto" />
              </span>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/15 pt-10 lg:grid-cols-[repeat(4,1fr)_1.3fr]">
            {fullNav.map((g) => (
              <div key={g.title}>
                <p className="mb-3 text-sm font-bold text-white">{g.title}</p>
                <ul className="space-y-2 text-sm text-fumee">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="hover:text-white">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="col-span-2 lg:col-span-1">
              <p className="mb-3 text-sm font-bold text-white">Nous joindre</p>
              <ul className="space-y-2 text-sm text-fumee">
                <li><a className="hover:text-white" href={`mailto:${email}`}>{email}</a></li>
                <li><a className="text-lg font-bold text-white" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a></li>
                {contact.address && <li>{contact.address}</li>}
              </ul>
              <div className="mt-4 flex items-center gap-2">
                {links.map(([name, href]) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className="grid size-10 place-items-center rounded-full bg-white/12 text-white hover:bg-white hover:text-salle-2">
                    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>{SOCIAL_ICONS[name]}</svg>
                  </a>
                ))}
                <span className="ml-1 text-sm text-fumee">{officialContact.handle}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-fumee sm:flex-row sm:justify-between">
            <p>Concours national d'éloquence et de plaidoirie · organisé par l'AJ3C</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/confidentialite" className="hover:text-white">Confidentialité</Link>
              <Link href="/admin" className="hover:text-white">Administration</Link>
              <span>© {new Date().getFullYear()} AJ3C</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
