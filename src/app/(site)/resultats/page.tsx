import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterField, Filters } from "@/components/ui/Filters";
import { ResultsTable } from "@/components/edition/ResultsTable";
import { listCategories, listEditions, listPublishedResults } from "@/lib/queries";

export const metadata: Metadata = { title: "Résultats et palmarès" };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [editions, categories, results] = await Promise.all([
    listEditions(),
    listCategories(),
    listPublishedResults({ editionSlug: sp.edition || undefined, category: sp.categorie || undefined, q: sp.q || undefined }),
  ]);
  return (
    <>
      <PageHeader title="Palmarès" intro="Les résultats officiels, publiés après validation par l'organisation." image={photos.remiseDesPrix} />
      <div className="papier">
        <div className="conteneur py-10">
          <Filters action="/resultats" resetHref="/resultats" active={Boolean(sp.edition || sp.categorie || sp.q)}>
            <FilterField label="Candidat ou établissement" name="q" grow>
              <input id="f-q" name="q" type="search" defaultValue={sp.q} className="champ" />
            </FilterField>
            <FilterField label="Année" name="edition">
              <select id="f-edition" name="edition" defaultValue={sp.edition ?? ""} className="champ">
                <option value="">Toutes</option>
                {editions.map((e) => <option key={e.id} value={e.slug}>{e.title}</option>)}
              </select>
            </FilterField>
            <FilterField label="Catégorie" name="categorie">
              <select id="f-categorie" name="categorie" defaultValue={sp.categorie ?? ""} className="champ">
                <option value="">Toutes</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </FilterField>
          </Filters>
          <div className="mt-12">
            {results.length ? <ResultsTable results={results} showEdition /> : <EmptyState title="Aucun résultat publié pour cette recherche" />}
          </div>
        </div>
      </div>
    </>
  );
}
