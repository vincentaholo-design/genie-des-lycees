import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { Timeline } from "@/components/ui/Timeline";
import { Markdown } from "@/components/ui/Markdown";
import { getCurrentEdition, listCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Le concours", description: "Règles, catégories, étapes et critères d'évaluation du concours Génie des Lycées ORATHON." };

export default async function ConcoursPage() {
  const [edition, categories] = await Promise.all([getCurrentEdition(), listCategories()]);
  return (
    <>
      <PageHeader
        title="Le concours"
        image={photos.orateurPlaidoirie}
        intro="Des candidats montent seuls ou en équipe à la tribune, défendent un sujet devant un jury, et le public suit chaque étape jusqu'à la finale."
      />
      <div className="papier">
        <section className="conteneur py-16 sm:py-24">
          <h2 className="t-titre mb-10 text-[clamp(2.2rem,5vw,3.8rem)]">Deux catégories</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((c) => (
              <Link key={c.id} href={`/concours/${c.slug}`} className="carte group p-6 transition-transform hover:-translate-y-1 sm:p-10">
                <p className="t-voix text-[clamp(2.2rem,5vw,3.4rem)] text-tribune">{c.name}</p>
                <p className="mt-4 text-lg">{c.shortDescription}</p>
                <p className="mt-3 text-gris">{c.eligibility}</p>
                <span className="lien mt-5 inline-block text-sm font-semibold text-tribune">Format et conditions</span>
              </Link>
            ))}
          </div>
        </section>

        {edition && (
          <>
            <section className="border-t border-ivoire-3">
              <div className="conteneur py-16 sm:py-24">
                <h2 className="t-titre mb-3 text-[clamp(2.2rem,5vw,3.8rem)]">Les étapes</h2>
                <p className="mb-10 text-gris">Calendrier de l'{edition.title.toLowerCase()}.</p>
                <Timeline steps={edition.steps} />
              </div>
            </section>
            <section className="border-t border-ivoire-3">
              <div className="conteneur grid gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1.4fr]">
                <div>
                  <h2 className="t-titre text-[clamp(2.2rem,5vw,3.8rem)]">Ce que le jury regarde</h2>
                  <p className="mt-4 text-gris">La pondération exacte est fixée par le règlement de chaque édition.</p>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {edition.criteria.map((c) => (
                    <div key={c.label} className="carte p-6">
                      <dt className="t-sous-titre text-xl">{c.label}</dt>
                      <dd className="mt-2 text-gris">{c.description}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
            <section className="border-t border-ivoire-3">
              <div className="conteneur grid gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1.4fr]">
                <h2 className="t-titre text-[clamp(2.2rem,5vw,3.8rem)]">Règlement</h2>
                <div>
                  <Markdown>{edition.rules}</Markdown>
                  <Link href="/edition-en-cours#reglement" className="btn btn-contour mt-8">
                    Règlement complet de l'édition
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
