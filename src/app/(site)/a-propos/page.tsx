import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { brand, socials } from "@/config/media";
import { getSetting } from "@/lib/queries";

export const metadata: Metadata = { title: "À propos", description: "Génie des Lycées ORATHON, concours national d'éloquence et de plaidoirie organisé par l'AJ3C." };

const isPlaceholder = (t?: string) => !t || t.startsWith("À compléter");

export default async function AboutPage() {
  const about = await getSetting("about");
  return (
    <>
      <PageHeader title="À propos" intro={about.mission} image={photos.laureatsTrophee} />
      <div className="papier">
        <section className="conteneur grid gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-6">
            <Image src={brand.logoColor} alt="Génie des Lycées" width={360} height={127} className="h-auto w-72" />
            <div className="flex items-center gap-4">
              <Image src={brand.orathon} alt="ORATHON" width={200} height={58} className="h-12 w-auto" />
              <Image src={brand.aj3c} alt="AJ3C" width={80} height={92} className="h-20 w-auto" />
            </div>
          </div>
          <div className="prose-gdl">
            <p className="t-citation !text-3xl">Génie des Lycées ORATHON est un concours national d'éloquence et de plaidoirie.</p>
            <p>
              Il est organisé par l'<strong>AJ3C</strong>, l'Association des Jeunes Communicateurs pour le Changement de Comportement. Sa mission : renforcer les capacités des jeunes lycéens, et de tous ceux qu'intéresse l'éloquence, en prise de parole et en leadership.
            </p>
            {about.motto && (
              <p>
                Sa devise : <strong>{about.motto}</strong>
              </p>
            )}
          </div>
        </section>

        <section className="border-t border-ivoire-3">
          <div className="conteneur grid gap-12 py-16 sm:py-24 lg:grid-cols-3">
            <Block title="Vision" text={about.vision} />
            <div>
              <h2 className="t-titre mb-4 text-4xl">Objectifs</h2>
              {about.objectives?.length ? (
                <ul className="space-y-3">
                  {about.objectives.map((o) => (
                    <li key={o} className={`border-l-2 pl-4 ${isPlaceholder(o) ? "border-dashed border-ivoire-3 text-gris italic" : "border-or"}`}>
                      {o}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Block title="Histoire" text={about.history} />
          </div>
        </section>

        <section className="border-t border-ivoire-3">
          <div className="conteneur flex flex-col gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-lg">Suivez le concours au quotidien sur les réseaux de l'association.</p>
            <div className="flex flex-wrap gap-3">
              <a className="btn btn-contour" href={socials.facebook} target="_blank" rel="noopener noreferrer">Facebook AJ3C</a>
              <a className="btn btn-contour" href={socials.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>
              <a className="btn btn-contour" href={socials.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>
              <Link className="btn btn-tribune" href="/contact">Nous écrire</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Block({ title, text }: { title: string; text?: string }) {
  return (
    <div>
      <h2 className="t-titre mb-4 text-4xl">{title}</h2>
      <p className={isPlaceholder(text) ? "rounded-lg border border-dashed border-ivoire-3 p-4 italic text-gris" : "text-lg leading-relaxed"}>{text}</p>
    </div>
  );
}
