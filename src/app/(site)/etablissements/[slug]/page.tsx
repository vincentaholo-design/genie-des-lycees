import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CandidateCard } from "@/components/ui/CandidateCard";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { SmartImage } from "@/components/ui/SmartImage";
import { getSchoolBySlug } from "@/lib/queries";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = await getSchoolBySlug((await params).slug);
  return s ? { title: s.name, description: `${s.name}, ${s.city ?? ""} — candidats au concours Génie des Lycées ORATHON.` } : {};
}

export default async function SchoolPage({ params }: P) {
  const school = await getSchoolBySlug((await params).slug);
  if (!school) notFound();
  const years = [...new Set(school.candidates.map((c) => c.editionTitle))];
  return (
    <>
      <PageHeader
        title={school.name}
        intro={
          <p className="flex flex-wrap items-center gap-2">
            {[school.city, school.region].filter(Boolean).join(", ")}
            {school.isDemo && <DemoBadge />}
          </p>
        }
        aside={
          school.logoUrl ? (
            <div className="relative size-28 overflow-hidden rounded-xl bg-ivoire p-3">
              <SmartImage src={school.logoUrl} alt={`Logo de ${school.name}`} fill sizes="7rem" className="object-contain p-2" />
            </div>
          ) : undefined
        }
      />
      <div className="papier">
        <div className="conteneur grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr]">
          <p className="max-w-[65ch] text-lg leading-relaxed">{school.description ?? "La présentation de l'établissement sera publiée prochainement."}</p>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gris">Participations</h2>
            <ul className="flex flex-wrap gap-2">
              {school.editions.map((e) => (
                <li key={e.slug}>
                  <Link href={`/editions/${e.slug}`} className="btn btn-contour !min-h-10 !py-2">{e.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {years.map((y) => (
          <section key={y} className="border-t border-ivoire-3">
            <div className="conteneur py-12">
              <h2 className="t-titre mb-8 text-4xl">Candidats · {y}</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                {school.candidates.filter((c) => c.editionTitle === y).map((c) => <CandidateCard key={c.id} c={c} />)}
              </div>
            </div>
          </section>
        ))}
        {!years.length && <p className="conteneur pb-16 text-gris">Aucun candidat publié pour cet établissement.</p>}
      </div>
    </>
  );
}
