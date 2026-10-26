import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CandidateCard } from "@/components/ui/CandidateCard";
import { Markdown } from "@/components/ui/Markdown";
import { getCategoryBySlug, getCurrentEdition, listCandidates } from "@/lib/queries";

type P = { params: Promise<{ categorie: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await getCategoryBySlug((await params).categorie);
  return c ? { title: `Catégorie ${c.name}`, description: c.shortDescription ?? undefined } : {};
}

export default async function CategoryPage({ params }: P) {
  const cat = await getCategoryBySlug((await params).categorie);
  if (!cat) notFound();
  const edition = await getCurrentEdition();
  const candidates = edition ? await listCandidates({ editionId: edition.id, category: cat.slug }) : [];
  return (
    <>
      <PageHeader title={`Catégorie ${cat.name}`} intro={cat.shortDescription} />
      <div className="papier">
        <section className="conteneur grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Markdown>{cat.description}</Markdown>
          </div>
          <dl className="space-y-6 self-start rounded-xl bg-ivoire-2 p-6">
            <div>
              <dt className="text-sm text-gris">Qui peut participer</dt>
              <dd className="mt-1 font-medium">{cat.eligibility}</dd>
            </div>
            <div>
              <dt className="text-sm text-gris">Format</dt>
              <dd className="mt-1 font-medium">
                {cat.teamMode ? `En équipe${cat.teamSizeMin ? ` de ${cat.teamSizeMin} à ${cat.teamSizeMax} membres` : ""}` : "Individuel"}
              </dd>
            </div>
            <Link href={`/inscription?categorie=${cat.slug}`} className="btn btn-tribune w-full">
              S'inscrire en catégorie {cat.name}
            </Link>
          </dl>
        </section>
        {edition && (
          <section className="border-t border-ivoire-3">
            <div className="conteneur py-16 sm:py-24">
              <h2 className="t-titre mb-8 text-[clamp(2.2rem,5vw,3.8rem)]">
                {cat.teamMode ? "Équipes" : "Candidats"} · {edition.title}
              </h2>
              {candidates.length ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                  {candidates.map((c) => (
                    <CandidateCard key={c.id} c={c} />
                  ))}
                </div>
              ) : (
                <p className="text-gris">Les candidats de cette catégorie seront publiés après la sélection.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
