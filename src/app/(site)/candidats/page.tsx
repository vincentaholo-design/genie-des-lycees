import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { CandidateCard } from "@/components/ui/CandidateCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterField, Filters } from "@/components/ui/Filters";
import { getCurrentEdition, listCandidates, listCategories, listEditions, listSchoolFacets, listSchools } from "@/lib/queries";

export const metadata: Metadata = { title: "Candidats", description: "Profils des candidats de Génie des Lycées ORATHON : recherche par nom, établissement, ville, catégorie et édition." };

type SP = { searchParams: Promise<Record<string, string | undefined>> };

export default async function CandidatesPage({ searchParams }: SP) {
  const sp = await searchParams;
  const current = await getCurrentEdition();
  const editionSlug = sp.edition ?? current?.slug;
  const [editions, categories, schools, facets] = await Promise.all([listEditions(), listCategories(), listSchools(), listSchoolFacets()]);
  const school = schools.find((s) => s.slug === sp.etablissement);
  const list = await listCandidates({
    editionSlug: editionSlug === "toutes" ? undefined : editionSlug,
    category: sp.categorie || undefined,
    schoolId: school?.id,
    city: sp.ville || undefined,
    q: sp.q || undefined,
  });
  const active = Boolean(sp.q || sp.categorie || sp.etablissement || sp.ville || (sp.edition && sp.edition !== current?.slug));

  return (
    <>
      <PageHeader
        title="Les candidats"
        image={photos.oratricePupitre}
        intro="Chaque orateur a sa fiche : parcours, présentation, citation, photos et vidéos."
        aside={
          <Link href="/candidats/par-etablissement" className="btn btn-contour">
            Trombinoscope par école
          </Link>
        }
      />
      <div className="papier">
        <div className="conteneur py-10 sm:py-14">
          <Filters action="/candidats" resetHref="/candidats" active={active}>
            <FilterField label="Nom, école ou ville" name="q" grow>
              <input id="f-q" name="q" type="search" defaultValue={sp.q} placeholder="ex. Akossiwa, Kara…" className="champ" />
            </FilterField>
            <FilterField label="Édition" name="edition">
              <select id="f-edition" name="edition" defaultValue={editionSlug} className="champ">
                {editions.map((e) => (
                  <option key={e.id} value={e.slug}>{e.title}</option>
                ))}
                <option value="toutes">Toutes</option>
              </select>
            </FilterField>
            <FilterField label="Catégorie" name="categorie">
              <select id="f-categorie" name="categorie" defaultValue={sp.categorie ?? ""} className="champ">
                <option value="">Toutes</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Établissement" name="etablissement">
              <select id="f-etablissement" name="etablissement" defaultValue={sp.etablissement ?? ""} className="champ">
                <option value="">Tous</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Ville" name="ville">
              <select id="f-ville" name="ville" defaultValue={sp.ville ?? ""} className="champ">
                <option value="">Toutes</option>
                {facets.cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FilterField>
          </Filters>

          <p className="mb-6 mt-8 text-sm text-gris" aria-live="polite">
            {list.length} {list.length > 1 ? "profils" : "profil"}
          </p>
          {list.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {list.map((c, i) => (
                <CandidateCard key={c.id} c={c} showEdition={editionSlug === "toutes"} priority={i < 4} />
              ))}
            </div>
          ) : (
            <EmptyState title="Aucun candidat ne correspond" action={{ href: "/candidats", label: "Effacer les filtres" }}>
              Essayez un autre nom, ou élargissez à toutes les éditions.
            </EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
