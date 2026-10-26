import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SmartImage } from "@/components/ui/SmartImage";
import { YouTube } from "@/components/ui/YouTube";
import { listTestimonials } from "@/lib/queries";

export const metadata: Metadata = { title: "Témoignages" };

export default async function TestimonialsPage() {
  const list = await listTestimonials();
  return (
    <>
      <PageHeader title="Témoignages" image={photos.publicRires} intro="Anciens candidats, lauréats, enseignants, organisateurs et partenaires racontent ce que le concours leur a apporté." />
      <div className="papier">
        <div className="conteneur py-14">
          {list.length ? (
            <ul className="columns-1 gap-10 md:columns-2">
              {list.map((t, i) => (
                <li key={t.id} className="mb-12 break-inside-avoid border-t border-ivoire-3 pt-8">
                  <figure>
                    {t.youtubeId && <div className="mb-5"><YouTube id={t.youtubeId} title={`Témoignage de ${t.name}`} /></div>}
                    <blockquote className={`t-citation ${i % 3 === 0 ? "text-3xl sm:text-4xl" : "text-2xl"}`}>« {t.quote} »</blockquote>
                    <figcaption className="mt-5 flex items-center gap-3">
                      {t.portraitUrl && (
                        <span className="relative size-12 overflow-hidden rounded-full bg-ivoire-2">
                          <SmartImage src={t.portraitUrl} alt="" fill sizes="3rem" className="object-cover" />
                        </span>
                      )}
                      <span>
                        <span className="flex items-center gap-2 font-semibold">{t.name} {t.isDemo && <DemoBadge />}</span>
                        <span className="text-sm text-gris">{[t.role, t.organisation].filter(Boolean).join(" · ")}</span>
                      </span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Les premiers témoignages arrivent" action={{ href: "/contact", label: "Partager le vôtre" }}>
              Vous avez participé au concours ? Racontez-nous.
            </EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
