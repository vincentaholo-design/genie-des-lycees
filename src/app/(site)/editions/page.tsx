import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { SmartImage } from "@/components/ui/SmartImage";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { getEditionCounts, listEditions } from "@/lib/queries";

export const metadata: Metadata = { title: "Archives des éditions" };

export default async function EditionsPage() {
  const editions = await listEditions();
  const counts = await Promise.all(editions.map((e) => getEditionCounts(e.id)));
  return (
    <>
      <PageHeader title="Les éditions" intro="Chaque édition garde sa page : thème, calendrier, candidats, photos, vidéos et palmarès." image={photos.publicRires} />
      <div className="papier">
        <ol className="conteneur divide-y divide-ivoire-3 py-10">
          {editions.map((e, i) => (
            <li key={e.id} className="group relative grid gap-6 py-8 sm:grid-cols-[10rem_1fr_16rem] sm:items-center">
              <p className="t-chiffre text-7xl text-tribune sm:text-8xl">{e.number ?? e.year}<sup className="text-3xl">{e.number ? (e.number === 1 ? "re" : "e") : ""}</sup></p>
              <div>
                <h2 className="t-sous-titre flex flex-wrap items-center gap-3 text-3xl">
                  <Link href={e.status === "en_cours" ? "/edition-en-cours" : `/editions/${e.slug}`} className="after:absolute after:inset-0 group-hover:text-tribune">
                    {e.theme ? `« ${e.theme} »` : e.title}
                  </Link>
                  {e.isDemo && <DemoBadge />}
                </h2>
                <p className="mt-2 text-gris">
                  {e.status === "en_cours" ? "En cours · " : ""}
                  {counts[i].candidates ? `${counts[i].candidates} candidats · ${counts[i].schools} établissements` : "Photos, vidéos et palmarès"}
                </p>
              </div>
              <div className="relative hidden aspect-[3/2] overflow-hidden rounded-[1.25rem] bg-ivoire-2 sm:block">
                <SmartImage src={e.coverUrl} alt="" fill sizes="16rem" className="object-cover transition-transform duration-500 group-hover:scale-105" fallback={<div className="absolute inset-0 bg-ivoire-2" />} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
